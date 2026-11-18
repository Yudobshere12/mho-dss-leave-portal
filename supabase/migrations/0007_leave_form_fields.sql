-- ==============================================================================
-- Migration: 0007_leave_form_fields.sql
-- Description: Civil Service Form No. 6 (Revised 2020) extensions for MHO DSS
--              Office of the Municipal Health, Manolo Fortich, Bukidnon.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. System Settings Seed: Office and Signatory defaults
-- ------------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('office_name', 'Office of the Municipal Health', 'Official department / office designation for CS Form No. 6'),
    ('hrmo_name', 'Catherine C. Gatchalian', 'Human Resource Management Officer signatory name (7.A)'),
    ('hrmo_title', 'MGDH I - HRMO', 'HRMO official title'),
    ('mho_name', 'Joanne Marie V. Dueñas', 'Municipal Health Officer signatory name (7.D)'),
    ('mho_title', 'Municipal Health Officer', 'MHO official title')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. Employee Compensation Table (Strictly confidential, separate from profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_compensation (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (monthly_salary >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_compensation FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.employee_compensation FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_compensation TO authenticated;
GRANT ALL ON public.employee_compensation TO service_role;

-- SELECT policy: Owner, MHO_ADMIN, and MHO_HEAD only
DROP POLICY IF EXISTS "emp_comp_select_owner_and_management" ON public.employee_compensation;
CREATE POLICY "emp_comp_select_owner_and_management"
ON public.employee_compensation
FOR SELECT
TO authenticated
USING (
    public.is_approved() AND (
        user_id = auth.uid() OR
        public.current_role() IN ('MHO_ADMIN', 'MHO_HEAD')
    )
);

-- WRITE (INSERT, UPDATE, DELETE) policies: MHO_ADMIN only
DROP POLICY IF EXISTS "emp_comp_insert_mho_admin" ON public.employee_compensation;
CREATE POLICY "emp_comp_insert_mho_admin"
ON public.employee_compensation
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

DROP POLICY IF EXISTS "emp_comp_update_mho_admin" ON public.employee_compensation;
CREATE POLICY "emp_comp_update_mho_admin"
ON public.employee_compensation
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

DROP POLICY IF EXISTS "emp_comp_delete_mho_admin" ON public.employee_compensation;
CREATE POLICY "emp_comp_delete_mho_admin"
ON public.employee_compensation
FOR DELETE
TO authenticated
USING (
    public.is_approved() AND
    public.current_role() = 'MHO_ADMIN'
);

-- Ensure position column exists on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;

-- ------------------------------------------------------------------------------
-- 3. Extend public.leave_applications for CS Form No. 6
-- ------------------------------------------------------------------------------
ALTER TABLE public.leave_applications
    ADD COLUMN IF NOT EXISTS control_number TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS date_of_filing DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE,
    ADD COLUMN IF NOT EXISTS position_at_filing TEXT,
    ADD COLUMN IF NOT EXISTS working_days NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS commutation TEXT NOT NULL DEFAULT 'not_requested' CHECK (commutation IN ('requested', 'not_requested')),
    ADD COLUMN IF NOT EXISTS credits_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS recommendation TEXT CHECK (recommendation IN ('for_approval', 'for_disapproval')),
    ADD COLUMN IF NOT EXISTS recommendation_reason TEXT,
    ADD COLUMN IF NOT EXISTS approved_days_with_pay NUMERIC(6,2) DEFAULT 0 CHECK (approved_days_with_pay >= 0),
    ADD COLUMN IF NOT EXISTS approved_days_without_pay NUMERIC(6,2) DEFAULT 0 CHECK (approved_days_without_pay >= 0),
    ADD COLUMN IF NOT EXISTS approved_others TEXT,
    ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;

-- ------------------------------------------------------------------------------
-- 4. Sequences & Control Number Generator (Leave-YYYY-NNNNNN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_control_sequences (
    year INTEGER PRIMARY KEY,
    last_val INTEGER NOT NULL DEFAULT 0
);

REVOKE ALL ON public.leave_control_sequences FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.leave_control_sequences TO authenticated;
GRANT ALL ON public.leave_control_sequences TO service_role;

CREATE OR REPLACE FUNCTION public.generate_leave_control_number(p_filing_date DATE DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM COALESCE(p_filing_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE))::INTEGER;

    INSERT INTO public.leave_control_sequences (year, last_val)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_val = public.leave_control_sequences.last_val + 1
    RETURNING last_val INTO v_seq;

    RETURN FORMAT('Leave-%s-%s', v_year, LPAD(v_seq::text, 6, '0'));
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Validation Function for Section 6.B Details by Leave Type
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_leave_details(p_leave_type TEXT, p_details JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_details IS NULL THEN
        RETURN FALSE;
    END IF;

    -- VL, FL, SPL: within_philippines | abroad + specify
    IF p_leave_type IN ('VL', 'FL', 'SPL', 'Vacation Leave', 'Mandatory/Forced Leave', 'Special Privilege Leave') THEN
        IF NOT (
            (p_details->>'location') IN ('within_philippines', 'abroad') AND
            COALESCE(TRIM(p_details->>'specify'), '') <> ''
        ) THEN
            RETURN FALSE;
        END IF;

    -- SL: in_hospital | out_patient + illness specify
    ELSIF p_leave_type IN ('SL', 'Sick Leave') THEN
        IF NOT (
            (p_details->>'care_type') IN ('in_hospital', 'out_patient') AND
            COALESCE(TRIM(p_details->>'illness'), '') <> ''
        ) THEN
            RETURN FALSE;
        END IF;

    -- SLBW: Special Leave Benefits for Women (requires illness / gynecological disorder)
    ELSIF p_leave_type IN ('SLBW', 'Special Leave Benefits for Women') THEN
        IF COALESCE(TRIM(p_details->>'illness'), '') = '' THEN
            RETURN FALSE;
        END IF;

    -- STUDY: masters_completion | bar_board_review
    ELSIF p_leave_type IN ('STUDY', 'Study Leave') THEN
        IF (p_details->>'study_purpose') NOT IN ('masters_completion', 'bar_board_review') THEN
            RETURN FALSE;
        END IF;

    -- Other Purpose (Monetization or Terminal Leave)
    ELSIF (p_details->>'other_purpose') IS NOT NULL AND (p_details->>'other_purpose') <> '' THEN
        IF (p_details->>'other_purpose') NOT IN ('monetization', 'terminal_leave') THEN
            RETURN FALSE;
        END IF;

    -- OTHER: requires specify
    ELSIF p_leave_type IN ('OTHER', 'Others (specify)') THEN
        IF COALESCE(TRIM(p_details->>'specify'), '') = '' THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Trigger: Pre-Insert Application Setup (Control #, Working Days, Snapshot, DSS Recommendation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_func_leave_applications_pre_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_pos TEXT;
    v_filing_date DATE;
    v_calculated_days INTEGER;
    v_vl_bal NUMERIC(6,2) := 0.00;
    v_sl_bal NUMERIC(6,2) := 0.00;
    v_charged_to TEXT := 'NONE';
    v_vl_less NUMERIC(6,2) := 0.00;
    v_sl_less NUMERIC(6,2) := 0.00;
    v_dss_rec TEXT;
    v_dss_reason TEXT;
BEGIN
    -- 1. Date of filing in Manila
    v_filing_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    NEW.date_of_filing := COALESCE(NEW.date_of_filing, v_filing_date);

    -- 2. Compute working weekdays server-side
    v_calculated_days := public.count_weekdays(NEW.start_date, NEW.end_date);
    NEW.working_days := v_calculated_days;
    NEW.total_days := v_calculated_days;

    -- 3. Server-side generated Control Number (never client-supplied)
    IF NEW.control_number IS NULL OR TRIM(NEW.control_number) = '' THEN
        NEW.control_number := public.generate_leave_control_number(NEW.date_of_filing);
    END IF;

    -- 4. Position at filing (prefill from profile if null)
    IF NEW.position_at_filing IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT position INTO v_pos FROM public.profiles WHERE id = NEW.user_id;
        NEW.position_at_filing := v_pos;
    END IF;

    -- 5. Validate section 6.B details
    IF NOT public.validate_leave_details(NEW.leave_type, NEW.details) THEN
        RAISE EXCEPTION 'Invalid leave details for leave type %: %', NEW.leave_type, NEW.details;
    END IF;

    -- 6. Compute 7.A Credits Snapshot if user_id is provided
    IF NEW.user_id IS NOT NULL THEN
        SELECT vacation_credits, sick_credits
        INTO v_vl_bal, v_sl_bal
        FROM public.leave_balances
        WHERE user_id = NEW.user_id;

        v_vl_bal := COALESCE(v_vl_bal, 0.00);
        v_sl_bal := COALESCE(v_sl_bal, 0.00);

        -- Determine charged_to
        SELECT charged_to INTO v_charged_to
        FROM public.leave_types
        WHERE code = NEW.leave_type OR name = NEW.leave_type
        LIMIT 1;

        IF v_charged_to IS NULL THEN
            IF NEW.leave_type IN ('VL', 'FL', 'Vacation Leave', 'Mandatory/Forced Leave') THEN
                v_charged_to := 'VL';
            ELSIF NEW.leave_type IN ('SL', 'Sick Leave') THEN
                v_charged_to := 'SL';
            ELSE
                v_charged_to := 'NONE';
            END IF;
        END IF;

        IF v_charged_to = 'VL' THEN
            v_vl_less := NEW.working_days;
        ELSIF v_charged_to = 'SL' THEN
            v_sl_less := NEW.working_days;
        END IF;

        NEW.credits_snapshot := jsonb_build_object(
            'as_of_date', NEW.date_of_filing::text,
            'vacation', jsonb_build_object(
                'total_earned', v_vl_bal,
                'less_this_app', v_vl_less,
                'balance', (v_vl_bal - v_vl_less)
            ),
            'sick', jsonb_build_object(
                'total_earned', v_sl_bal,
                'less_this_app', v_sl_less,
                'balance', (v_sl_bal - v_sl_less)
            ),
            'total', jsonb_build_object(
                'total_earned', (v_vl_bal + v_sl_bal),
                'less_this_app', (v_vl_less + v_sl_less),
                'balance', ((v_vl_bal + v_sl_bal) - (v_vl_less + v_sl_less))
            )
        );
    END IF;

    -- 7. Prefill Section 7.B Recommendation from DSS evaluation
    SELECT recommendation, reason INTO v_dss_rec, v_dss_reason
    FROM public.get_dss_recommendation(NEW.user_id, NEW.leave_type, NEW.working_days, NEW.start_date, NEW.end_date);

    IF v_dss_rec = 'RECOMMENDED' THEN
        NEW.recommendation := 'for_approval';
        NEW.recommendation_reason := COALESCE(v_dss_reason, 'Duty staffing coverage and balance requirements satisfied.');
    ELSE
        NEW.recommendation := 'for_disapproval';
        NEW.recommendation_reason := COALESCE(v_dss_reason, 'Does not satisfy DSS minimum staffing or balance requirements.');
    END IF;

    NEW.dss_recommendation := FORMAT('%s (%s)', v_dss_rec, NEW.recommendation_reason);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_applications_pre_insert ON public.leave_applications;
CREATE TRIGGER trg_leave_applications_pre_insert
BEFORE INSERT ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.trg_func_leave_applications_pre_insert();

-- ------------------------------------------------------------------------------
-- 7. Backfill Existing Records with Control Numbers & Working Days
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_seq INTEGER := 0;
    v_year INTEGER;
BEGIN
    FOR r IN (
        SELECT id, start_date, end_date, total_days, created_at
        FROM public.leave_applications
        WHERE control_number IS NULL
        ORDER BY created_at ASC, id ASC
    ) LOOP
        v_year := EXTRACT(YEAR FROM r.created_at)::INTEGER;
        v_seq := v_seq + 1;

        UPDATE public.leave_applications
        SET control_number = FORMAT('Leave-%s-%s', v_year, LPAD(v_seq::text, 6, '0')),
            date_of_filing = COALESCE(date_of_filing, (r.created_at AT TIME ZONE 'Asia/Manila')::DATE),
            working_days = COALESCE(working_days, r.total_days, public.count_weekdays(r.start_date, r.end_date))
        WHERE id = r.id;
    END LOOP;

    -- Update control sequence tracker for the latest year
    IF v_year IS NOT NULL THEN
        INSERT INTO public.leave_control_sequences (year, last_val)
        VALUES (v_year, v_seq)
        ON CONFLICT (year) DO UPDATE
        SET last_val = GREATEST(public.leave_control_sequences.last_val, EXCLUDED.last_val);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. Updated Decision Functions: approve_leave & reject_leave
-- ------------------------------------------------------------------------------

-- Drop existing overloads
DROP FUNCTION IF EXISTS public.approve_leave(BIGINT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.approve_leave(BIGINT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reject_leave(BIGINT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reject_leave(BIGINT, TEXT) CASCADE;

-- 8.1 approve_leave
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
    v_app public.leave_applications%ROWTYPE;
    v_charged_to TEXT := 'NONE';
    v_days_with_pay NUMERIC(6,2);
    v_days_without_pay NUMERIC(6,2);
    v_total_app NUMERIC(6,2);
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

    -- Lock row for atomic decision
    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    IF v_app.user_id IS NOT NULL AND v_app.user_id = v_caller_id THEN
        RAISE EXCEPTION 'Conflict of interest: You cannot approve your own leave application.';
    END IF;

    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    -- Default days with pay to working_days if not specified
    v_days_with_pay := COALESCE(p_approved_days_with_pay, v_app.working_days, v_app.total_days);
    v_days_without_pay := COALESCE(p_approved_days_without_pay, 0.00);

    v_total_app := COALESCE(v_app.working_days, v_app.total_days);
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
        ELSE
            v_charged_to := 'NONE';
        END IF;
    END IF;

    -- Deduct approved days with pay from credits
    IF v_app.user_id IS NOT NULL AND v_days_with_pay > 0 THEN
        IF v_charged_to = 'VL' THEN
            UPDATE public.leave_balances
            SET vacation_credits = vacation_credits - v_days_with_pay,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_app.user_id;
        ELSIF v_charged_to = 'SL' THEN
            UPDATE public.leave_balances
            SET sick_credits = sick_credits - v_days_with_pay,
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
        FORMAT('Leave Application #%s (%s) approved by MHO_HEAD. Days with pay: %s, Days w/o pay: %s. Remarks: %s',
            p_leave_id, v_app.control_number, v_days_with_pay, v_days_without_pay, COALESCE(p_remarks, 'None')),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_leave(BIGINT, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_leave(BIGINT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

-- 8.2 reject_leave
CREATE OR REPLACE FUNCTION public.reject_leave(
    p_leave_id BIGINT,
    p_disapproval_reason TEXT,
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

    IF p_disapproval_reason IS NULL OR TRIM(p_disapproval_reason) = '' THEN
        RAISE EXCEPTION 'Rejection requires a specific disapproval reason as mandated by CS Form No. 6.';
    END IF;

    SELECT * INTO v_app
    FROM public.leave_applications
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave application with ID % not found.', p_leave_id;
    END IF;

    IF v_app.user_id IS NOT NULL AND v_app.user_id = v_caller_id THEN
        RAISE EXCEPTION 'Conflict of interest: You cannot reject your own leave application.';
    END IF;

    IF v_app.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave application #% has already been processed with status %.', p_leave_id, v_app.status;
    END IF;

    UPDATE public.leave_applications
    SET status = 'REJECTED',
        processed_by_admin_id = v_caller_id,
        disapproval_reason = p_disapproval_reason,
        admin_remarks = COALESCE(p_remarks, p_disapproval_reason),
        processed_at = timezone('utc'::text, now())
    WHERE id = p_leave_id
    RETURNING * INTO v_app;

    INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
    VALUES (
        v_caller_id,
        'LEAVE_REJECTED',
        FORMAT('Leave Application #%s (%s) rejected by MHO_HEAD. Reason: %s',
            p_leave_id, v_app.control_number, p_disapproval_reason),
        '127.0.0.1',
        timezone('utc'::text, now())
    );

    RETURN v_app;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_leave(BIGINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_leave(BIGINT, TEXT, TEXT) TO authenticated;
