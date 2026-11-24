-- ==============================================================================
-- Migration: 0010_restore_pending_approval.sql
-- Description: Restore new user registration status to 'pending' for admin approval.
-- ==============================================================================

-- 1. Update the handle_new_user() trigger function to default new users to 'pending'
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

    -- Upsert profile record with status 'pending'
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
        'pending'::public.user_status,
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
