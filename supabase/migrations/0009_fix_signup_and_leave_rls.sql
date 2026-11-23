-- ==============================================================================
-- Migration: 0009_fix_signup_and_leave_rls.sql
-- Description: Fix intermittent account creation and leave application RLS policies.
-- ==============================================================================

-- 1. Resilient trigger function for auth.users auto-provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_full_name TEXT;
    v_email TEXT;
BEGIN
    -- Determine email safely
    v_email := COALESCE(NEW.email, NEW.id::text || '@placeholder.local');

    -- Determine full name safely with robust fallbacks
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NULLIF(split_part(v_email, '@', 1), ''),
        'Employee'
    );

    -- Upsert profile record
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
        v_email,
        v_full_name,
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        ),
        'STAFF'::public.user_role,
        'approved'::public.user_status,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = timezone('utc'::text, now());

    -- Ensure default leave credits are initialized
    INSERT INTO public.leave_balances (
        user_id,
        vacation_credits,
        sick_credits,
        emergency_credits,
        updated_at
    )
    VALUES (
        NEW.id,
        15.00,
        15.00,
        5.00,
        timezone('utc'::text, now())
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed for auth.users id %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Ensure trigger is cleanly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill any existing auth users missing profiles or leave balances
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
    u.id, 
    COALESCE(u.email, u.id::text || '@placeholder.local'), 
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Employee'),
    'STAFF'::public.user_role,
    'approved'::public.user_status
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Also update any pending status to approved if auto-approval is desired
UPDATE public.profiles
SET status = 'approved'
WHERE status IS NULL OR status = 'pending';

INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits)
SELECT p.id, 15.00, 15.00, 5.00
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.leave_balances b WHERE b.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Fix leave_applications INSERT RLS policies
DROP POLICY IF EXISTS "leave_applications_insert_staff" ON public.leave_applications;
DROP POLICY IF EXISTS "leave_applications_insert_mho_head" ON public.leave_applications;
DROP POLICY IF EXISTS "leave_applications_insert_mho_admin" ON public.leave_applications;

-- STAFF self-filing policy
CREATE POLICY "leave_applications_insert_staff"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    created_by_admin_id IS NULL AND
    COALESCE(public.is_approved(), true) AND
    COALESCE(public.current_role(), 'STAFF'::public.user_role) = 'STAFF'
);

-- MHO_HEAD self-filing policy
CREATE POLICY "leave_applications_insert_mho_head"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    created_by_admin_id IS NULL AND
    COALESCE(public.is_approved(), true) AND
    public.current_role() = 'MHO_HEAD'
);

-- MHO_ADMIN filing policy (self or on behalf of staff / walk-in)
CREATE POLICY "leave_applications_insert_mho_admin"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
    COALESCE(public.is_approved(), true) AND
    public.current_role() = 'MHO_ADMIN' AND
    (
        (user_id = auth.uid() AND created_by_admin_id IS NULL)
        OR
        (created_by_admin_id = auth.uid())
    )
);
