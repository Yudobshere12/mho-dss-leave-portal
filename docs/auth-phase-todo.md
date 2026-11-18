# Supabase Auth Phase & Role-Based Security Migration Checklist

This document specifies the exact transition requirements for moving from the temporary permissive development Row-Level Security (RLS) policies in [`supabase/migrations/0003_dev_access.sql`](file:///C:/mho/mho-dss-leave-portal/supabase/migrations/0003_dev_access.sql) to production role-based policies once Supabase Auth is integrated.

---

## 1. Overview & Security Goals

- **Current State**: Auth is deferred. All public tables (`profiles`, `leave_applications`, `leave_balances`, `audit_logs`, `system_settings`) have RLS enabled with permissive development policies (`USING (true)` / `WITH CHECK (true)` for `anon` and `authenticated`).
- **Target State**:
  - `auth.users` manages sign-ins and JWTs.
  - `public.profiles.id` is linked to `auth.users.id`.
  - Strict role isolation:
    - **STAFF**: Can only view and edit their own profile, submit leave applications for themselves, view their own leave records and balances. Cannot alter decisions or read full audit logs.
    - **MHO_ADMIN**, **MHO_HEAD**: Can view all employee records, review and update application decisions (`APPROVED` / `REJECTED`), file on behalf of personnel (ADMIN), view credit ledgers, manage system settings, and inspect system audit logs (HEAD).

---

## 2. Prerequisites for the Auth Phase

Before dropping temporary policies, execute the following database adjustments:

1. **Link `public.profiles` to `auth.users`**:
   ```sql
   ALTER TABLE public.profiles
   ADD CONSTRAINT fk_profiles_auth_users
   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```
2. **Setup User Registration Trigger (`handle_new_user`)**:
   Automatically provisions a `public.profiles` and `public.leave_balances` row when a user signs up through Supabase Auth:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
       INSERT INTO public.profiles (id, full_name, email, role, position)
       VALUES (
           NEW.id,
           COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Employee'),
           NEW.email,
           COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'STAFF'::public.user_role),
           NEW.raw_user_meta_data->>'position'
       );

       INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits)
       VALUES (NEW.id, 15.00, 15.00, 5.00);

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
3. **Helper Function for Role Extraction**:
   Optimizes RLS evaluation without recursive query loops:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_current_user_role()
   RETURNS public.user_role AS $$
       SELECT role FROM public.profiles WHERE id = auth.uid();
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

---

## 3. Temporary Policies to Drop

Drop all temporary development policies across public tables:

```sql
-- Profiles
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "DEV_TEMP_anon_profiles_delete" ON public.profiles;

-- Leave Applications
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_select" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_insert" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_update" ON public.leave_applications;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_applications_delete" ON public.leave_applications;

-- Leave Balances
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_insert" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_update" ON public.leave_balances;
DROP POLICY IF EXISTS "DEV_TEMP_anon_leave_balances_delete" ON public.leave_balances;

-- Audit Logs
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "DEV_TEMP_anon_audit_logs_delete" ON public.audit_logs;

-- System Settings
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_insert" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_update" ON public.system_settings;
DROP POLICY IF EXISTS "DEV_TEMP_anon_system_settings_delete" ON public.system_settings;
```

---

## 4. Production Role-Based RLS Policies Specification

### 4.1. Table: `public.profiles`

| Operation | Policy Name | Permitted Roles | SQL Definition |
| :--- | :--- | :--- | :--- |
| **SELECT** | `"Profiles view policy"` | Staff (self), Admin, Head | `auth.uid() = id OR public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')` |
| **INSERT** | `"Profiles insert policy"` | Admin, System Trigger | `public.get_current_user_role() = 'MHO_ADMIN'` |
| **UPDATE** | `"Profiles update policy"` | Staff (own contact/profile), Admin | `(auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())) OR public.get_current_user_role() = 'MHO_ADMIN'` |
| **DELETE** | `"Profiles delete policy"` | Admin | `public.get_current_user_role() = 'MHO_ADMIN'` |

```sql
CREATE POLICY "Profiles view policy" ON public.profiles
FOR SELECT TO authenticated
USING (
    auth.uid() = id OR 
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

CREATE POLICY "Profiles update policy" ON public.profiles
FOR UPDATE TO authenticated
USING (
    auth.uid() = id OR 
    public.get_current_user_role() = 'MHO_ADMIN'
)
WITH CHECK (
    -- Prevent non-admins from promoting their own role
    (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())) OR
    public.get_current_user_role() = 'MHO_ADMIN'
);
```

---

### 4.2. Table: `public.leave_applications`

| Operation | Policy Name | Permitted Roles | SQL Definition |
| :--- | :--- | :--- | :--- |
| **SELECT** | `"Leave applications select policy"` | Staff (own records), Admin, Head | `auth.uid() = user_id OR public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')` |
| **INSERT** | `"Leave applications insert policy"` | Staff (for self), Admin (on-behalf) | `auth.uid() = user_id OR public.get_current_user_role() = 'MHO_ADMIN'` |
| **UPDATE** | `"Leave applications decision policy"`| Admin, Head | `public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')` |
| **DELETE** | `"Leave applications delete policy"`| Admin | `public.get_current_user_role() = 'MHO_ADMIN'` |

```sql
CREATE POLICY "Leave applications select policy" ON public.leave_applications
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id OR 
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

CREATE POLICY "Leave applications insert policy" ON public.leave_applications
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id OR 
    public.get_current_user_role() = 'MHO_ADMIN'
);

CREATE POLICY "Leave applications decision policy" ON public.leave_applications
FOR UPDATE TO authenticated
USING (
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);
```

---

### 4.3. Table: `public.leave_balances`

| Operation | Policy Name | Permitted Roles | SQL Definition |
| :--- | :--- | :--- | :--- |
| **SELECT** | `"Leave balances select policy"` | Staff (own balance), Admin, Head | `auth.uid() = user_id OR public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')` |
| **INSERT** | `"Leave balances insert policy"` | Admin | `public.get_current_user_role() = 'MHO_ADMIN'` |
| **UPDATE** | `"Leave balances update policy"` | Admin (credit adjustments / approval workflow) | `public.get_current_user_role() = 'MHO_ADMIN'` |
| **DELETE** | `"Leave balances delete policy"` | Admin | `public.get_current_user_role() = 'MHO_ADMIN'` |

```sql
CREATE POLICY "Leave balances select policy" ON public.leave_balances
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id OR 
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);

CREATE POLICY "Leave balances update policy" ON public.leave_balances
FOR UPDATE TO authenticated
USING (
    public.get_current_user_role() = 'MHO_ADMIN'
);
```

---

### 4.4. Table: `public.audit_logs`

| Operation | Policy Name | Permitted Roles | SQL Definition |
| :--- | :--- | :--- | :--- |
| **SELECT** | `"Audit logs select policy"` | Head only | `public.get_current_user_role() = 'MHO_HEAD'` |
| **INSERT** | `"Audit logs insert policy"` | Authenticated or Triggers (`SECURITY DEFINER`) | `true` (Trigger-driven) |
| **UPDATE** | *None* | Disallowed (Immutable audit log) | *No policy created* |
| **DELETE** | *None* | Disallowed (Immutable audit log) | *No policy created* |

```sql
CREATE POLICY "Audit logs select policy" ON public.audit_logs
FOR SELECT TO authenticated
USING (
    public.get_current_user_role() = 'MHO_HEAD'
);
```

---

### 4.5. Table: `public.system_settings`

| Operation | Policy Name | Permitted Roles | SQL Definition |
| :--- | :--- | :--- | :--- |
| **SELECT** | `"System settings select policy"` | All Authenticated Users | `true` |
| **ALL / WRITE** | `"System settings admin write"` | Admin, Head | `public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')` |

```sql
CREATE POLICY "System settings select policy" ON public.system_settings
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System settings admin write" ON public.system_settings
FOR ALL TO authenticated
USING (
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
)
WITH CHECK (
    public.get_current_user_role() IN ('MHO_ADMIN', 'MHO_HEAD')
);
```

---

## 5. Migration Execution Plan for Auth Phase

1. **Step 1**: Complete user authentication implementation in the frontend (e.g. Next.js / Supabase Auth client).
2. **Step 2**: Create `supabase/migrations/0004_auth_roles.sql` containing:
   - Foreign key constraint linking `profiles(id)` to `auth.users(id)`.
   - `handle_new_user()` trigger for automatic profile provisioning.
   - Script dropping the `DEV_TEMP_*` policies.
   - Definitions of the production role-based policies detailed above.
3. **Step 3**: Execute and verify with a test matrix confirming Staff cannot view other staff records or modify leave decisions.
