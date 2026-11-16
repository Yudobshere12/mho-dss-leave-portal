-- ==============================================================================
-- Migration: 0003_dev_access.sql
-- Description: Enables Row-Level Security (RLS) on all tables with permissive
--              anonymous policies for early frontend development and testing.
--
-- WARNING:
-- ==============================================================================
-- TEMPORARY - REPLACE IN AUTH PHASE
-- These policies grant public / anon access for development purposes while
-- Supabase Auth and JWT session integration are deferred.
-- DO NOT deploy to production without replacing with strict role-based policies!
-- See docs/auth-phase-todo.md for full replacement requirements.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on All Public Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Profiles (TEMPORARY PERMISSIVE DEV POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_delete" ON public.profiles;

CREATE POLICY "DEV_TEMP_anon_profiles_select"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "DEV_TEMP_anon_profiles_insert"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_profiles_update"
ON public.profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_profiles_delete"
ON public.profiles
FOR DELETE
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 3. Leave Applications (TEMPORARY PERMISSIVE DEV POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_select" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_insert" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_update" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_delete" ON public.leave_applications;

CREATE POLICY "DEV_TEMP_anon_leave_applications_select"
ON public.leave_applications
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "DEV_TEMP_anon_leave_applications_insert"
ON public.leave_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_leave_applications_update"
ON public.leave_applications
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_leave_applications_delete"
ON public.leave_applications
FOR DELETE
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 4. Leave Balances (TEMPORARY PERMISSIVE DEV POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_insert" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_update" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_delete" ON public.leave_balances;

CREATE POLICY "DEV_TEMP_anon_leave_balances_select"
ON public.leave_balances
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "DEV_TEMP_anon_leave_balances_insert"
ON public.leave_balances
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_leave_balances_update"
ON public.leave_balances
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_leave_balances_delete"
ON public.leave_balances
FOR DELETE
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 5. Audit Logs (TEMPORARY PERMISSIVE DEV POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_delete" ON public.audit_logs;

CREATE POLICY "DEV_TEMP_anon_audit_logs_select"
ON public.audit_logs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "DEV_TEMP_anon_audit_logs_insert"
ON public.audit_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_audit_logs_update"
ON public.audit_logs
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_audit_logs_delete"
ON public.audit_logs
FOR DELETE
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 6. System Settings (TEMPORARY PERMISSIVE DEV POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_insert" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_update" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_delete" ON public.system_settings;

CREATE POLICY "DEV_TEMP_anon_system_settings_select"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "DEV_TEMP_anon_system_settings_insert"
ON public.system_settings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_system_settings_update"
ON public.system_settings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV_TEMP_anon_system_settings_delete"
ON public.system_settings
FOR DELETE
TO anon, authenticated
USING (true);
