# MySQL to PostgreSQL (Supabase) Data Migration Guide

This directory provides scripts and procedures to migrate legacy MySQL (`mho_db`) data to PostgreSQL / Supabase for the MHO DSS Leave Portal.

---

## 1. Environment Assessment

- **Docker / MySQL Service Status**:
  - The local Docker daemon and native `mysqld` service were detected as not currently running.
  - The legacy MySQL raw table storage files (`.frm`, `.ibd`, `.TRG`) are located in [`mho_db/`](file:///C:/mho/mho-dss-leave-portal/mho_db).

---

## 2. Step-by-Step Instructions to Dump MySQL Data

If you have access to Docker Desktop or a local MySQL/MariaDB server, follow these steps to load the raw data files or dump an existing database:

### Option A: Using Docker (Recommended)

1. **Start Docker Desktop** on your machine.
2. **Mount and Launch a Temporary MySQL 8.0 / 5.7 Container**:
   ```bash
   # From the repository root
   docker run --name temp_mho_mysql \
     -v "$(pwd)/mho_db:/var/lib/mysql/mho_db" \
     -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
     -d mysql:8.0
   ```
3. **Execute mysqldump with PostgreSQL-compatible options**:
   ```bash
   docker exec temp_mho_mysql mysqldump -u root \
     --compatible=postgresql \
     --default-character-set=utf8mb4 \
     --skip-extended-insert \
     --compact \
     --no-create-info \
     mho_db > scripts/migrate/mysql_dump.sql
   ```
4. **Stop and Remove Temporary Container**:
   ```bash
   docker stop temp_mho_mysql && docker rm temp_mho_mysql
   ```

### Option B: Using an Existing Local MySQL Server (e.g. XAMPP / MariaDB)

1. Ensure MySQL is running on port 3306.
2. Run `mysqldump`:
   ```bash
   mysqldump -u root -p \
     --compatible=postgresql \
     --default-character-set=utf8mb4 \
     --skip-extended-insert \
     --compact \
     --no-create-info \
     mho_db > scripts/migrate/mysql_dump.sql
   ```

---

## 3. Running the Transform Script

The transformation script [`transform.py`](file:///C:/mho/mho-dss-leave-portal/scripts/migrate/transform.py) handles:
1. **Password Hash Removal**: Explicitly excludes legacy bcrypt / MD5 hashes to prevent security leaks and accommodate auth migration.
2. **Type Conversions**:
   - `TINYINT(1)` $\rightarrow$ Postgres `BOOLEAN` (`1` $\rightarrow$ `TRUE`, `0` $\rightarrow$ `FALSE`)
   - MySQL `DATETIME` (`YYYY-MM-DD HH:MM:SS`) $\rightarrow$ ISO-8601 with timezone (`YYYY-MM-DD HH:MM:SS+00`)
   - Enums: Maps MySQL roles to `user_role` and statuses to `leave_status`, normalizing leave types to `leave_type`.
3. **ID Remapping**:
   - Maps legacy integer primary keys (`users.id`) to reproducible deterministic UUIDs for `profiles.id` and associated foreign keys (`leave_applications.user_id`, `leave_balances.user_id`, `audit_logs.user_id`).
4. **Data Anonymization**:
   - Ensures any sample/dumped data uses anonymized names and `@mho.gov.ph` email patterns.

### Execution

```bash
python scripts/migrate/transform.py [input_dump.sql] [output_data.sql]
```
If no input file is provided, `transform.py` will process `scripts/migrate/sample_mysql_data.sql` and generate [`scripts/migrate/data.sql`](file:///C:/mho/mho-dss-leave-portal/scripts/migrate/data.sql).

---

## 4. Loading into PostgreSQL / Supabase

Apply the generated SQL script after the schema migration:
```bash
# Using Supabase CLI or psql
psql -h <SUPABASE_DB_HOST> -U postgres -d postgres -f supabase/migrations/0001_init_schema.sql
psql -h <SUPABASE_DB_HOST> -U postgres -d postgres -f scripts/migrate/data.sql
```

---

## 5. Verification & Integrity Check

Execute [`verify.sql`](file:///C:/mho/mho-dss-leave-portal/scripts/migrate/verify.sql) against the target Postgres instance:
```bash
psql -h <SUPABASE_DB_HOST> -U postgres -d postgres -f scripts/migrate/verify.sql
```
This script checks:
- Table row counts across `profiles`, `leave_balances`, `leave_applications`, and `audit_logs`.
- Foreign key integrity (orphaned records check).
- Non-null and enum validity constraints.
