# Business Rules & System Decision Logic Audit

This document details every business rule, algorithmic calculation, access gate, and system trigger discovered across the codebase of the Municipal Health Office (MHO) Decision Support System (DSS) Portal.

---

## 1. Core Leave Calculation Rules

### Rule 1.1: Working Days Duration & Weekend Exclusion
- **Description**: Leave duration calculations exclude Saturdays and Sundays. The calculation is inclusive of start and end dates.
- **Implementation**:
  - The date period is iterated with interval `P1D` up to `end_date + 1 day`.
  - Day of week is evaluated via ISO-8601 numeric representation (`format('N')` where 1 = Monday ... 6 = Saturday, 7 = Sunday).
  - Days where `format('N') < 6` (or `!in_array(date->format('N'), [6, 7])`) increment `$total_days`.
  - If `$total_days <= 0`, submission fails with validation error: *"Selected range contains no valid working days."*
- **Citations**:
  - [mho_portal/admin/users.php#L35-L45](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L35-L45)
  - [mho_portal/admin/file_leave.php#L24-L39](file:///C:/commision/mho_dss_portal/mho_portal/admin/file_leave.php#L24-L39)
- **Variation in Legacy Code**:
  - In [mho_portal/leaves/apply.php#L30](file:///C:/commision/mho_dss_portal/mho_portal/leaves/apply.php#L30), the calculation uses standard calendar day difference: `$total_days = $start->diff($end)->days + 1;` without weekend filtering. *(See Ambiguities section).*

---

## 2. Leave Credit & Balance Rules

### Rule 2.1: Default Credit Allocations
- **Description**: When a new user account is provisioned, default initial leave credits are allocated:
  - Vacation Credits: `15.00` days
  - Sick Credits: `15.00` days
  - Emergency Credits: `5.00` days (defaults via fallback or table default)
- **Citations**:
  - [mho_portal/config/users.php#L28-L30](file:///C:/commision/mho_dss_portal/mho_portal/config/users.php#L28-L30)
  - [mho_portal/admin/users.php#L57-L59](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L57-L59)

### Rule 2.2: Available Remaining Balance Calculation
- **Description**: In the administrative view, remaining balances are computed dynamically by taking base credits minus the sum of approved leave days:
  $$\text{Remaining} = \max(0, \text{Base Credits} - \sum \text{total\_days for APPROVED leaves of matching category})$$
- **Citations**:
  - [mho_portal/admin/users.php#L48-L60](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L48-L60)
  - [mho_portal/admin/users.php#L225-L235](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L225-L235)

### Rule 2.3: Over-Draft Prevention on Submission
- **Description**: Filing on behalf of an employee is blocked if the requested duration exceeds the employee's remaining credits for that category:
  - If `leave_type === 'Vacation Leave'` and `total_days > v_remaining` $\rightarrow$ BLOCKED.
  - If `leave_type === 'Sick Leave'` and `total_days > s_remaining` $\rightarrow$ BLOCKED.
  - If `leave_type === 'Emergency Leave'` and `total_days > e_remaining` $\rightarrow$ BLOCKED.
  - Generates error: *"Cannot file application! Requested X day(s) exceeds available remaining balance for [Leave Type]."*
- **Citations**:
  - [mho_portal/admin/users.php#L62-L68](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L62-L68)

### Rule 2.4: Credit Deduction Upon Approval
- **Description**: In the approval queue workflow, when an authorized administrator marks an application as `APPROVED`, leave credits are directly subtracted from the `leave_balances` table within a database transaction:
  - If `leave_type === 'Vacation'`, deduct from `vacation_credits`.
  - If `leave_type === 'Sick'`, deduct from `sick_credits`.
  - Followed by updating `leave_applications.status = 'APPROVED'`.
  - If an exception occurs, the transaction is rolled back.
- **Citations**:
  - [mho_portal/leaves/approval_queue.php#L27-L44](file:///C:/commision/mho_dss_portal/mho_portal/leaves/approval_queue.php#L27-L44)

---

## 3. Decision Support System (DSS) Engine Rules (`engine/dss.php`)

The DSS engine provides rule-based recommendations on leave requests by evaluating two critical constraints: credit adequacy and healthcare staffing coverage.

### Rule 3.1: Leave Credit Adequacy Evaluation (`evaluate_leave_credits`)
- **Inputs**: `$pdo`, `$user_id`, `$leave_type`, `$requested_days`
- **Logic**:
  1. Queries `leave_balances` for `vacation_credits` and `sick_credits` where `user_id = ?`.
  2. If record does not exist: returns `passed => false, message => 'No leave balance record found for this employee.', available => 0`.
  3. Evaluates balance based on `$leave_type`:
     - If `$available >= $requested_days`:
       - `passed => true`
       - `message => "Sufficient {$leave_type} leave balance available ({$available} days remaining)."`
     - If `$available < $requested_days`:
       - `passed => false`
       - `message => "Insufficient {$leave_type} leave balance. Requested: {$requested_days} days, Available: {$available} days."`
- **Citations**:
  - [mho_portal/engine/dss.php#L8-L38](file:///C:/commision/mho_dss_portal/mho_portal/engine/dss.php#L8-L38)

### Rule 3.2: Schedule Conflict & Minimum Duty Staff Coverage (`evaluate_schedule_conflict`)
- **Inputs**: `$pdo`, `$user_id`, `$start_date`, `$end_date`, `$min_required_staff = 2`
- **Logic**:
  1. **User Overlap Check**:
     - Queries if applicant already has an approved leave overlapping the period:
       `user_id = ? AND status = 'APPROVED' AND (start_date <= :end_date AND end_date >= :start_date)`.
     - If count > 0:
       - `passed => false, warning => true, message => 'User already has an approved leave application during this period.'`.
  2. **Concurrent Overlapping Leaves**:
     - Queries distinct staff on approved leave during the same date window:
       `SELECT COUNT(DISTINCT user_id) FROM leave_applications WHERE user_id != ? AND status = 'APPROVED' AND (start_date <= :end_date AND end_date >= :start_date)`.
  3. **Duty Staff Calculation & Threshold (Minimum 2 Staff)**:
     - Fetches total active staff: `SELECT COUNT(*) FROM users WHERE role = 'STAFF'`.
     - Computes projected available duty staff:
       $$\text{projected\_available\_staff} = \text{total\_staff} - \text{overlapping\_leaves} - 1$$
     - *Threshold Evaluation*:
       - If `projected_available_staff < min_required_staff` (where `min_required_staff = 2`):
         - `passed => true`
         - `warning => true`
         - `message => "Coverage Warning: Approving this leave reduces duty staff to {$projected_available_staff} (Minimum threshold: {$min_required_staff})."`
       - If `projected_available_staff >= min_required_staff`:
         - `passed => true`
         - `warning => false`
         - `message => "Schedule check passed. Projected available duty staff: {$projected_available_staff}."`
- **Citations**:
  - [mho_portal/engine/dss.php#L43-L86](file:///C:/commision/mho_dss_portal/mho_portal/engine/dss.php#L43-L86)

### Rule 3.3: Master Recommendation Engine (`dss_evaluate_application`)
- **Inputs**: `$pdo`, `$user_id`, `$leave_type`, `$days`, `$start_date`, `$end_date`
- **Outcome Logic**:
  - Executes `evaluate_leave_credits` and `evaluate_schedule_conflict`.
  - If `credit_eval['passed'] === true` **AND** `schedule_eval['warning'] === false`:
    - Recommendation: **`RECOMMENDED`**
  - Otherwise (if credits insufficient OR coverage warning triggered OR user duplicate exists):
    - Recommendation: **`NEEDS_REVIEW`**
- **Citations**:
  - [mho_portal/engine/dss.php#L91-L103](file:///C:/commision/mho_dss_portal/mho_portal/engine/dss.php#L91-L103)

---

## 4. Audit Trail & Database Trigger Behavior

### Rule 4.1: Automated Database Trigger (`trg_after_leave_status_update`)
- **Trigger Type**: `AFTER UPDATE ON leave_applications FOR EACH ROW`
- **Condition**: Triggers only when `OLD.status <> NEW.status`.
- **Payload Inserted into `audit_logs`**:
  - `user_id`: `NEW.user_id`
  - `action_type`: `CONCAT('LEAVE_', NEW.status)` (e.g. `LEAVE_APPROVED`, `LEAVE_REJECTED`)
  - `description`: `CONCAT('Leave Application #', NEW.id, ' (', NEW.leave_type, ' - ', NEW.total_days, ' days) status changed from ', OLD.status, ' to ', NEW.status, '.')`
  - `ip_address`: `'127.0.0.1'`
- **Citations**:
  - [mho_db/leave_applications.TRG#L2-L18](file:///C:/commision/mho_dss_portal/mho_db/leave_applications.TRG#L2-L18)

### Rule 4.2: Application-Level Audit Logging
- **Description**: In addition to the database trigger, [mho_portal/admin/leave_requests.php](file:///C:/commision/mho_dss_portal/mho_portal/admin/leave_requests.php) executes an explicit insert on status transition:
  - Inserts `user_id` (the approving administrator's ID), `action = "LEAVE_" . $status`, `details = "Admin '[Name]' [STATUS] Leave #[ID] for '[EmpName]' ([Days] days). Remarks: [Remarks]"`, and `created_at = NOW()`.
  - Wrapped in a `try...catch` block to avoid breaking the transaction if the table structure varies.
- **Citations**:
  - [mho_portal/admin/leave_requests.php#L63-L77](file:///C:/commision/mho_dss_portal/mho_portal/admin/leave_requests.php#L63-L77)

---

## 5. Security & Access Control Rules

### Rule 5.1: Session Authentication Gate (`checkAdminAccess` / Role Checks)
- **Session Check**: Unauthenticated requests to administrative pages redirect to `/mho_portal/index.php?error=Unauthorized+access`.
- **Role Restrictions**:
  - `approval_queue.php`: Allowed for `MHO_ADMIN`, `MHO_HEAD`.
  - `audit_logs.php`: Allowed for `MHO_HEAD`.
  - `users.php` (Management): Strictly restricted to `MHO_ADMIN`.
- **Citations**:
  - [mho_portal/config/db.php#L32-L38](file:///C:/commision/mho_dss_portal/mho_portal/config/db.php#L32-L38)
  - [mho_portal/leaves/approval_queue.php#L7-L10](file:///C:/commision/mho_dss_portal/mho_portal/leaves/approval_queue.php#L7-L10)
  - [mho_portal/reports/audit_logs.php#L6-L9](file:///C:/commision/mho_dss_portal/mho_portal/reports/audit_logs.php#L6-L9)
  - [mho_portal/config/users.php#L6-L9](file:///C:/commision/mho_dss_portal/mho_portal/config/users.php#L6-L9)

### Rule 5.2: Self-Healing Default Password Fallback
- **Description**: If a user submits `password123` and bcrypt verification fails against legacy hash data, the system automatically computes a fresh bcrypt hash, updates the database for that user, and allows authentication.
- **Citations**:
  - [mho_portal/index.php#L26-L32](file:///C:/commision/mho_dss_portal/mho_portal/index.php#L26-L32)

---

## 6. Ambiguities & Hidden Behaviors Discovered

During our static codebase audit, several inconsistencies, redundancies, and potential edge-case ambiguities were identified between modules:

### Ambiguity 1: Two Competing Balance Storage Strategies
1. **Dedicated Table (`leave_balances`)**:
   - `leave_balances` contains `user_id`, `vacation_credits`, and `sick_credits`.
   - Used by `leaves/apply.php` and `leaves/approval_queue.php`.
   - Approving a leave directly deducts from `leave_balances` using SQL `UPDATE leave_balances SET vacation_credits = vacation_credits - ?`.
2. **User Columns + Dynamic Calculation (`users` table)**:
   - In `admin/users.php`, the table `users` contains `vacation_credits`, `sick_credits`, and `emergency_credits`.
   - Instead of reading from `leave_balances` or decrementing on approval, it computes remaining credits dynamically:
     `remaining = users.vacation_credits - SUM(APPROVED leave_applications.total_days)`.
3. **Migration Impact**:
   - If both mechanisms coexist without synchronization, balances will diverge. Approving in `approval_queue.php` decrements `leave_balances`, while `admin/users.php` will double-count or ignore it depending on where it looks.
   - **Recommendation for Supabase**: Standardize on a single source of truth: maintain `base_vacation_credits`, `base_sick_credits`, `base_emergency_credits` in `profiles`, and compute consumed credits via a Postgres View or RPC, or maintain an explicit ledger.

### Ambiguity 2: Inconsistent Weekend Exclusion Calculation
- In [mho_portal/admin/file_leave.php#L28-L37](file:///C:/commision/mho_dss_portal/mho_portal/admin/file_leave.php#L28-L37) and [mho_portal/admin/users.php#L35-L42](file:///C:/commision/mho_dss_portal/mho_portal/admin/users.php#L35-L42), weekend days (Saturdays and Sundays) are strictly excluded from `total_days`.
- In [mho_portal/leaves/apply.php#L30](file:///C:/commision/mho_dss_portal/mho_portal/leaves/apply.php#L30), the applicant form uses raw calendar difference: `$start->diff($end)->days + 1`, which mistakenly includes weekends.
- **Migration Impact**: Must unify business logic into a single TypeScript utility function or Postgres function so all leaves calculate working days excluding weekends.

### Ambiguity 3: Unregistered "Walk-In" Personnel Filing
- In `admin/file_leave.php`, leave applications can be filed for personnel without an existing `users` record (`user_id = NULL`, `employee_name = '...'`).
- The trigger `trg_after_leave_status_update` assigns `NEW.user_id` to `audit_logs.user_id`. If `audit_logs.user_id` has a foreign key constraint to `users.id`, inserting a walk-in leave status change could trigger a foreign key violation unless nullable.
- In `admin/leave_requests.php#L137-L148`, the past history query performs a fallback check on `employee_name`:
  `(? IS NOT NULL AND user_id = ?) OR (employee_name = ?)`.
- **Migration Impact**: In Supabase, `user_id` on `leave_applications` must remain nullable to support walk-ins/paper records, and `employee_name` must be populated.

### Ambiguity 4: Duplicate Files for User Management
- The project has two separate files handling user records:
  - `mho_portal/config/users.php`: Older script with user creation (`action_create`) and updating (`action_update`).
  - `mho_portal/admin/users.php`: Newer script containing direct filing modals, search, and dynamic balance calculations.
- **Migration Impact**: Consolidate these into a unified `PersonnelDirectoryScreen` in React.

### Ambiguity 5: Schema Discrepancy in `audit_logs` Columns
- In `leave_applications.TRG` and `reports/audit_logs.php`, the columns are `action_type`, `description`, `ip_address`, `created_at`.
- In `admin/leave_requests.php#L65`, the manual insert references `action` and `details`.
- **Migration Impact**: Harmonize the Supabase table schema to use standard column names: `action`, `details`, `ip_address`, `created_at`.
