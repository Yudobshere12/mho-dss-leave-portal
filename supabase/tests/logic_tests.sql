-- ==============================================================================
-- Test Suite: supabase/tests/logic_tests.sql
-- Description: Unit and scenario verification for ported PostgreSQL business logic:
--              1. count_weekdays (weekend-only, standard workweek)
--              2. evaluate_leave_credits (insufficient vs sufficient credits)
--              3. evaluate_schedule_conflict (user overlap, staffing below minimum)
--              4. get_dss_recommendation (RECOMMENDED vs NEEDS_REVIEW)
--              5. approve_leave and reject_leave (atomic credit deduction, status transition, audit log trigger)
--              6. double approval prevention (exception assertion)
-- ==============================================================================

DO $$
DECLARE
    -- Test entities
    v_admin_id UUID := 'b0000000-0000-0000-0000-000000000001';
    v_staff_a  UUID := 'b0000000-0000-0000-0000-000000000002';
    v_staff_b  UUID := 'b0000000-0000-0000-0000-000000000003';
    v_staff_c  UUID := 'b0000000-0000-0000-0000-000000000004';

    -- Test application IDs
    v_app_1 BIGINT;
    v_app_2 BIGINT;
    v_app_3 BIGINT;
    v_app_weekend BIGINT;

    -- Inspection variables
    v_days INTEGER;
    v_credit_res RECORD;
    v_sched_res RECORD;
    v_dss_res RECORD;
    v_app_res public.leave_applications;
    v_bal_check NUMERIC(6,2);
    v_audit_count INTEGER;
    v_error_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== STARTING LOGIC TEST SUITE ===';

    -- --------------------------------------------------------------------------
    -- 0. Setup isolated test environment
    -- --------------------------------------------------------------------------
    DELETE FROM public.audit_logs;
    DELETE FROM public.leave_applications;
    DELETE FROM public.leave_balances;
    DELETE FROM public.profiles;

    -- Insert Admin
    INSERT INTO public.profiles (id, full_name, email, role, position, is_active)
    VALUES (v_admin_id, 'Test Admin', 'admin.test@mho.gov.ph', 'MHO_ADMIN', 'Administrator', TRUE);

    -- Insert 3 Staff members (Total active staff = 3)
    INSERT INTO public.profiles (id, full_name, email, role, position, is_active)
    VALUES 
        (v_staff_a, 'Staff Alpha', 'staff.a@mho.gov.ph', 'STAFF', 'Nurse', TRUE),
        (v_staff_b, 'Staff Beta', 'staff.b@mho.gov.ph', 'STAFF', 'Midwife', TRUE),
        (v_staff_c, 'Staff Gamma', 'staff.c@mho.gov.ph', 'STAFF', 'MedTech', TRUE);

    -- Balances: Staff A has low credits (2.0 vacation, 1.0 sick), Staff B & C have 15.0
    INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits)
    VALUES 
        (v_staff_a, 2.00, 1.00, 5.00),
        (v_staff_b, 15.00, 15.00, 5.00),
        (v_staff_c, 15.00, 15.00, 5.00);

    -- Ensure min_duty_staff setting is 2
    INSERT INTO public.system_settings (key, value, description)
    VALUES ('min_duty_staff', '2', 'Minimum required duty staff')
    ON CONFLICT (key) DO UPDATE SET value = '2';

    -- --------------------------------------------------------------------------
    -- Test 1: count_weekdays (Weekend-only range and standard workweek)
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 1: count_weekdays...';
    
    -- Weekend only: Saturday 2026-11-21 to Sunday 2026-11-22 -> 0 days
    v_days := public.count_weekdays('2026-11-21'::DATE, '2026-11-22'::DATE);
    IF v_days != 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected 0 weekdays for weekend range, got %', v_days;
    END IF;

    -- Standard workweek: Monday 2026-11-16 to Friday 2026-11-20 -> 5 days
    v_days := public.count_weekdays('2026-11-16'::DATE, '2026-11-20'::DATE);
    IF v_days != 5 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected 5 weekdays for Mon-Fri, got %', v_days;
    END IF;

    -- Spanning weekend: Thursday 2026-11-19 to Tuesday 2026-11-24 -> 4 weekdays (Thu, Fri, Mon, Tue)
    v_days := public.count_weekdays('2026-11-19'::DATE, '2026-11-24'::DATE);
    IF v_days != 4 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected 4 weekdays, got %', v_days;
    END IF;
    RAISE NOTICE '-> count_weekdays tests PASSED';

    -- --------------------------------------------------------------------------
    -- Test 2: evaluate_leave_credits (Insufficient vs Sufficient Credits)
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 2: evaluate_leave_credits...';

    -- Staff A requests 3 days Vacation (Only 2 available) -> Insufficient
    SELECT * INTO v_credit_res 
    FROM public.evaluate_leave_credits(v_staff_a, 'VL', 3.0);
    IF v_credit_res.passed != FALSE THEN
        RAISE EXCEPTION 'TEST FAILED: Expected insufficient credit evaluation to fail';
    END IF;

    -- Staff A requests 2 days Vacation (2 available) -> Sufficient
    SELECT * INTO v_credit_res 
    FROM public.evaluate_leave_credits(v_staff_a, 'VL', 2.0);
    IF v_credit_res.passed != TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Expected sufficient credit evaluation to pass';
    END IF;
    RAISE NOTICE '-> evaluate_leave_credits tests PASSED';

    -- --------------------------------------------------------------------------
    -- Test 3: Schedule conflict & minimum duty staff threshold
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 3: evaluate_schedule_conflict...';

    -- Approve leave for Staff B from 2026-12-01 to 2026-12-03
    INSERT INTO public.leave_applications (
        user_id, employee_name, leave_type, start_date, end_date, total_days, status
    )
    VALUES (v_staff_b, 'Staff Beta', 'VL', '2026-12-01', '2026-12-03', 3.0, 'APPROVED')
    RETURNING id INTO v_app_1;

    -- Scenario 3A: Direct user overlap
    -- Staff B attempts filing another leave on overlapping dates 2026-12-02 to 2026-12-04
    SELECT * INTO v_sched_res 
    FROM public.evaluate_schedule_conflict(v_staff_b, '2026-12-02'::DATE, '2026-12-04'::DATE);
    IF v_sched_res.passed != FALSE OR v_sched_res.warning != TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Overlapping leave for same user must return passed=false, warning=true';
    END IF;

    -- Scenario 3B: Staffing below minimum
    -- Total staff = 3. Staff B is already approved on 2026-12-01..2026-12-03.
    -- If Staff C applies for the same period:
    -- projected available staff = 3 - 1 (Staff B on leave) - 1 (applicant Staff C) = 1.
    -- Threshold = 2 -> Warning expected!
    SELECT * INTO v_sched_res 
    FROM public.evaluate_schedule_conflict(v_staff_c, '2026-12-01'::DATE, '2026-12-03'::DATE);
    IF v_sched_res.warning != TRUE THEN
        RAISE EXCEPTION 'TEST FAILED: Expected coverage warning when projected staff (1) < min threshold (2)';
    END IF;
    RAISE NOTICE '-> evaluate_schedule_conflict tests PASSED';

    -- --------------------------------------------------------------------------
    -- Test 4: Master DSS recommendation evaluation
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 4: get_dss_recommendation...';

    -- Staff C requesting 2 days Vacation during conflict period -> NEEDS_REVIEW
    SELECT * INTO v_dss_res 
    FROM public.get_dss_recommendation(v_staff_c, 'VL', 2.0, '2026-12-01'::DATE, '2026-12-02'::DATE);
    IF v_dss_res.recommendation != 'NEEDS_REVIEW' THEN
        RAISE EXCEPTION 'TEST FAILED: Expected NEEDS_REVIEW due to staffing threshold warning';
    END IF;

    -- Staff C requesting 2 days Vacation on non-conflicting future period -> RECOMMENDED
    SELECT * INTO v_dss_res 
    FROM public.get_dss_recommendation(v_staff_c, 'VL', 2.0, '2026-12-15'::DATE, '2026-12-16'::DATE);
    IF v_dss_res.recommendation != 'RECOMMENDED' THEN
        RAISE EXCEPTION 'TEST FAILED: Expected RECOMMENDED for non-conflicting schedule with sufficient credits';
    END IF;
    RAISE NOTICE '-> get_dss_recommendation tests PASSED';

    -- --------------------------------------------------------------------------
    -- Test 5: Atomic approve_leave, credit deduction, and audit trigger
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 5: approve_leave and audit trigger...';

    INSERT INTO public.leave_applications (
        user_id, employee_name, leave_type, start_date, end_date, total_days, status
    )
    VALUES (v_staff_a, 'Staff Alpha', 'VL', '2026-11-25', '2026-11-26', 2.0, 'PENDING')
    RETURNING id INTO v_app_2;

    -- Approve Application #v_app_2
    v_app_res := public.approve_leave(v_app_2, v_admin_id, 'Approved for tests');

    IF v_app_res.status != 'APPROVED' OR v_app_res.processed_by_admin_id != v_admin_id THEN
        RAISE EXCEPTION 'TEST FAILED: Leave status or processed_by_admin_id not correctly updated';
    END IF;

    -- Verify credits deducted: Staff A had 2.0 vacation credits, now should have 0.00
    SELECT vacation_credits INTO v_bal_check 
    FROM public.leave_balances 
    WHERE user_id = v_staff_a;
    IF v_bal_check != 0.00 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected vacation balance 0.00 after approval, got %', v_bal_check;
    END IF;

    -- Verify audit_logs trigger recorded the transition
    SELECT COUNT(*) INTO v_audit_count 
    FROM public.audit_logs 
    WHERE user_id = v_staff_a AND action_type = 'LEAVE_APPROVED';
    IF v_audit_count < 1 THEN
        RAISE EXCEPTION 'TEST FAILED: Trigger failed to record LEAVE_APPROVED audit log';
    END IF;
    RAISE NOTICE '-> approve_leave and audit trigger tests PASSED';

    -- --------------------------------------------------------------------------
    -- Test 6: Double approval attempt (Assertion of exception)
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 6: Double approval prevention...';
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.approve_leave(v_app_2, v_admin_id, 'Attempting double approval');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE 'Expected error successfully caught: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Double approval of application #% did not throw exception', v_app_2;
    END IF;
    RAISE NOTICE '-> Double approval prevention test PASSED';

    -- --------------------------------------------------------------------------
    -- Test 7: Atomic reject_leave
    -- --------------------------------------------------------------------------
    RAISE NOTICE 'Running Test 7: reject_leave...';
    INSERT INTO public.leave_applications (
        user_id, employee_name, leave_type, start_date, end_date, total_days, status
    )
    VALUES (v_staff_c, 'Staff Gamma', 'SL', '2026-11-27', '2026-11-27', 1.0, 'PENDING')
    RETURNING id INTO v_app_3;

    v_app_res := public.reject_leave(v_app_3, v_admin_id, 'Medical cert not attached');
    IF v_app_res.status != 'REJECTED' THEN
        RAISE EXCEPTION 'TEST FAILED: Application status expected REJECTED, got %', v_app_res.status;
    END IF;

    -- Ensure sick credits were NOT deducted on rejection (Staff C still has 15.00)
    SELECT sick_credits INTO v_bal_check 
    FROM public.leave_balances 
    WHERE user_id = v_staff_c;
    IF v_bal_check != 15.00 THEN
        RAISE EXCEPTION 'TEST FAILED: Sick credits should not be deducted on rejection, got %', v_bal_check;
    END IF;
    RAISE NOTICE '-> reject_leave tests PASSED';

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ALL LOGIC TESTS COMPLETED SUCCESSFULLY WITH 0 FAILURES';
    RAISE NOTICE '============================================================';
END;
$$;
