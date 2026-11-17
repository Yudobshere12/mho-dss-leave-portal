-- ==============================================================================
-- Migration: 0004_approval_rbac.sql
-- Description: Implement database-level admin-approval gate, comprehensive RBAC,
--              hardened helper functions, strict RLS, trigger-enforced safeguards,
--              and secure RPC functions for MHO DSS Leave Portal.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema & Status Enum Alignment
-- ------------------------------------------------------------------------------

-- Create user_status enum if not existing outside of transaction block restrictions
DO $$
BEGIN
    CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Align public.profiles columns and constraints
DO $$
BEGIN
    -- Ensure status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN status public.user_status NOT NULL DEFAULT 'pending';
    END IF;

    -- Ensure reviewed_by column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN reviewed_by UUID;
    END IF;

    -- Ensure reviewed_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;

    -- Ensure avatar_url column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- Ensure role column exists and defaults to 'STAFF'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'STAFF';
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'STAFF';
    END IF;

    -- Ensure foreign key constraint from public.profiles(id) to auth.users(id) ON DELETE CASCADE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'profiles'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    ) THEN
        BEGIN
            ALTER TABLE public.profiles
                ADD CONSTRAINT profiles_id_fkey
                FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Constraint profiles_id_fkey could not be added immediately (e.g. standalone dummy records).';
        END;
    END IF;
END $$;

-- Existing profiles: mark as 'approved' so current data continues working without lockout
UPDATE public.profiles
SET status = 'approved'
WHERE status IS NULL OR status = 'pending';

-- Add index on profiles status and reviewed_by
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_reviewed_by ON public.profiles(reviewed_by);


-- ------------------------------------------------------------------------------
-- 2. Trigger on auth.users for Auto-provisioning
-- ------------------------------------------------------------------------------
-- SECURITY DEFINER, SET search_path = '', creates profile with role 'STAFF', status 'pending'.
-- Never reads role or status from user metadata. Uses ON CONFLICT (id) DO NOTHING.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        ),
        'STAFF'::public.user_role,
        'pending'::public.user_status,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO NOTHING;

    -- Also provision leave_balances default entry for new user
    INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits, updated_at)
    VALUES (NEW.id, 15.00, 15.00, 5.00, timezone('utc'::text, now()))
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 3. Helpers (SECURITY DEFINER, SET search_path = '', STABLE)
-- ------------------------------------------------------------------------------

-- Current caller's role from profiles via auth.uid()
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

-- True only if caller's status is 'approved'
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status public.user_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT status INTO v_status
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN (v_status = 'approved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_approved() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated;


-- ------------------------------------------------------------------------------
-- 4. Safeguard Trigger: Prevent Self-Role/Status Edit & Last Admin Demotion
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_func_protect_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_approved_admin_count INTEGER;
    v_caller_id UUID;
    v_caller_role public.user_role;
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

            IF v_approved_admin_count = 0 THEN
                RAISE EXCEPTION 'System integrity violation: Cannot demote or deactivate the last approved MHO_ADMIN.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles ON public.profiles;
CREATE TRIGGER trg_protect_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_func_protect_profiles();


-- ------------------------------------------------------------------------------
-- 5. Drop ALL DEV_TEMP Policies and Anon Access, Enable and Force RLS
-- ------------------------------------------------------------------------------

-- Drop all DEV_TEMP policies from all tables
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_select" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_insert" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_update" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_delete" ON public.leave_applications;

DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_insert" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_update" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_delete" ON public.leave_balances;

DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_delete" ON public.audit_logs;

DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_insert" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_update" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_delete" ON public.system_settings;

-- Revoke all table permissions from anon/public
REVOKE ALL ON public.profiles FROM anon, public;
REVOKE ALL ON public.leave_applications FROM anon, public;
REVOKE ALL ON public.leave_balances FROM anon, public;
REVOKE ALL ON public.audit_logs FROM anon, public;
REVOKE ALL ON public.system_settings FROM anon, public;

-- Grant standard table access to authenticated role (subject strictly to RLS policies)
GRANT SELECT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.leave_applications TO authenticated;
GRANT SELECT, UPDATE ON public.leave_balances TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

-- Enable and FORCE Row-Level Security on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 6. Row-Level Security Policies
-- ------------------------------------------------------------------------------

-- ----------------------------------
-- 6.1 PROFILES POLICIES
-- ----------------------------------
-- Every authenticated user can select their own profile row (regardless of approval status, so app can read pending/rejected state)
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Management roles (MHO_ADMIN, MHO_HEAD, LGU_HR) who are approved can select all profile rows
CREATE POLICY "profiles_select_management"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD', 'LGU_HR')
);

-- Only approved MHO_ADMIN can update profiles
CREATE POLICY "profiles_update_mho_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
)
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

-- Only approved MHO_ADMIN can delete profiles
CREATE POLICY "profiles_delete_mho_admin"
ON public.profiles
FOR DELETE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

-- No client INSERT policy on profiles (strictly handled via SECURITY DEFINER trigger on auth.users)


-- ----------------------------------
-- 6.2 LEAVE APPLICATIONS POLICIES
-- ----------------------------------
-- SELECT:
-- STAFF can select own only (requires is_approved())
CREATE POLICY "leave_applications_select_staff"
ON public.leave_applications
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'STAFF' AND
    user_id = auth.uid()
);

-- Management roles (MHO_ADMIN, MHO_HEAD, LGU_HR) who are approved can select all leave applications
CREATE POLICY "leave_applications_select_management"
ON public.leave_applications
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD', 'LGU_HR')
);

-- INSERT:
-- STAFF: insert own only (user_id = auth.uid(), created_by_admin_id IS NULL)
CREATE POLICY "leave_applications_insert_staff"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'STAFF' AND
    user_id = auth.uid() AND
    created_by_admin_id IS NULL
);

-- MHO_HEAD: insert own only (user_id = auth.uid(), created_by_admin_id IS NULL)
CREATE POLICY "leave_applications_insert_mho_head"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_HEAD' AND
    user_id = auth.uid() AND
    created_by_admin_id IS NULL
);

-- MHO_ADMIN: insert for self OR on behalf of any employee
CREATE POLICY "leave_applications_insert_mho_admin"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN' AND
    (
        -- Self filing
        (user_id = auth.uid() AND created_by_admin_id IS NULL)
        OR
        -- On behalf filing (registered employee or walk-in)
        (created_by_admin_id = auth.uid())
    )
);

-- LGU_HR has NO insert policy.
-- NO client UPDATE or DELETE policies on leave_applications (all status decisions occur strictly via RPC).


-- ----------------------------------
-- 6.3 LEAVE BALANCES POLICIES
-- ----------------------------------
-- SELECT:
-- STAFF: select own balance row only
CREATE POLICY "leave_balances_select_staff"
ON public.leave_balances
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'STAFF' AND
    user_id = auth.uid()
);

-- Management roles (MHO_ADMIN, MHO_HEAD, LGU_HR) who are approved can view all balances
CREATE POLICY "leave_balances_select_management"
ON public.leave_balances
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD', 'LGU_HR')
);

-- UPDATE:
-- MHO_ADMIN can update leave balances
CREATE POLICY "leave_balances_update_mho_admin"
ON public.leave_balances
FOR UPDATE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
)
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

-- No client INSERT or DELETE policies on leave_balances.


-- ----------------------------------
-- 6.4 AUDIT LOGS POLICIES
-- ----------------------------------
-- SELECT:
-- MHO_HEAD and LGU_HR only (must be approved)
CREATE POLICY "audit_logs_select_head_and_hr"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() IN ('MHO_HEAD', 'LGU_HR')
);

-- No client INSERT, UPDATE, or DELETE on audit_logs. Writes occur strictly through SECURITY DEFINER triggers and RPCs.


-- ----------------------------------
-- 6.5 SYSTEM SETTINGS POLICIES
-- ----------------------------------
-- SELECT:
-- Any approved user can read system settings (e.g. min_duty_staff)
CREATE POLICY "system_settings_select_approved"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
    public.is_approved()
);

-- INSERT / UPDATE / DELETE:
-- Only approved MHO_ADMIN can write system settings
CREATE POLICY "system_settings_insert_mho_admin"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

CREATE POLICY "system_settings_update_mho_admin"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
)
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

CREATE POLICY "system_settings_delete_mho_admin"
ON public.system_settings
FOR DELETE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);


-- ------------------------------------------------------------------------------
-- 7. Hardened Business RPC Functions
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 7.1 approve_leave(p_leave_id, p_admin_id, p_remarks)
-- Enforces:
--   - Caller must be authenticated, is_approved(), and current_role() = 'MHO_HEAD'
--   - Ignores client-supplied p_admin_id and uses auth.uid()
--   - Blocks deciding your own application
--   - Only acts on 'PENDING' applications
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_leave(
    p_leave_id BIGINT,
    p_admin_id UUID DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS public.leave_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_app public.leave_applications%ROWTYPE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    IF public.current_role() != 'MHO_HEAD' THEN
        RAISE EXCEPTION 'Least privilege violation: Only MHO_HEAD can approve leave applications.';
    END IF;

    -- Lock row for atomic processing
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    -- Block deciding own leave application
    IF v_app.user_id IS NOT NULL AND v_app.user_id = v_caller_id THEN
        RAISE EXCEPTION 'Conflict of interest: You cannot approve your own leave application.';
    END IF;

    -- Ensure application is in PENDING status
    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Deduct credits if applicant is registered
    IF v_app.user_id IS NOT NULL THEN
        IF v_app.leave_type = 'Vacation Leave' THEN
            UPDATE public.leave_balances
            SET vacation_credits = vacation_credits - v_app.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_app.leave_type = 'Sick Leave' THEN
            UPDATE public.leave_balances
            SET sick_credits = sick_credits - v_app.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_app.leave_type = 'Emergency Leave' THEN
            UPDATE public.leave_balances
            SET emergency_credits = emergency_credits - v_app.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        END IF;
    END IF;

    -- Update leave application record (processed_by_admin_id set to verified auth.uid())
    UPDATE public.leave_applications
    SET status = 'APPROVED',
        processed_by_admin_id = v_caller_id,
        admin_remarks = p_remarks,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    -- Insert audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'LEAVE_APPROVED',
        FORMAT('Leave Application #%s approved by MHO_HEAD (%s). Remarks: %s', p_leave_id, v_caller_id, COALESCE(p_remarks, 'None')),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7.2 reject_leave(p_leave_id, p_admin_id, p_remarks)
-- Enforces:
--   - Caller must be authenticated, is_approved(), and current_role() = 'MHO_HEAD'
--   - Ignores client-supplied p_admin_id and uses auth.uid()
--   - Blocks deciding your own application
--   - Only acts on 'PENDING' applications
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_leave(
    p_leave_id BIGINT,
    p_admin_id UUID DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS public.leave_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_app public.leave_applications%ROWTYPE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    IF public.current_role() != 'MHO_HEAD' THEN
        RAISE EXCEPTION 'Least privilege violation: Only MHO_HEAD can reject leave applications.';
    END IF;

    -- Lock row for atomic processing
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    -- Block deciding own leave application
    IF v_app.user_id IS NOT NULL AND v_app.user_id = v_caller_id THEN
        RAISE EXCEPTION 'Conflict of interest: You cannot reject your own leave application.';
    END IF;

    -- Ensure application is in PENDING status
    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Update leave application record (processed_by_admin_id set to verified auth.uid())
    UPDATE public.leave_applications
    SET status = 'REJECTED',
        processed_by_admin_id = v_caller_id,
        admin_remarks = p_remarks,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    -- Insert audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'LEAVE_REJECTED',
        FORMAT('Leave Application #%s rejected by MHO_HEAD (%s). Remarks: %s', p_leave_id, v_caller_id, COALESCE(p_remarks, 'None')),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7.3 review_user(p_user_id, p_status, p_role)
-- Allows MHO_ADMIN to review, assign role, approve/reject user accounts.
-- Writes audit log. Cannot target self.
-- ------------------------------------------------------------------------------
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
        reviewed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING * INTO v_updated_profile;

    -- Record audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'USER_REVIEW',
        FORMAT('User %s (%s) reviewed by MHO_ADMIN (%s). Status changed from %s to %s, Role: %s.',
               v_updated_profile.email, p_user_id, v_caller_id, v_target_old.status, p_status, v_updated_profile.role),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_updated_profile;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7.4 Identity and Role Checks for DSS Functions
-- ------------------------------------------------------------------------------

-- evaluate_leave_credits
CREATE OR REPLACE FUNCTION public.evaluate_leave_credits(
    p_user_id UUID,
    p_leave_type public.leave_type,
    p_days NUMERIC
)
RETURNS TABLE (
    passed BOOLEAN,
    message TEXT,
    available NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role public.user_role;
    v_vacation NUMERIC(6,2);
    v_sick NUMERIC(6,2);
    v_emergency NUMERIC(6,2);
    v_avail NUMERIC(6,2) := 0;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();

    -- Role check: STAFF can only evaluate their own credits
    IF v_caller_role = 'STAFF' AND p_user_id IS NOT NULL AND p_user_id != v_caller_id THEN
        RAISE EXCEPTION 'Least privilege violation: STAFF cannot query credits for other employees.';
    END IF;

    -- Walk-in filings (user_id is NULL) allowed for MHO_ADMIN only
    IF p_user_id IS NULL THEN
        IF v_caller_role != 'MHO_ADMIN' THEN
            RAISE EXCEPTION 'Least privilege violation: Only MHO_ADMIN can file walk-in applications without user_id.';
        END IF;
        RETURN QUERY SELECT TRUE, 'Walk-in application (no balance record required).'::TEXT, 0::NUMERIC;
        RETURN;
    END IF;

    SELECT vacation_credits, sick_credits, emergency_credits
    INTO v_vacation, v_sick, v_emergency
    FROM public.leave_balances
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'No leave balance record found for this employee.'::TEXT, 0::NUMERIC;
        RETURN;
    END IF;

    IF p_leave_type = 'Vacation Leave' THEN
        v_avail := COALESCE(v_vacation, 0);
    ELSIF p_leave_type = 'Sick Leave' THEN
        v_avail := COALESCE(v_sick, 0);
    ELSIF p_leave_type = 'Emergency Leave' THEN
        v_avail := COALESCE(v_emergency, 0);
    ELSE
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (Statutory / Exempt).', p_leave_type::TEXT), 999::NUMERIC;
        RETURN;
    END IF;

    IF v_avail >= p_days THEN
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (%s days remaining).', p_leave_type::TEXT, v_avail), v_avail;
    ELSE
        RETURN QUERY SELECT FALSE, FORMAT('Insufficient %s balance. Requested: %s days, Available: %s days.', p_leave_type::TEXT, p_days, v_avail), v_avail;
    END IF;
END;
$$;

-- evaluate_schedule_conflict
CREATE OR REPLACE FUNCTION public.evaluate_schedule_conflict(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    passed BOOLEAN,
    warning BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role public.user_role;
    v_user_conflict_count INTEGER := 0;
    v_overlapping_leaves INTEGER := 0;
    v_total_staff INTEGER := 0;
    v_min_required_staff INTEGER := 2;
    v_projected_available INTEGER := 0;
    v_setting_val TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();

    -- Role check: STAFF can only check conflict for themselves
    IF v_caller_role = 'STAFF' AND p_user_id IS NOT NULL AND p_user_id != v_caller_id THEN
        RAISE EXCEPTION 'Least privilege violation: STAFF cannot evaluate schedule conflict for other employees.';
    END IF;

    -- Walk-in checks (p_user_id IS NULL) allowed only for MHO_ADMIN
    IF p_user_id IS NULL AND v_caller_role != 'MHO_ADMIN' THEN
        RAISE EXCEPTION 'Least privilege violation: Only MHO_ADMIN can evaluate schedule for walk-in applicants.';
    END IF;

    -- Retrieve minimum duty staff threshold
    SELECT value INTO v_setting_val FROM public.system_settings WHERE key = 'min_duty_staff';
    IF v_setting_val IS NOT NULL THEN
        v_min_required_staff := v_setting_val::INTEGER;
    END IF;

    -- 1. Check if applicant has an approved leave overlapping this period
    IF p_user_id IS NOT NULL THEN
        SELECT COUNT(*)::INTEGER INTO v_user_conflict_count
        FROM public.leave_applications
        WHERE user_id = p_user_id
          AND status = 'APPROVED'
          AND (start_date <= p_end_date AND end_date >= p_start_date);

        IF v_user_conflict_count > 0 THEN
            RETURN QUERY SELECT FALSE, TRUE, 'User already has an approved leave application during this period.'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- 2. Count distinct active staff with approved overlapping leaves
    SELECT COUNT(DISTINCT user_id)::INTEGER INTO v_overlapping_leaves
    FROM public.leave_applications
    WHERE (p_user_id IS NULL OR user_id != p_user_id)
      AND user_id IS NOT NULL
      AND status = 'APPROVED'
      AND (start_date <= p_end_date AND end_date >= p_start_date);

    -- 3. Count total active staff
    SELECT COUNT(*)::INTEGER INTO v_total_staff
    FROM public.profiles
    WHERE role = 'STAFF' AND is_active = TRUE AND status = 'approved';

    -- Projected staff: total active staff minus concurrent leaves minus applicant
    v_projected_available := v_total_staff - v_overlapping_leaves - 1;

    IF v_projected_available < v_min_required_staff THEN
        RETURN QUERY SELECT TRUE, TRUE, FORMAT('Coverage Warning: Approving this leave reduces duty staff to %s (Minimum threshold: %s).', v_projected_available, v_min_required_staff);
    ELSE
        RETURN QUERY SELECT TRUE, FALSE, FORMAT('Schedule check passed. Projected available duty staff: %s.', v_projected_available);
    END IF;
END;
$$;

-- get_dss_recommendation
CREATE OR REPLACE FUNCTION public.get_dss_recommendation(
    p_user_id UUID,
    p_leave_type public.leave_type,
    p_days NUMERIC,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    recommendation TEXT,
    reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role public.user_role;
    v_credit_passed BOOLEAN;
    v_credit_msg TEXT;
    v_credit_avail NUMERIC;
    v_sched_passed BOOLEAN;
    v_sched_warning BOOLEAN;
    v_sched_msg TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();

    -- Role check: STAFF can only evaluate their own recommendation
    IF v_caller_role = 'STAFF' AND p_user_id IS NOT NULL AND p_user_id != v_caller_id THEN
        RAISE EXCEPTION 'Least privilege violation: STAFF cannot query DSS recommendation for other employees.';
    END IF;

    -- Evaluate credits
    SELECT passed, message, available
    INTO v_credit_passed, v_credit_msg, v_credit_avail
    FROM public.evaluate_leave_credits(p_user_id, p_leave_type, p_days);

    -- Evaluate schedule and coverage
    SELECT passed, warning, message
    INTO v_sched_passed, v_sched_warning, v_sched_msg
    FROM public.evaluate_schedule_conflict(p_user_id, p_start_date, p_end_date);

    IF NOT v_credit_passed THEN
        RETURN QUERY SELECT 'NEEDS_REVIEW'::TEXT, v_credit_msg;
    ELSIF NOT v_sched_passed THEN
        RETURN QUERY SELECT 'NEEDS_REVIEW'::TEXT, v_sched_msg;
    ELSIF v_sched_warning THEN
        RETURN QUERY SELECT 'NEEDS_REVIEW'::TEXT, v_sched_msg;
    ELSE
        RETURN QUERY SELECT 'RECOMMENDED'::TEXT, FORMAT('Application meets all DSS criteria. %s %s', v_credit_msg, v_sched_msg);
    END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 8. RPC Grants & Execution Privileges
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.approve_leave(BIGINT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_leave(BIGINT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_leave(BIGINT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_leave(BIGINT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.review_user(UUID, public.user_status, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_user(UUID, public.user_status, public.user_role) TO authenticated;

REVOKE ALL ON FUNCTION public.evaluate_leave_credits(UUID, public.leave_type, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_leave_credits(UUID, public.leave_type, NUMERIC) TO authenticated;

REVOKE ALL ON FUNCTION public.evaluate_schedule_conflict(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_schedule_conflict(UUID, DATE, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dss_recommendation(UUID, public.leave_type, NUMERIC, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dss_recommendation(UUID, public.leave_type, NUMERIC, DATE, DATE) TO authenticated;
