-- ==============================================================================
-- Migration: 0001_init_schema.sql
-- Description: Initial schema for MHO DSS Leave Portal
--
-- NOTE:
-- Do not create any RLS policies yet.
-- Row-Level Security (RLS) is deferred until after deployment and auth configuration.
-- profiles must NOT depend on auth.users yet (uses its own standalone UUID PK).
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumeration Types
CREATE TYPE user_role AS ENUM (
    'STAFF',
    'MHO_ADMIN',
    'MHO_HEAD',
    'LGU_HR'
);

CREATE TYPE leave_type AS ENUM (
    'Vacation Leave',
    'Sick Leave',
    'Emergency Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Special Privilege Leave',
    'Other'
);

CREATE TYPE leave_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- 3. Profiles Table (Standalone UUID PK, independent of auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'STAFF',
    position TEXT,
    vacation_credits NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    sick_credits NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    emergency_credits NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Leave Applications Table
CREATE TABLE public.leave_applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_name TEXT,
    leave_type leave_type NOT NULL,
    other_leave_type TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) NOT NULL,
    reason TEXT,
    status leave_status NOT NULL DEFAULT 'PENDING',
    dss_recommendation TEXT DEFAULT 'RECOMMENDED (PENDING REVIEW)',
    created_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    processed_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_remarks TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Leave Balances Table
CREATE TABLE public.leave_balances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vacation_credits NUMERIC(6,2) NOT NULL DEFAULT 15.00,
    sick_credits NUMERIC(6,2) NOT NULL DEFAULT 15.00,
    emergency_credits NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Audit Logs Table
CREATE TABLE public.audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Performance & Query Indexes (user_id, status, start_date, end_date)
-- Profiles Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Leave Applications Indexes
CREATE INDEX idx_leave_applications_user_id ON public.leave_applications(user_id);
CREATE INDEX idx_leave_applications_status ON public.leave_applications(status);
CREATE INDEX idx_leave_applications_start_date ON public.leave_applications(start_date);
CREATE INDEX idx_leave_applications_end_date ON public.leave_applications(end_date);
CREATE INDEX idx_leave_applications_date_range ON public.leave_applications(start_date, end_date);
CREATE INDEX idx_leave_applications_processed_by ON public.leave_applications(processed_by_admin_id);

-- Leave Balances Indexes
CREATE INDEX idx_leave_balances_user_id ON public.leave_balances(user_id);

-- Audit Logs Indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 8. Audit Trigger Function: Auto-log on Status Transition
CREATE OR REPLACE FUNCTION public.handle_leave_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (user_id, action_type, description, ip_address)
        VALUES (
            NEW.user_id,
            CONCAT('LEAVE_', NEW.status::text),
            CONCAT('Leave Application #', NEW.id, ' (', NEW.leave_type::text, ' - ', NEW.total_days, ' days) status changed from ', OLD.status::text, ' to ', NEW.status::text, '.'),
            '127.0.0.1'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leave_status_update
AFTER UPDATE ON public.leave_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_leave_status_audit();
