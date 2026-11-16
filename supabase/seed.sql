-- ==============================================================================
-- Supabase Seed Data: seed.sql
-- Description: Dummy test records for MHO DSS Leave Portal
-- Roster: 1 Head, 1 Admin, 1 HR, 3 Staff, balances, and sample leave applications
-- ==============================================================================

-- 1. Insert Profiles
-- Constant deterministic UUIDs for relational consistency
INSERT INTO public.profiles (id, full_name, email, role, position, vacation_credits, sick_credits, emergency_credits, is_active)
VALUES 
    -- 1 MHO Head
    ('a0000000-0000-0000-0000-000000000001', 'Dr. Maria Clara Salcedo', 'head@mho.gov.ph', 'MHO_HEAD', 'Municipal Health Officer', 15.00, 15.00, 5.00, true),
    
    -- 1 MHO Admin
    ('a0000000-0000-0000-0000-000000000002', 'Roberto Gomez', 'admin@mho.gov.ph', 'MHO_ADMIN', 'Administrative Officer V', 15.00, 15.00, 5.00, true),
    
    -- 1 LGU HR
    ('a0000000-0000-0000-0000-000000000003', 'Elena Rostata', 'hr@mho.gov.ph', 'LGU_HR', 'Human Resource Management Officer II', 15.00, 15.00, 5.00, true),
    
    -- 3 Staff Members
    ('a0000000-0000-0000-0000-000000000004', 'Juan dela Cruz', 'staff1@mho.gov.ph', 'STAFF', 'Staff Nurse II', 12.00, 15.00, 5.00, true),
    ('a0000000-0000-0000-0000-000000000005', 'Maria Santos', 'staff2@mho.gov.ph', 'STAFF', 'Rural Health Midwife I', 15.00, 13.00, 5.00, true),
    ('a0000000-0000-0000-0000-000000000006', 'Antonio Luna', 'staff3@mho.gov.ph', 'STAFF', 'Medical Technologist I', 15.00, 15.00, 5.00, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Leave Balances
INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 15.00, 15.00, 5.00),
    ('a0000000-0000-0000-0000-000000000002', 15.00, 15.00, 5.00),
    ('a0000000-0000-0000-0000-000000000003', 15.00, 15.00, 5.00),
    ('a0000000-0000-0000-0000-000000000004', 12.00, 15.00, 5.00),
    ('a0000000-0000-0000-0000-000000000005', 15.00, 13.00, 5.00),
    ('a0000000-0000-0000-0000-000000000006', 15.00, 15.00, 5.00)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Insert Leave Applications (With different statuses: PENDING, APPROVED, REJECTED)
INSERT INTO public.leave_applications (
    user_id, 
    employee_name, 
    leave_type, 
    other_leave_type, 
    start_date, 
    end_date, 
    total_days, 
    reason, 
    status, 
    dss_recommendation, 
    created_by_admin_id, 
    processed_by_admin_id, 
    admin_remarks, 
    processed_at, 
    created_at
)
VALUES
    -- Record 1: APPROVED Vacation Leave (Staff 1 - Juan dela Cruz)
    (
        'a0000000-0000-0000-0000-000000000004',
        'Juan dela Cruz',
        'Vacation Leave',
        NULL,
        '2026-11-02',
        '2026-11-04',
        3.0,
        'Annual family gathering in province.',
        'APPROVED',
        'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
        NULL,
        'a0000000-0000-0000-0000-000000000002',
        'Approved. Adequate nursing coverage on duty.',
        '2026-10-28 09:30:00+00',
        '2026-10-25 08:15:00+00'
    ),

    -- Record 2: APPROVED Sick Leave (Staff 2 - Maria Santos)
    (
        'a0000000-0000-0000-0000-000000000005',
        'Maria Santos',
        'Sick Leave',
        NULL,
        '2026-11-10',
        '2026-11-11',
        2.0,
        'Acute gastroenteritis with medical certificate.',
        'APPROVED',
        'RECOMMENDED (Medical certificate presented; balance sufficient)',
        NULL,
        'a0000000-0000-0000-0000-000000000001',
        'Approved for rest and recuperation.',
        '2026-11-10 08:00:00+00',
        '2026-11-09 16:45:00+00'
    ),

    -- Record 3: PENDING Vacation Leave (Staff 3 - Antonio Luna)
    (
        'a0000000-0000-0000-0000-000000000006',
        'Antonio Luna',
        'Vacation Leave',
        NULL,
        '2026-12-01',
        '2026-12-05',
        5.0,
        'Scheduled year-end vacation leave.',
        'PENDING',
        'RECOMMENDED (PENDING REVIEW)',
        NULL,
        NULL,
        NULL,
        NULL,
        '2026-11-15 10:20:00+00'
    ),

    -- Record 4: REJECTED Emergency Leave (Staff 1 - Juan dela Cruz)
    (
        'a0000000-0000-0000-0000-000000000004',
        'Juan dela Cruz',
        'Emergency Leave',
        NULL,
        '2026-11-18',
        '2026-11-19',
        2.0,
        'Personal urgent errand.',
        'REJECTED',
        'Coverage Warning: Approving this leave reduces duty staff below minimum threshold.',
        NULL,
        'a0000000-0000-0000-0000-000000000001',
        'Disapproved due to critical mass vaccination drive on requested dates.',
        '2026-11-16 14:00:00+00',
        '2026-11-16 08:30:00+00'
    ),

    -- Record 5: PENDING Walk-in Leave Filed by Admin for Unregistered/Walk-in Staff
    (
        NULL,
        'Lourdes Mendoza',
        'Special Privilege Leave',
        NULL,
        '2026-12-10',
        '2026-12-11',
        2.0,
        'Personal milestone celebration (Filipino civil service benefit).',
        'PENDING',
        'RECOMMENDED (PENDING REVIEW)',
        'a0000000-0000-0000-0000-000000000002',
        NULL,
        NULL,
        NULL,
        '2026-11-16 11:00:00+00'
    );

-- 4. Audit Log Entries for Approved and Rejected Requests
INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)
VALUES
    (
        'a0000000-0000-0000-0000-000000000004',
        'LEAVE_APPROVED',
        'Leave Application #1 (Vacation Leave - 3.0 days) approved by Administrator Roberto Gomez.',
        '192.168.1.10',
        '2026-10-28 09:30:00+00'
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'LEAVE_APPROVED',
        'Leave Application #2 (Sick Leave - 2.0 days) approved by Dr. Maria Clara Salcedo.',
        '192.168.1.15',
        '2026-11-10 08:00:00+00'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'LEAVE_REJECTED',
        'Leave Application #4 (Emergency Leave - 2.0 days) rejected by Dr. Maria Clara Salcedo. Reason: Vaccination drive coverage.',
        '192.168.1.15',
        '2026-11-16 14:00:00+00'
    );
