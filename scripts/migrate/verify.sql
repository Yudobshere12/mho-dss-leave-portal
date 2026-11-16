-- ==============================================================================
-- scripts/migrate/verify.sql
-- Verification & Data Integrity Script for MHO DSS Migration
-- Checks:
-- 1. Table Row Counts & Distributions
-- 2. Foreign Key Integrity (Zero Orphaned Records)
-- 3. Enum & Domain Constraints
-- 4. Not-Null and Value Ranges Check
-- ==============================================================================

\echo '------------------------------------------------------------'
\echo '1. Table Row Counts'
\echo '------------------------------------------------------------'

SELECT 
    'public.profiles' AS table_name, 
    COUNT(*) AS total_rows 
FROM public.profiles
UNION ALL
SELECT 
    'public.leave_balances' AS table_name, 
    COUNT(*) AS total_rows 
FROM public.leave_balances
UNION ALL
SELECT 
    'public.leave_applications' AS table_name, 
    COUNT(*) AS total_rows 
FROM public.leave_applications
UNION ALL
SELECT 
    'public.audit_logs' AS table_name, 
    COUNT(*) AS total_rows 
FROM public.audit_logs;

\echo '------------------------------------------------------------'
\echo '2. Role & Status Breakdown'
\echo '------------------------------------------------------------'

SELECT role, COUNT(*) AS count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

SELECT status, COUNT(*) AS count
FROM public.leave_applications
GROUP BY status
ORDER BY count DESC;

\echo '------------------------------------------------------------'
\echo '3. Foreign Key Integrity Checks (Expected: 0 orphans)'
\echo '------------------------------------------------------------'

-- Check 3.1: Leave Balances pointing to non-existent profiles
SELECT 
    'leave_balances.user_id -> profiles.id' AS fk_constraint,
    COUNT(*) AS orphaned_records
FROM public.leave_balances lb
LEFT JOIN public.profiles p ON lb.user_id = p.id
WHERE p.id IS NULL;

-- Check 3.2: Leave Applications pointing to non-existent profiles
SELECT 
    'leave_applications.user_id -> profiles.id' AS fk_constraint,
    COUNT(*) AS orphaned_records
FROM public.leave_applications la
LEFT JOIN public.profiles p ON la.user_id = p.id
WHERE la.user_id IS NOT NULL AND p.id IS NULL;

-- Check 3.3: Leave Applications created_by_admin_id pointing to non-existent profiles
SELECT 
    'leave_applications.created_by_admin_id -> profiles.id' AS fk_constraint,
    COUNT(*) AS orphaned_records
FROM public.leave_applications la
LEFT JOIN public.profiles p ON la.created_by_admin_id = p.id
WHERE la.created_by_admin_id IS NOT NULL AND p.id IS NULL;

-- Check 3.4: Leave Applications processed_by_admin_id pointing to non-existent profiles
SELECT 
    'leave_applications.processed_by_admin_id -> profiles.id' AS fk_constraint,
    COUNT(*) AS orphaned_records
FROM public.leave_applications la
LEFT JOIN public.profiles p ON la.processed_by_admin_id = p.id
WHERE la.processed_by_admin_id IS NOT NULL AND p.id IS NULL;

-- Check 3.5: Audit Logs pointing to non-existent profiles
SELECT 
    'audit_logs.user_id -> profiles.id' AS fk_constraint,
    COUNT(*) AS orphaned_records
FROM public.audit_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE al.user_id IS NOT NULL AND p.id IS NULL;

\echo '------------------------------------------------------------'
\echo '4. Business & Logical Consistency Checks'
\echo '------------------------------------------------------------'

-- Check 4.1: End Date prior to Start Date
SELECT 
    'Invalid Date Range (end_date < start_date)' AS rule_check,
    COUNT(*) AS violation_count
FROM public.leave_applications
WHERE end_date < start_date;

-- Check 4.2: Total Days non-positive
SELECT 
    'Invalid Duration (total_days <= 0)' AS rule_check,
    COUNT(*) AS violation_count
FROM public.leave_applications
WHERE total_days <= 0;

-- Check 4.3: Profiles with null email or full name
SELECT 
    'Missing Required Profile Attributes' AS rule_check,
    COUNT(*) AS violation_count
FROM public.profiles
WHERE email IS NULL OR full_name IS NULL OR full_name = '';

\echo '------------------------------------------------------------'
\echo 'Verification queries complete.'
\echo '------------------------------------------------------------'
