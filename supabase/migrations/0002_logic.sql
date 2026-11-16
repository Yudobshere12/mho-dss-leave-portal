-- ==============================================================================
-- Migration: 0002_logic.sql
-- Description: Business logic, Decision Support System (DSS), and transactional
--              workflow functions ported from legacy PHP into PostgreSQL.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. System Settings Table (Stores DSS thresholds and configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default minimum duty staff threshold (default: 2)
INSERT INTO public.system_settings (key, value, description)
VALUES ('min_duty_staff', '2', 'Minimum number of active duty staff required on schedule')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Trigger Function: Port of trg_after_leave_status_update
-- ------------------------------------------------------------------------------
-- Ensure trigger name and function precisely reflect MySQL trg_after_leave_status_update
CREATE OR REPLACE FUNCTION public.trg_func_leave_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when application status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
        VALUES (
            NEW.user_id,
            CONCAT('LEAVE_', NEW.status::text),
            CONCAT('Leave Application #', NEW.id, ' (', NEW.leave_type::text, ' - ', NEW.total_days, ' days) status changed from ', OLD.status::text, ' to ', NEW.status::text, '.'),
            '127.0.0.1',
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop legacy trigger if attached under previous name and bind ported trigger
DROP TRIGGER IF EXISTS trg_leave_status_update ON public.leave_applications;
DROP TRIGGER IF EXISTS trg_after_leave_status_update ON public.leave_applications;

CREATE TRIGGER trg_after_leave_status_update
AFTER UPDATE ON public.leave_applications
FOR EACH ROW EXECUTE FUNCTION public.trg_func_leave_status_audit();


-- ------------------------------------------------------------------------------
-- 3. count_weekdays(start_date, end_date)
-- Calculates duration excluding Saturdays and Sundays (inclusive range).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_weekdays(p_start_date DATE, p_end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
        RETURN 0;
    END IF;

    -- In Postgres EXTRACT(DOW FROM d): 0 = Sunday, 6 = Saturday
    -- Weekdays are 1 (Monday) through 5 (Friday)
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM generate_series(p_start_date::timestamp, p_end_date::timestamp, '1 day'::interval) d
    WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);

    RETURN v_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ------------------------------------------------------------------------------
-- 4. evaluate_leave_credits(user_id, leave_type, days)
-- Checks whether user has sufficient credits in leave_balances.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_leave_credits(
    p_user_id UUID,
    p_leave_type public.leave_type,
    p_days NUMERIC
)
RETURNS TABLE (
    passed BOOLEAN,
    message TEXT,
    available NUMERIC
) AS $$
DECLARE
    v_vacation NUMERIC(6,2);
    v_sick NUMERIC(6,2);
    v_emergency NUMERIC(6,2);
    v_avail NUMERIC(6,2) := 0;
BEGIN
    -- For walk-in filings where user_id is NULL
    IF p_user_id IS NULL THEN
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

    -- Map leave type to corresponding balance bucket
    IF p_leave_type = 'Vacation Leave' THEN
        v_avail := COALESCE(v_vacation, 0);
    ELSIF p_leave_type = 'Sick Leave' THEN
        v_avail := COALESCE(v_sick, 0);
    ELSIF p_leave_type = 'Emergency Leave' THEN
        v_avail := COALESCE(v_emergency, 0);
    ELSE
        -- Non-credit-deducting categories (Maternity, Paternity, Special Privilege, Other)
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (Statutory / Exempt).', p_leave_type::TEXT), 999::NUMERIC;
        RETURN;
    END IF;

    IF v_avail >= p_days THEN
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (%s days remaining).', p_leave_type::TEXT, v_avail), v_avail;
    ELSE
        RETURN QUERY SELECT FALSE, FORMAT('Insufficient %s balance. Requested: %s days, Available: %s days.', p_leave_type::TEXT, p_days, v_avail), v_avail;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- ------------------------------------------------------------------------------
-- 5. evaluate_schedule_conflict(user_id, start_date, end_date)
-- Evaluates applicant schedule overlap and minimum duty staff threshold.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_schedule_conflict(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    passed BOOLEAN,
    warning BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_user_conflict_count INTEGER := 0;
    v_overlapping_leaves INTEGER := 0;
    v_total_staff INTEGER := 0;
    v_min_required_staff INTEGER := 2;
    v_projected_available INTEGER := 0;
    v_setting_val TEXT;
BEGIN
    -- Retrieve configured minimum duty staff threshold
    SELECT value INTO v_setting_val FROM public.system_settings WHERE key = 'min_duty_staff';
    IF v_setting_val IS NOT NULL THEN
        v_min_required_staff := v_setting_val::INTEGER;
    END IF;

    -- 1. Check if applicant already has an approved leave overlapping this period
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
    WHERE role = 'STAFF' AND is_active = TRUE;

    -- Projected staff: total staff minus concurrent leaves minus applicant
    v_projected_available := v_total_staff - v_overlapping_leaves - 1;

    IF v_projected_available < v_min_required_staff THEN
        RETURN QUERY SELECT TRUE, TRUE, FORMAT('Coverage Warning: Approving this leave reduces duty staff to %s (Minimum threshold: %s).', v_projected_available, v_min_required_staff);
    ELSE
        RETURN QUERY SELECT TRUE, FALSE, FORMAT('Schedule check passed. Projected available duty staff: %s.', v_projected_available);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- ------------------------------------------------------------------------------
-- 6. get_dss_recommendation(user_id, leave_type, days, start_date, end_date)
-- Master DSS decision engine returning recommendation tag and detailed rationale.
-- ------------------------------------------------------------------------------
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
) AS $$
DECLARE
    v_credit_passed BOOLEAN;
    v_credit_msg TEXT;
    v_credit_avail NUMERIC;
    v_sched_passed BOOLEAN;
    v_sched_warning BOOLEAN;
    v_sched_msg TEXT;
BEGIN
    -- Evaluate credits
    SELECT passed, message, available
    INTO v_credit_passed, v_credit_msg, v_credit_avail
    FROM public.evaluate_leave_credits(p_user_id, p_leave_type, p_days);

    -- Evaluate schedule and coverage
    SELECT passed, warning, message
    INTO v_sched_passed, v_sched_warning, v_sched_msg
    FROM public.evaluate_schedule_conflict(p_user_id, p_start_date, p_end_date);

    -- If credit evaluation fails or schedule has direct collision
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
$$ LANGUAGE plpgsql STABLE;


-- ------------------------------------------------------------------------------
-- 7. approve_leave(leave_id, admin_id, remarks)
-- Atomic leave approval: validates state, deducts leave balance, updates record.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_leave(
    p_leave_id BIGINT,
    p_admin_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS public.leave_applications AS $$
DECLARE
    v_app public.leave_applications%ROWTYPE;
BEGIN
    -- Lock row for atomic processing
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    -- Prevent double approval or transition from finalized states
    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Deduct credits if applicant is a registered user
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

    -- Update leave application record
    UPDATE public.leave_applications
    SET status = 'APPROVED',
        processed_by_admin_id = p_admin_id,
        admin_remarks = p_remarks,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    RETURN v_app;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 8. reject_leave(leave_id, admin_id, remarks)
-- Atomic leave rejection: validates state, updates record to REJECTED.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_leave(
    p_leave_id BIGINT,
    p_admin_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS public.leave_applications AS $$
DECLARE
    v_app public.leave_applications%ROWTYPE;
BEGIN
    -- Lock row for atomic processing
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    -- Prevent modifying finalized applications
    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Update leave application record
    UPDATE public.leave_applications
    SET status = 'REJECTED',
        processed_by_admin_id = p_admin_id,
        admin_remarks = p_remarks,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    RETURN v_app;
END;
$$ LANGUAGE plpgsql;
