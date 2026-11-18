-- ==============================================================================
-- Migration: 0006_leave_types.sql
-- Description: Dynamic leave types table, migration from enum to foreign key,
--              RLS policies, and updated DSS functions and balance triggers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create public.leave_types table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_basis TEXT,
    charged_to TEXT NOT NULL DEFAULT 'NONE' CHECK (charged_to IN ('VL', 'SL', 'NONE')),
    requires_advance_filing BOOLEAN NOT NULL DEFAULT FALSE,
    min_advance_days INTEGER NOT NULL DEFAULT 5,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. Seed leave types
-- ------------------------------------------------------------------------------
INSERT INTO public.leave_types (code, name, legal_basis, charged_to, requires_advance_filing, min_advance_days, sort_order, is_active)
VALUES
    ('VL', 'Vacation Leave', 'Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'VL', TRUE, 5, 1, TRUE),
    ('FL', 'Mandatory/Forced Leave', 'Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'VL', TRUE, 5, 2, TRUE),
    ('SL', 'Sick Leave', 'Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'SL', FALSE, 0, 3, TRUE),
    ('ML', 'Maternity Leave', 'R.A. No. 11210 / IRR issued by CSC, DOLE and SSS', 'NONE', FALSE, 0, 4, TRUE),
    ('PL', 'Paternity Leave', 'R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended', 'NONE', FALSE, 0, 5, TRUE),
    ('SPL', 'Special Privilege Leave', 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'NONE', TRUE, 5, 6, TRUE),
    ('SOLO', 'Solo Parent Leave', 'RA No. 8972 / CSC MC No. 8, s. 2004', 'NONE', FALSE, 0, 7, TRUE),
    ('STUDY', 'Study Leave', 'Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'NONE', FALSE, 0, 8, TRUE),
    ('VAWC', '10-Day VAWC Leave', 'RA No. 9262 / CSC MC No. 15, s. 2010', 'NONE', FALSE, 0, 9, TRUE),
    ('REHAB', 'Rehabilitation Privilege', 'Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292', 'NONE', FALSE, 0, 10, TRUE),
    ('SLBW', 'Special Leave Benefits for Women', 'RA No. 9710 / CSC MC No. 25, s. 2010', 'NONE', FALSE, 0, 11, TRUE),
    ('CALAMITY', 'Special Emergency (Calamity) Leave', 'CSC MC No. 2, s. 2012, as amended', 'NONE', FALSE, 0, 12, TRUE),
    ('ADOPT', 'Adoption Leave', 'R.A. No. 8552', 'NONE', FALSE, 0, 13, TRUE),
    ('WL', 'Wellness Leave', NULL, 'NONE', TRUE, 5, 14, TRUE),
    ('CTO', 'Compensatory Time-Off', NULL, 'NONE', TRUE, 5, 15, TRUE),
    ('OTHER', 'Others (specify)', NULL, 'NONE', FALSE, 0, 16, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    legal_basis = EXCLUDED.legal_basis,
    charged_to = EXCLUDED.charged_to,
    requires_advance_filing = EXCLUDED.requires_advance_filing,
    min_advance_days = EXCLUDED.min_advance_days,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. RLS for public.leave_types
-- ------------------------------------------------------------------------------
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.leave_types FROM anon, public;
GRANT SELECT ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;

DROP POLICY IF EXISTS "leave_types_select_approved" ON public.leave_types;
CREATE POLICY "leave_types_select_approved"
ON public.leave_types
FOR SELECT
TO authenticated
USING (public.is_approved());

DROP POLICY IF EXISTS "leave_types_manage_mho_admin" ON public.leave_types;
CREATE POLICY "leave_types_manage_mho_admin"
ON public.leave_types
FOR ALL
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
)
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

-- ------------------------------------------------------------------------------
-- 4. Migrate leave_applications.leave_type from enum to text referencing leave_types.code
-- ------------------------------------------------------------------------------

-- Drop dependent functions before altering type
DROP FUNCTION IF EXISTS public.get_dss_recommendation(UUID, public.leave_type, NUMERIC, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.evaluate_leave_credits(UUID, public.leave_type, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.process_leave_approval(BIGINT, TEXT) CASCADE;

-- Convert column type to TEXT cleanly
ALTER TABLE public.leave_applications 
    ALTER COLUMN leave_type TYPE TEXT USING leave_type::text;

-- Update existing text values to standard leave type codes
UPDATE public.leave_applications
SET leave_type = CASE leave_type
    WHEN 'Vacation Leave' THEN 'VL'
    WHEN 'Sick Leave' THEN 'SL'
    WHEN 'Emergency Leave' THEN 'CALAMITY'
    WHEN 'Maternity Leave' THEN 'ML'
    WHEN 'Paternity Leave' THEN 'PL'
    WHEN 'Special Privilege Leave' THEN 'SPL'
    WHEN 'Other' THEN 'OTHER'
    ELSE COALESCE(
        (SELECT lt.code FROM public.leave_types lt WHERE lt.code = leave_applications.leave_type OR lt.name = leave_applications.leave_type LIMIT 1),
        'OTHER'
    )
END;

-- Add foreign key constraint to leave_types(code)
ALTER TABLE public.leave_applications
    DROP CONSTRAINT IF EXISTS fk_leave_applications_leave_type;

ALTER TABLE public.leave_applications
    ADD CONSTRAINT fk_leave_applications_leave_type
    FOREIGN KEY (leave_type) REFERENCES public.leave_types(code)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- Drop obsolete PostgreSQL enum leave_type if present
DROP TYPE IF EXISTS public.leave_type CASCADE;

-- ------------------------------------------------------------------------------
-- 5. Recreate Updated Functions & Triggers
-- ------------------------------------------------------------------------------

-- 5.1 Update status audit trigger function (casts leave_type to TEXT cleanly)
CREATE OR REPLACE FUNCTION public.trg_func_leave_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
        VALUES (
            NEW.user_id,
            CONCAT('LEAVE_', NEW.status::text),
            CONCAT('Leave Application #', NEW.id, ' (', NEW.leave_type, ' - ', NEW.total_days, ' days) status changed from ', OLD.status::text, ' to ', NEW.status::text, '.'),
            '127.0.0.1',
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Updated evaluate_leave_credits accepting TEXT
CREATE OR REPLACE FUNCTION public.evaluate_leave_credits(
    p_user_id UUID,
    p_leave_type TEXT,
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
    v_charged_to TEXT := 'NONE';
    v_type_name TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();

    IF v_caller_role = 'STAFF' AND p_user_id IS NOT NULL AND p_user_id != v_caller_id THEN
        RAISE EXCEPTION 'Least privilege violation: STAFF cannot query credits for other employees.';
    END IF;

    IF p_user_id IS NULL THEN
        IF v_caller_role != 'MHO_ADMIN' THEN
            RAISE EXCEPTION 'Least privilege violation: Only MHO_ADMIN can file walk-in applications without user_id.';
        END IF;
        RETURN QUERY SELECT TRUE, 'Walk-in application (no balance record required).'::TEXT, 0::NUMERIC;
        RETURN;
    END IF;

    -- Lookup leave type configuration
    SELECT charged_to, name INTO v_charged_to, v_type_name
    FROM public.leave_types
    WHERE code = p_leave_type OR name = p_leave_type
    LIMIT 1;

    IF v_charged_to IS NULL THEN
        v_charged_to := 'NONE';
        v_type_name := p_leave_type;
    END IF;

    SELECT vacation_credits, sick_credits, emergency_credits
    INTO v_vacation, v_sick, v_emergency
    FROM public.leave_balances
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'No leave balance record found for this employee.'::TEXT, 0::NUMERIC;
        RETURN;
    END IF;

    IF v_charged_to = 'VL' THEN
        v_avail := COALESCE(v_vacation, 0);
    ELSIF v_charged_to = 'SL' THEN
        v_avail := COALESCE(v_sick, 0);
    ELSE
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (Non-credit / Statutory / Exempt).', v_type_name), 999::NUMERIC;
        RETURN;
    END IF;

    IF v_avail >= p_days THEN
        RETURN QUERY SELECT TRUE, FORMAT('Sufficient %s balance available (%s days remaining).', v_type_name, v_avail), v_avail;
    ELSE
        RETURN QUERY SELECT FALSE, FORMAT('Insufficient %s balance. Requested: %s days, Available: %s days.', v_type_name, p_days, v_avail), v_avail;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_leave_credits(UUID, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_leave_credits(UUID, TEXT, NUMERIC) TO authenticated;

-- 5.3 Updated get_dss_recommendation accepting TEXT
CREATE OR REPLACE FUNCTION public.get_dss_recommendation(
    p_user_id UUID,
    p_leave_type TEXT,
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
    v_requires_advance BOOLEAN := FALSE;
    v_min_advance_days INTEGER := 5;
    v_days_in_advance INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();

    IF v_caller_role = 'STAFF' AND p_user_id IS NOT NULL AND p_user_id != v_caller_id THEN
        RAISE EXCEPTION 'Least privilege violation: STAFF cannot query DSS recommendation for other employees.';
    END IF;

    -- Advance filing evaluation
    SELECT requires_advance_filing, min_advance_days
    INTO v_requires_advance, v_min_advance_days
    FROM public.leave_types
    WHERE code = p_leave_type OR name = p_leave_type
    LIMIT 1;

    IF v_requires_advance IS TRUE THEN
        v_days_in_advance := (p_start_date - CURRENT_DATE);
        IF v_days_in_advance < v_min_advance_days THEN
            RETURN QUERY SELECT 'NEEDS_REVIEW'::TEXT, 
                FORMAT('Advance filing notice requirement not met: Filed %s day(s) before start date, required at least %s day(s).', 
                    GREATEST(0, v_days_in_advance), v_min_advance_days);
            RETURN;
        END IF;
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
        RETURN;
    END IF;

    IF NOT v_sched_passed THEN
        RETURN QUERY SELECT 'NEEDS_REVIEW'::TEXT, v_sched_msg;
        RETURN;
    END IF;

    IF v_sched_warning THEN
        RETURN QUERY SELECT 'RECOMMENDED'::TEXT, v_sched_msg;
        RETURN;
    END IF;

    RETURN QUERY SELECT 'RECOMMENDED'::TEXT, 'All DSS pre-conditions satisfied (sufficient balance & minimum staffing coverage maintained).'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dss_recommendation(UUID, TEXT, NUMERIC, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dss_recommendation(UUID, TEXT, NUMERIC, DATE, DATE) TO authenticated;

-- 5.4 Updated process_leave_approval looking up charged_to dynamically
CREATE OR REPLACE FUNCTION public.process_leave_approval(
    p_leave_id BIGINT,
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
    v_app public.leave_applications%ROWTYPE;
    v_charged_to TEXT := 'NONE';
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_approved() THEN
        RAISE EXCEPTION 'Access denied: User account is not approved.';
    END IF;

    v_caller_role := public.current_role();
    IF v_caller_role NOT IN ('MHO_ADMIN', 'MHO_HEAD') THEN
        RAISE EXCEPTION 'Least privilege violation: Only MHO_ADMIN or MHO_HEAD can approve leave applications.';
    END IF;

    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application #% not found.', p_leave_id;
    END IF;

    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Lookup charged_to bucket
    SELECT charged_to INTO v_charged_to
    FROM public.leave_types
    WHERE code = v_app.leave_type
    LIMIT 1;

    IF v_charged_to IS NULL THEN
        v_charged_to := 'NONE';
    END IF;

    -- Deduct credits if applicant is registered
    IF v_app.user_id IS NOT NULL THEN
        IF v_charged_to = 'VL' THEN
            UPDATE public.leave_balances
            SET vacation_credits = vacation_credits - v_app.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_charged_to = 'SL' THEN
            UPDATE public.leave_balances
            SET sick_credits = sick_credits - v_app.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        END IF;
    END IF;

    -- Update leave application record
    UPDATE public.leave_applications
    SET status = 'APPROVED',
        processed_by_admin_id = v_caller_id,
        admin_remarks = p_remarks,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    -- Audit log entry
    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'LEAVE_APPROVED',
        format('Admin %s approved leave application #%s for employee %s (%s days %s). Remarks: %s',
            v_caller_id, v_app.id, COALESCE(v_app.employee_name, v_app.user_id::text), v_app.total_days, v_app.leave_type, COALESCE(p_remarks, 'None')),
        NULL,
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

REVOKE ALL ON FUNCTION public.process_leave_approval(BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_leave_approval(BIGINT, TEXT) TO authenticated;
