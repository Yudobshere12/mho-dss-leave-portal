-- ==============================================================================
-- Migration: 0011_sync_leave_balances_and_support_emergency.sql
-- Description: 
--   1. Enhance approve_leave to support deducting emergency_credits (charged_to = 'EL' or CALAMITY).
--   2. Keep public.profiles (vacation_credits, sick_credits, emergency_credits) automatically
--      synchronized with public.leave_balances whenever balances are updated.
-- ==============================================================================

-- 1. Sync Trigger: whenever public.leave_balances updates, update public.profiles
CREATE OR REPLACE FUNCTION public.sync_leave_balances_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET vacation_credits = NEW.vacation_credits,
        sick_credits = NEW.sick_credits,
        emergency_credits = NEW.emergency_credits,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leave_balances_to_profiles ON public.leave_balances;
CREATE TRIGGER trg_sync_leave_balances_to_profiles
    AFTER INSERT OR UPDATE ON public.leave_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_leave_balances_to_profiles();

-- 2. Enhanced approve_leave RPC with proper credit deductions including Emergency / Calamity
DROP FUNCTION IF EXISTS public.approve_leave(BIGINT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.approve_leave(BIGINT, NUMERIC(6,2), NUMERIC(6,2), TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_leave(
    p_leave_id BIGINT,
    p_approved_days_with_pay NUMERIC(6,2) DEFAULT NULL,
    p_approved_days_without_pay NUMERIC(6,2) DEFAULT 0,
    p_approved_others TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS public.leave_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role public.user_role;
    v_caller_status public.user_status;
    v_app public.leave_applications%ROWTYPE;
    v_total_app NUMERIC(6,2);
    v_days_with_pay NUMERIC(6,2);
    v_days_without_pay NUMERIC(6,2);
    v_charged_to TEXT := 'NONE';
BEGIN
    -- Auth check
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role != 'MHO_HEAD' OR v_caller_status != 'approved' THEN
        RAISE EXCEPTION 'Least privilege violation: Only approved MHO_HEAD can approve leave applications.';
    END IF;

    -- Fetch leave application
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application % not found.', p_leave_id;
    END IF;

    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application % has already been decided (current status: %).', p_leave_id, v_app.status;
    END IF;

    v_total_app := COALESCE(v_app.working_days, v_app.total_days, 1);
    v_days_with_pay := COALESCE(p_approved_days_with_pay, v_total_app);
    v_days_without_pay := COALESCE(p_approved_days_without_pay, 0);

    IF (v_days_with_pay + v_days_without_pay) > v_total_app THEN
        RAISE EXCEPTION 'Sum of approved days with pay (%) and without pay (%) exceeds working days (%).',
            v_days_with_pay, v_days_without_pay, v_total_app;
    END IF;

    -- Lookup charged_to bucket
    SELECT charged_to INTO v_charged_to
    FROM public.leave_types
    WHERE code = v_app.leave_type OR name = v_app.leave_type
    LIMIT 1;

    IF v_charged_to IS NULL THEN
        IF v_app.leave_type IN ('VL', 'FL', 'Vacation Leave', 'Mandatory/Forced Leave') THEN
            v_charged_to := 'VL';
        ELSIF v_app.leave_type IN ('SL', 'Sick Leave') THEN
            v_charged_to := 'SL';
        ELSIF v_app.leave_type IN ('CALAMITY', 'Emergency Leave', 'Special Emergency Leave') THEN
            v_charged_to := 'EL';
        ELSE
            v_charged_to := 'NONE';
        END IF;
    END IF;

    -- Deduct approved days with pay from credits in leave_balances
    IF v_app.user_id IS NOT NULL AND v_days_with_pay > 0 THEN
        IF v_charged_to = 'VL' THEN
            UPDATE public.leave_balances
            SET vacation_credits = GREATEST(0, vacation_credits - v_days_with_pay),
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_charged_to = 'SL' THEN
            UPDATE public.leave_balances
            SET sick_credits = GREATEST(0, sick_credits - v_days_with_pay),
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_charged_to = 'EL' THEN
            UPDATE public.leave_balances
            SET emergency_credits = GREATEST(0, emergency_credits - v_days_with_pay),
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        END IF;
    END IF;

    -- Update application status & Form 6 Section 7.D approved breakdown
    UPDATE public.leave_applications
    SET status = 'APPROVED',
        processed_by_admin_id = v_caller_id,
        admin_remarks = p_remarks,
        approved_days_with_pay = v_days_with_pay,
        approved_days_without_pay = v_days_without_pay,
        approved_others = p_approved_others,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    -- Insert audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'LEAVE_APPROVED',
        FORMAT('Approved leave application %s (Type: %s, Days with pay: %s, Days without pay: %s) for employee %s.',
            p_leave_id, v_app.leave_type, v_days_with_pay, v_days_without_pay, COALESCE(v_app.employee_name, v_app.user_id::text)),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_leave(BIGINT, NUMERIC(6,2), NUMERIC(6,2), TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_leave(BIGINT, NUMERIC(6,2), NUMERIC(6,2), TEXT, TEXT) TO authenticated;
