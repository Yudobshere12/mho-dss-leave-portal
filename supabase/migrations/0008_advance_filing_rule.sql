-- ==============================================================================
-- Migration: 0008_advance_filing_rule.sql
-- Description: Enforce mandatory advance filing rule for designated leave types
--              (requires_advance_filing = true, min_advance_days = 5) on CS Form No. 6.
--              Filing is blocked at database trigger level with user-friendly error.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper function: earliest_start_date(p_type)
-- Returns the earliest allowed start date based on server date in Asia/Manila.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.earliest_start_date(p_type TEXT)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_today DATE;
    v_requires_advance BOOLEAN := FALSE;
    v_min_days INTEGER := 0;
BEGIN
    -- Server date in Asia/Manila timezone
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    SELECT requires_advance_filing, COALESCE(min_advance_days, 0)
    INTO v_requires_advance, v_min_days
    FROM public.leave_types
    WHERE code = p_type OR name = p_type
    LIMIT 1;

    IF v_requires_advance IS TRUE AND v_min_days > 0 THEN
        RETURN (v_today + v_min_days);
    ELSE
        RETURN v_today;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.earliest_start_date(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.earliest_start_date(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Trigger Function: enforce_advance_filing_rule
-- Blocks INSERT if start_date < today_manila + min_advance_days for types requiring advance notice.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_func_enforce_advance_filing_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_today DATE;
    v_type_name TEXT;
    v_requires_advance BOOLEAN := FALSE;
    v_min_days INTEGER := 0;
    v_earliest_date DATE;
BEGIN
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    SELECT name, requires_advance_filing, COALESCE(min_advance_days, 0)
    INTO v_type_name, v_requires_advance, v_min_days
    FROM public.leave_types
    WHERE code = NEW.leave_type OR name = NEW.leave_type
    LIMIT 1;

    IF v_requires_advance IS TRUE AND v_min_days > 0 THEN
        v_earliest_date := v_today + v_min_days;

        IF NEW.start_date < v_earliest_date THEN
            RAISE EXCEPTION '% requires advance filing of at least % calendar days before the leave start date. Earliest allowed start date is % (chosen: %).',
                COALESCE(v_type_name, NEW.leave_type),
                v_min_days,
                to_char(v_earliest_date, 'YYYY-MM-DD'),
                to_char(NEW.start_date, 'YYYY-MM-DD');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_advance_filing_rule ON public.leave_applications;
CREATE TRIGGER trg_enforce_advance_filing_rule
BEFORE INSERT ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.trg_func_enforce_advance_filing_rule();
