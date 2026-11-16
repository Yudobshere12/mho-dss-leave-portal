-- ==============================================================================
-- Transformed Postgres Data Migration Script
-- Source: Legacy MySQL (mho_db)
-- Target: Supabase / PostgreSQL (public schema)
-- Notice: Password hashes omitted. Types and UUID foreign keys converted.
-- ==============================================================================

-- Temporarily disable status audit trigger to avoid redundant log generation
ALTER TABLE public.leave_applications DISABLE TRIGGER trg_leave_status_update;

-- 1. Profiles
INSERT INTO public.profiles (id, full_name, email, role, position, vacation_credits, sick_credits, emergency_credits, is_active, created_at, updated_at)
VALUES
    ('17077ada-4e88-5b7c-a0bd-bf052f22d807', 'Dr. Maria Clara Salcedo', 'head@mho.gov.ph', 'MHO_HEAD', 'Municipal Health Officer', 15.00, 15.00, 5.00, TRUE, '2026-01-10 08:00:00+00', '2026-01-10 08:00:00+00'),
    ('b6dffe6a-b002-5dbe-8ca1-a73bd229dd53', 'Roberto Gomez', 'admin@mho.gov.ph', 'MHO_ADMIN', 'Administrative Officer V', 15.00, 15.00, 5.00, TRUE, '2026-01-12 08:30:00+00', '2026-01-12 08:30:00+00'),
    ('98d4f74f-0b5d-5997-8009-e41a5e3c9041', 'Elena Rostata', 'hr@mho.gov.ph', 'LGU_HR', 'Human Resource Management Officer II', 15.00, 15.00, 5.00, TRUE, '2026-01-15 09:00:00+00', '2026-01-15 09:00:00+00'),
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 'Juan dela Cruz', 'staff1@mho.gov.ph', 'STAFF', 'Staff Nurse II', 12.00, 15.00, 5.00, TRUE, '2026-02-01 08:00:00+00', '2026-02-01 08:00:00+00'),
    ('0b2f99ab-3a76-5ca0-9d2f-fc617d2c2302', 'Maria Santos', 'staff2@mho.gov.ph', 'STAFF', 'Rural Health Midwife I', 15.00, 13.00, 5.00, TRUE, '2026-02-05 08:15:00+00', '2026-02-05 08:15:00+00'),
    ('ccfe4940-66d8-55b0-9b69-e990334f80b1', 'Antonio Luna', 'staff3@mho.gov.ph', 'STAFF', 'Medical Technologist I', 15.00, 15.00, 5.00, TRUE, '2026-02-10 08:30:00+00', '2026-02-10 08:30:00+00')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    vacation_credits = EXCLUDED.vacation_credits,
    sick_credits = EXCLUDED.sick_credits,
    emergency_credits = EXCLUDED.emergency_credits,
    is_active = EXCLUDED.is_active;

-- 2. Leave Balances
INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits, updated_at)
VALUES
    ('17077ada-4e88-5b7c-a0bd-bf052f22d807', 15.00, 15.00, 5.00, '2026-01-10 08:00:00+00'),
    ('b6dffe6a-b002-5dbe-8ca1-a73bd229dd53', 15.00, 15.00, 5.00, '2026-01-12 08:30:00+00'),
    ('98d4f74f-0b5d-5997-8009-e41a5e3c9041', 15.00, 15.00, 5.00, '2026-01-15 09:00:00+00'),
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 12.00, 15.00, 5.00, '2026-10-28 09:30:00+00'),
    ('0b2f99ab-3a76-5ca0-9d2f-fc617d2c2302', 15.00, 13.00, 5.00, '2026-11-10 08:00:00+00'),
    ('ccfe4940-66d8-55b0-9b69-e990334f80b1', 15.00, 15.00, 5.00, '2026-02-10 08:30:00+00')
ON CONFLICT (user_id) DO UPDATE SET
    vacation_credits = EXCLUDED.vacation_credits,
    sick_credits = EXCLUDED.sick_credits,
    emergency_credits = EXCLUDED.emergency_credits,
    updated_at = EXCLUDED.updated_at;

-- 3. Leave Applications
INSERT INTO public.leave_applications (user_id, employee_name, leave_type, other_leave_type, start_date, end_date, total_days, reason, status, dss_recommendation, created_by_admin_id, processed_by_admin_id, admin_remarks, processed_at, created_at)
VALUES
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 'Juan dela Cruz', 'Vacation Leave', NULL, '2026-11-02', '2026-11-04', 3.0, 'Annual family gathering in province.', 'APPROVED', 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)', NULL, 'b6dffe6a-b002-5dbe-8ca1-a73bd229dd53', 'Approved. Adequate nursing coverage on duty.', '2026-10-28 09:30:00+00', '2026-10-25 08:15:00+00'),
    ('0b2f99ab-3a76-5ca0-9d2f-fc617d2c2302', 'Maria Santos', 'Sick Leave', NULL, '2026-11-10', '2026-11-11', 2.0, 'Acute gastroenteritis with medical certificate.', 'APPROVED', 'RECOMMENDED (Medical certificate presented; balance sufficient)', NULL, '17077ada-4e88-5b7c-a0bd-bf052f22d807', 'Approved for rest and recuperation.', '2026-11-10 08:00:00+00', '2026-11-09 16:45:00+00'),
    ('ccfe4940-66d8-55b0-9b69-e990334f80b1', 'Antonio Luna', 'Vacation Leave', NULL, '2026-12-01', '2026-12-05', 5.0, 'Scheduled year-end vacation leave.', 'PENDING', 'RECOMMENDED (PENDING REVIEW)', NULL, NULL, NULL, NULL, '2026-11-15 10:20:00+00'),
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 'Juan dela Cruz', 'Emergency Leave', NULL, '2026-11-18', '2026-11-19', 2.0, 'Personal urgent errand.', 'REJECTED', 'Coverage Warning: Approving this leave reduces duty staff below minimum threshold.', NULL, '17077ada-4e88-5b7c-a0bd-bf052f22d807', 'Disapproved due to critical mass vaccination drive on requested dates.', '2026-11-16 14:00:00+00', '2026-11-16 08:30:00+00'),
    (NULL, 'Lourdes Mendoza', 'Special Privilege Leave', NULL, '2026-12-10', '2026-12-11', 2.0, 'Personal milestone celebration.', 'PENDING', 'RECOMMENDED (PENDING REVIEW)', 'b6dffe6a-b002-5dbe-8ca1-a73bd229dd53', NULL, NULL, NULL, '2026-11-16 11:00:00+00');

-- 4. Audit Logs
INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
VALUES
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 'LEAVE_APPROVED', 'Leave Application #1 (Vacation Leave - 3.0 days) approved by Administrator Roberto Gomez.', '192.168.1.10', '2026-10-28 09:30:00+00'),
    ('0b2f99ab-3a76-5ca0-9d2f-fc617d2c2302', 'LEAVE_APPROVED', 'Leave Application #2 (Sick Leave - 2.0 days) approved by Dr. Maria Clara Salcedo.', '192.168.1.15', '2026-11-10 08:00:00+00'),
    ('305f4b3b-a1a6-5644-a282-43b38180a6cd', 'LEAVE_REJECTED', 'Leave Application #4 (Emergency Leave - 2.0 days) rejected by Dr. Maria Clara Salcedo.', '192.168.1.15', '2026-11-16 14:00:00+00');

-- Re-enable status audit trigger
ALTER TABLE public.leave_applications ENABLE TRIGGER trg_leave_status_update;
