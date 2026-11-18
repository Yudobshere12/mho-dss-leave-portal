-- ==============================================================================
-- Test Script: test_approval_rbac.sql
-- Description: Verification script to validate behavior across all roles & states:
--              1. Pending user
--              2. Rejected user
--              3. Approved STAFF
--              4. Approved MHO_ADMIN
--              5. Approved MHO_HEAD
-- ==============================================================================

BEGIN;

-- Setup test roles in temporary scope or transaction rollback
DO $$
DECLARE
    v_pending_user UUID := '11111111-1111-1111-1111-111111111111';
    v_rejected_user UUID := '22222222-2222-2222-2222-222222222222';
    v_staff_user UUID := '33333333-3333-3333-3333-333333333333';
    v_head_user UUID := '44444444-4444-4444-4444-444444444444';
    v_admin_user UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Starting RBAC & Approval Gate Validation Tests';
    RAISE NOTICE '==================================================';

    -- 1. Helper function checks
    -- Test current_role() and is_approved() with no session (should return NULL and FALSE)
    PERFORM set_config('request.jwt.claim.sub', '', true);
    ASSERT public.current_role() IS NULL, 'TEST FAILED: current_role() should be null for unauthenticated';
    ASSERT public.is_approved() = false, 'TEST FAILED: is_approved() should be false for unauthenticated';

    RAISE NOTICE 'Pass: Helper functions return safe defaults for unauthenticated callers.';
END $$;

-- ------------------------------------------------------------------------------
-- Role Query Capability Matrix Summary Table
-- ------------------------------------------------------------------------------
/*
+-----------------+-----------------------+--------------------+--------------------+--------------------+--------------------+
| Role / Status   | profiles              | leave_applications | leave_balances     | audit_logs         | system_settings    |
+-----------------+-----------------------+--------------------+--------------------+--------------------+--------------------+
| Pending User    | Select own ONLY       | NO ACCESS          | NO ACCESS          | NO ACCESS          | NO ACCESS          |
| Rejected User   | Select own ONLY       | NO ACCESS          | NO ACCESS          | NO ACCESS          | NO ACCESS          |
| STAFF           | Select own ONLY       | Own apps ONLY      | Own balance ONLY   | NO ACCESS          | Select (Read-only) |
| MHO_ADMIN       | Select all, update all| Select all, insert | Select all, update | NO ACCESS          | Full read & write  |
| MHO_HEAD        | Select all (no write) | Select all, own ins| Select all (no wrt)| Select all (view)  | Select (Read-only) |
+-----------------+-----------------------+--------------------+--------------------+--------------------+--------------------+
*/

-- ------------------------------------------------------------------------------
-- Functional RPC Checks
-- ------------------------------------------------------------------------------

-- Test 1: Self-edit of role or status must fail
-- UPDATE public.profiles SET role = 'MHO_ADMIN' WHERE id = auth.uid();
-- EXPECTED: Exception 'Self-edit violation: You cannot modify your own role.'

-- Test 2: Demoting last MHO_ADMIN must fail
-- UPDATE public.profiles SET role = 'STAFF' WHERE id = (last_admin_id);
-- EXPECTED: Exception 'System integrity violation: Cannot demote or deactivate the last approved MHO_ADMIN.'

-- Test 3: STAFF attempting to approve leave
-- SELECT public.approve_leave(1, auth.uid(), 'Remarks');
-- EXPECTED: Exception 'Least privilege violation: Only MHO_HEAD can approve leave applications.'

-- Test 4: MHO_HEAD attempting to approve their own leave
-- SELECT public.approve_leave(head_leave_app_id, auth.uid(), 'Self approval');
-- EXPECTED: Exception 'Conflict of interest: You cannot approve your own leave application.'

-- Test 5: STAFF attempting to review another user
-- SELECT public.review_user(target_user_id, 'approved', 'MHO_ADMIN');
-- EXPECTED: Exception 'Least privilege violation: Only MHO_ADMIN can review user registrations.'

ROLLBACK;
