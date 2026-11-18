# Page Map: PHP Architecture to React + Vite + Supabase Routes

This document provides a mapping of every PHP page within the legacy Municipal Health Office (MHO) Decision Support System (DSS) portal to a proposed React + Vite + Supabase route, along with role access permissions, target component hierarchy, and functional specifications.

---

## 1. System Role Matrix

The legacy portal identifies four distinct user roles, plus unauthenticated guest access:

| Role Identifier | Title / Responsibility | Capabilities |
| :--- | :--- | :--- |
| **GUEST** | Unauthenticated Visitor | Access login / entry screen only. |
| **STAFF** | Regular Health Personnel | File personal leave applications; view personal balance & submission status. |
| **MHO_ADMIN** | System & User Administrator | File leave on behalf of personnel; manage accounts; view audit logs; review & decide on leaves. |
| **MHO_HEAD** | Office Head / Executive Sign-off | Access leave approval queue with DSS advisory metrics; approve/reject applications; view audit logs. |

---

## 2. Route & Screen Mapping Table

| Legacy PHP File | Proposed React Route (`react-router-dom`) | Target Screen / Component | Authorized Roles | Description & Key Features |
| :--- | :--- | :--- | :--- | :--- |
| `index.php` | `/login` | `LoginScreen.tsx` | `Public (Unauthenticated)` | Single sign-in interface supporting email/username and password. In Supabase, backed by `supabase.auth.signInWithPassword()`. Session redirect routes user to appropriate dashboard based on role. |
| `auth/login.php` | `/login` | N/A (Alias redirect) | `Public` | Legacy alias that redirects to `index.php`. Replaced by React Router redirect `<Navigate to="/login" replace />`. |
| `auth/logout.php` | N/A (Client Action) | `HeaderUserMenu.tsx` / `useAuth().signOut()` | `STAFF`, `MHO_ADMIN`, `MHO_HEAD` | Invokes `supabase.auth.signOut()`, purges local cache/tokens, and redirects to `/login`. |
| `dashboard.php` | `/` or `/dashboard` | `ExecutiveDashboard.tsx` | `STAFF`, `MHO_ADMIN`, `MHO_HEAD` | Executive analytics overview: stat metric cards (Pending, Approved, Rejected, Total), Chart.js/Recharts doughnut distribution by leave category, and list of 5 most recent filings. |
| `leaves/apply.php` | `/leaves/apply` | `ApplyLeaveScreen.tsx` | `STAFF`, `MHO_ADMIN`, `MHO_HEAD` | Employee self-service leave submission. Form fields: Leave Type (`Vacation`, `Sick`), Start Date, End Date, Reason. Features client/server DSS pre-flight validation for balance adequacy and overlap warnings. |
| `leaves/approval_queue.php` | `/approvals` | `ApprovalQueueScreen.tsx` | `MHO_HEAD` | Real-time Decision Support System (DSS) evaluation queue. Displays applicant details alongside DSS badges (`RECOMMENDED FOR APPROVAL` vs `NEEDS REVIEW / CAUTION`) with rule checks (balance check and duty staff coverage >= 2). Includes Approve and Reject action triggers. |
| `admin/leave_requests.php` | `/admin/leaves` | `LeaveMonitorHub.tsx` | `MHO_ADMIN`, `MHO_HEAD` | Multi-view leave monitoring hub. Tab 1: Tabular queue with multi-criteria filters (Search Name, Category, Status, Date Range), modal inspection of applicant history, and inline Approve/Reject. Tab 2: FullCalendar schedule visualization of approved leaves. Also provides CSV export. |
| `admin/file_leave.php` | `/admin/leaves/file` | `AdminFileLeaveScreen.tsx` | `MHO_ADMIN` | Administrator form to file leave on behalf of any personnel (including walk-ins/unregistered staff with explicit null user IDs). Computes working duration excluding weekends. |
| `admin/users.php` | `/admin/personnel` | `PersonnelDirectoryScreen.tsx` | `MHO_ADMIN`, `MHO_HEAD` | Comprehensive personnel and leave credit management. Shows allocated vs used vs remaining balances (VL, SL, EL), availability badges, and a modal to directly file on behalf of an employee. Also supports creating/editing employee credentials and roles. |
| `config/users.php` | `/admin/users` | `UserManagementScreen.tsx` | `MHO_ADMIN` | Administrative user provisioning screen: create new user accounts with password hashing, assign roles (`STAFF`, `MHO_ADMIN`, `MHO_HEAD`), update status (`Active` / `Deactivate`), and automatically initialize default credits (15.00 VL, 15.00 SL). Can be unified with `PersonnelDirectoryScreen.tsx` as tabs. |
| `reports/audit_logs.php` | `/reports/audit-logs` | `AuditLogsScreen.tsx` | `MHO_HEAD` | System activity and transaction audit log trail. Displays summary stat cards (Approved, Pending, Rejected) and a paginated, printable audit table tracking timestamp, actor, role, action type, and descriptions. |
| `reset_passwords.php` | N/A (Dev Utility / Seed Script) | `supabase/seed.sql` | `None (Excluded in production)` | Emergency credential reset utility used for local PHP setups. Replaced by Supabase SQL seed migration script or Supabase Admin Auth API. |

---

## 3. Recommended Frontend Architecture (React + Vite)

### Layout & Navigation Structure
- **Public Layout**: Bare container centered on card (for `/login`).
- **Protected Layout** (`AppLayout.tsx`):
  - **Sidebar**:
    - *Main Navigation*: Dashboard (`/dashboard`), Leave Monitor (`/admin/leaves`), Approval Queue (`/approvals`), Apply for Leave (`/leaves/apply`).
    - *Management Section (Admins/HR)*: File Leave Request (`/admin/leaves/file`), Personnel Records (`/admin/personnel`), Audit Logs (`/reports/audit-logs`).
  - **Top Navigation Bar**: Display current user full name, active role badge (e.g. `MHO_ADMIN Console`), and user dropdown with Sign Out.
  - **Route Guard / Role-Based Access Control (RBAC)**: Higher-order wrapper `<ProtectedRoute allowedRoles={[...]} />` verifying Supabase session role and redirecting unauthorized users.
