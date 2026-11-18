-- ==============================================================================
-- Migration: 0005_remove_lgu_hr.sql
-- Description: Completely remove LGU_HR role from database.
--              1. Reassign any existing LGU_HR profile to STAFF and log them.
--              2. Recreate user_role enum without 'LGU_HR' ('STAFF', 'MHO_ADMIN', 'MHO_HEAD').
--              3. Update policies and RPCs:
--                 - profiles: MHO_ADMIN, MHO_HEAD (management select)
--                 - leave_applications & leave_balances: MHO_ADMIN, MHO_HEAD (plus STAFF own)
--                 - audit_logs: readable by MHO_HEAD only (no read-only auditor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Review and Reassign Profiles with LGU_HR role to STAFF
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Checking profiles currently assigned to LGU_HR ===';
    FOR r IN (
        SELECT id, full_name, email, role, position, status, created_at 
        FROM public.profiles 
        WHERE role::text = 'LGU_HR'
    ) LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'Reassigning profile: ID=%, Name="%", Email="%", CurrentRole="%", Position="%", Status="%"',
            r.id, r.full_name, r.email, r.role, r.position, r.status;
    END LOOP;

    IF v_count = 0 THEN
        RAISE NOTICE 'No profiles found with role LGU_HR.';
    ELSE
        RAISE NOTICE 'Total profiles reassigned from LGU_HR to STAFF: %', v_count;
    END IF;
END $$;

-- Perform the update (disable trigger interference during migration if needed, though trigger allows if auth.uid() is null)
UPDATE public.profiles
SET role = 'STAFF'
WHERE role::text = 'LGU_HR';

-- ------------------------------------------------------------------------------
-- 2. Drop dependent objects before enum recreation
-- ------------------------------------------------------------------------------

-- Drop policies referencing user_role or public.current_role() where needed
DROP POLICY IF EXISTS "profiles_select_management" ON public.profiles;
DROP POLICY IF EXISTS "leave_applications_select_management" ON public.leave_applications;
DROP POLICY IF EXISTS "leave_balances_select_management" ON public.leave_balances;
DROP POLICY IF EXISTS "audit_logs_select_head_and_hr" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_mho_head" ON public.audit_logs;

-- Drop functions/triggers with parameter/return types depending on user_role
DROP TRIGGER IF EXISTS trg_protect_profiles ON public.profiles;
DROP FUNCTION IF EXISTS public.trg_func_protect_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.review_user(UUID, public.user_status, public.user_role) CASCADE;
DROP FUNCTION IF EXISTS public.current_role() CASCADE;

-- Remove default on profiles.role before type change
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- ------------------------------------------------------------------------------
-- 3. Recreate user_role enum
-- ------------------------------------------------------------------------------
CREATE TYPE public.user_role_new AS ENUM ('STAFF', 'MHO_ADMIN', 'MHO_HEAD');

-- Alter public.profiles.role to user_role_new
ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE public.user_role_new 
    USING (
        CASE role::text
            WHEN 'MHO_ADMIN' THEN 'MHO_ADMIN'::public.user_role_new
            WHEN 'MHO_HEAD'  THEN 'MHO_HEAD'::public.user_role_new
            ELSE 'STAFF'::public.user_role_new
        END
    );

-- Set default back to STAFF
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'STAFF'::public.user_role_new;

-- Drop old enum and rename new enum
DROP TYPE public.user_role CASCADE;
ALTER TYPE public.user_role_new RENAME TO user_role;

-- ------------------------------------------------------------------------------
-- 4. Recreate helper functions with updated user_role
-- ------------------------------------------------------------------------------

-- 4.1 public.current_role()
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN v_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

-- 4.2 public.trg_func_protect_profiles()
CREATE OR REPLACE FUNCTION public.trg_func_protect_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_approved_admin_count INTEGER;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();

    -- Service role or migrations running outside web requests (auth.uid() IS NULL) can bypass
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Block users from modifying their own role or status
    IF OLD.id = v_caller_id THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Self-edit violation: You cannot modify your own role.';
        END IF;
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
            RAISE EXCEPTION 'Self-edit violation: You cannot modify your own approval status.';
        END IF;
    END IF;

    -- Prevent demoting, deactivating, or rejecting the last approved MHO_ADMIN
    IF OLD.role = 'MHO_ADMIN' AND OLD.status = 'approved' THEN
        IF (NEW.role != 'MHO_ADMIN' OR NEW.status != 'approved' OR NEW.is_active = FALSE) THEN
            SELECT COUNT(*)::INTEGER INTO v_approved_admin_count
            FROM public.profiles
            WHERE role = 'MHO_ADMIN'
              AND status = 'approved'
              AND is_active = TRUE
              AND id != OLD.id;

            IF v_approved_admin_count < 1 THEN
                RAISE EXCEPTION 'Safety violation: Cannot demote, deactivate, or unapprove the last active MHO_ADMIN.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_func_protect_profiles();

-- 4.3 public.review_user() RPC
CREATE OR REPLACE FUNCTION public.review_user(
    p_user_id UUID,
    p_status public.user_status,
    p_role public.user_role DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_updated_profile public.profiles%ROWTYPE;
    v_target_old public.profiles%ROWTYPE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: Caller account is not approved.';
    END IF;

    IF public.current_role() != 'MHO_ADMIN' THEN
        RAISE EXCEPTION 'Least privilege violation: Only MHO_ADMIN can review user registrations.';
    END IF;

    IF p_user_id = v_caller_id THEN
        RAISE EXCEPTION 'Self-review violation: You cannot review or change your own account.';
    END IF;

    SELECT * INTO v_target_old
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile with ID % not found.', p_user_id;
    END IF;

    UPDATE public.profiles
    SET status = p_status,
        role = COALESCE(p_role, role),
        reviewed_by = v_caller_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated_profile;

    -- Audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'USER_REVIEW',
        format('Admin %s reviewed user %s (%s): status set to %s, role set to %s.',
            v_caller_id, p_user_id, v_target_old.email, p_status, v_updated_profile.role),
        NULL,
        NOW()
    );

    RETURN v_updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.review_user(UUID, public.user_status, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_user(UUID, public.user_status, public.user_role) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Recreate RLS Policies (without LGU_HR)
-- ------------------------------------------------------------------------------

-- 5.1 profiles management select (MHO_ADMIN and MHO_HEAD)
CREATE POLICY "profiles_select_management"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

-- 5.2 leave_applications management select (MHO_ADMIN and MHO_HEAD)
CREATE POLICY "leave_applications_select_management"
ON public.leave_applications
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

-- 5.3 leave_balances management select (MHO_ADMIN and MHO_HEAD)
CREATE POLICY "leave_balances_select_management"
ON public.leave_balances
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

-- 5.4 audit_logs select (MHO_HEAD only)
CREATE POLICY "audit_logs_select_mho_head"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_HEAD'
);
