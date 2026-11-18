-- ==============================================================================
-- Sample Legacy MySQL Data Dump (Anonymized & Dummy Data Only)
-- Schema matches legacy mho_db tables: users, leave_balances, leave_applications, audit_logs
-- NOTE: Never commit real employee data or credentials.
-- ==============================================================================

-- Table: users
INSERT INTO users (id, username, email, password, full_name, role, position, vacation_credits, sick_credits, emergency_credits, is_active, created_at) VALUES
(1, 'msalcedo', 'head@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashhead', 'Dr. Maria Clara Salcedo', 'MHO_HEAD', 'Municipal Health Officer', 15.00, 15.00, 5.00, 1, '2026-01-10 08:00:00'),
(2, 'rgomez', 'admin@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashadmin', 'Roberto Gomez', 'MHO_ADMIN', 'Administrative Officer V', 15.00, 15.00, 5.00, 1, '2026-01-12 08:30:00'),
(3, 'erostata', 'hr@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashhr', 'Elena Rostata', 'STAFF', 'Administrative Assistant II', 15.00, 15.00, 5.00, 1, '2026-01-15 09:00:00'),
(4, 'jdelacruz', 'staff1@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashstaff1', 'Juan dela Cruz', 'STAFF', 'Staff Nurse II', 12.00, 15.00, 5.00, 1, '2026-02-01 08:00:00'),
(5, 'msantos', 'staff2@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashstaff2', 'Maria Santos', 'STAFF', 'Rural Health Midwife I', 15.00, 13.00, 5.00, 1, '2026-02-05 08:15:00'),
(6, 'aluna', 'staff3@mho.gov.ph', '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashstaff3', 'Antonio Luna', 'STAFF', 'Medical Technologist I', 15.00, 15.00, 5.00, 1, '2026-02-10 08:30:00');

-- Table: leave_balances
INSERT INTO leave_balances (id, user_id, vacation_credits, sick_credits, updated_at) VALUES
(1, 1, 15.00, 15.00, '2026-01-10 08:00:00'),
(2, 2, 15.00, 15.00, '2026-01-12 08:30:00'),
(3, 3, 15.00, 15.00, '2026-01-15 09:00:00'),
(4, 4, 12.00, 15.00, '2026-10-28 09:30:00'),
(5, 5, 15.00, 13.00, '2026-11-10 08:00:00'),
(6, 6, 15.00, 15.00, '2026-02-10 08:30:00');

-- Table: leave_applications
INSERT INTO leave_applications (id, user_id, employee_name, leave_type, other_leave_type, start_date, end_date, total_days, reason, status, dss_recommendation, created_by_admin_id, processed_by_admin_id, admin_remarks, processed_at, created_at) VALUES
(1, 4, 'Juan dela Cruz', 'Vacation Leave', NULL, '2026-11-02', '2026-11-04', 3.0, 'Annual family gathering in province.', 'APPROVED', 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)', NULL, 2, 'Approved. Adequate nursing coverage on duty.', '2026-10-28 09:30:00', '2026-10-25 08:15:00'),
(2, 5, 'Maria Santos', 'Sick Leave', NULL, '2026-11-10', '2026-11-11', 2.0, 'Acute gastroenteritis with medical certificate.', 'APPROVED', 'RECOMMENDED (Medical certificate presented; balance sufficient)', NULL, 1, 'Approved for rest and recuperation.', '2026-11-10 08:00:00', '2026-11-09 16:45:00'),
(3, 6, 'Antonio Luna', 'Vacation Leave', NULL, '2026-12-01', '2026-12-05', 5.0, 'Scheduled year-end vacation leave.', 'PENDING', 'RECOMMENDED (PENDING REVIEW)', NULL, NULL, NULL, NULL, '2026-11-15 10:20:00'),
(4, 4, 'Juan dela Cruz', 'Emergency Leave', NULL, '2026-11-18', '2026-11-19', 2.0, 'Personal urgent errand.', 'REJECTED', 'Coverage Warning: Approving this leave reduces duty staff below minimum threshold.', NULL, 1, 'Disapproved due to critical mass vaccination drive on requested dates.', '2026-11-16 14:00:00', '2026-11-16 08:30:00'),
(5, NULL, 'Lourdes Mendoza', 'Special Privilege Leave', NULL, '2026-12-10', '2026-12-11', 2.0, 'Personal milestone celebration.', 'PENDING', 'RECOMMENDED (PENDING REVIEW)', 2, NULL, NULL, NULL, '2026-11-16 11:00:00');

-- Table: audit_logs
INSERT INTO audit_logs (id, user_id, action_type, description, ip_address, created_at) VALUES
(1, 4, 'LEAVE_APPROVED', 'Leave Application #1 (Vacation Leave - 3.0 days) approved by Administrator Roberto Gomez.', '192.168.1.10', '2026-10-28 09:30:00'),
(2, 5, 'LEAVE_APPROVED', 'Leave Application #2 (Sick Leave - 2.0 days) approved by Dr. Maria Clara Salcedo.', '192.168.1.15', '2026-11-10 08:00:00'),
(3, 4, 'LEAVE_REJECTED', 'Leave Application #4 (Emergency Leave - 2.0 days) rejected by Dr. Maria Clara Salcedo.', '192.168.1.15', '2026-11-16 14:00:00');
