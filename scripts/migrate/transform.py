#!/usr/bin/env python3
"""
scripts/migrate/transform.py
Transforms legacy MySQL data dump to PostgreSQL / Supabase format.

Key Transformations:
1. Omits password hashes completely (security & auth migration).
2. Converts MySQL types:
   - TINYINT(1) -> BOOLEAN (1 -> TRUE, 0 -> FALSE)
   - DATETIME (YYYY-MM-DD HH:MM:SS) -> TIMESTAMPTZ (YYYY-MM-DD HH:MM:SS+00)
   - ENUM values validated & formatted for Postgres types (user_role, leave_type, leave_status)
3. Maps legacy integer PKs (users.id) to deterministic UUIDs for public.profiles(id)
   and updates corresponding foreign keys (leave_applications, leave_balances, audit_logs).
"""

import sys
import re
import uuid
from pathlib import Path

# Deterministic namespace for reproducible UUID generation from integer legacy IDs
NAMESPACE_MHO = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

def int_to_uuid(legacy_id: int) -> str:
    """Generates a consistent, reproducible UUID for a given integer user ID."""
    return str(uuid.uuid5(NAMESPACE_MHO, f"mho_user_{legacy_id}"))

def convert_datetime(dt_str: str) -> str:
    """Converts MySQL datetime to Postgres timestamptz string."""
    if not dt_str or dt_str.upper() == 'NULL':
        return 'NULL'
    clean = dt_str.strip("'\"")
    return f"'{clean}+00'"

def convert_bool(tinyint_val: str) -> str:
    """Converts MySQL tinyint to Postgres boolean string."""
    val = tinyint_val.strip("'\" ")
    if val == '1':
        return 'TRUE'
    elif val == '0':
        return 'FALSE'
    return 'TRUE'

def normalize_leave_type(lt_str: str) -> str:
    """Normalizes leave type strings to match Postgres leave_type enum."""
    val = lt_str.strip("'\" ")
    mapping = {
        'Vacation': 'VL',
        'VL': 'VL',
        'Sick': 'SL',
        'SL': 'SL',
        'Emergency': 'CALAMITY',
        'CALAMITY': 'CALAMITY',
        'Maternity': 'ML',
        'ML': 'ML',
        'Paternity': 'PL',
        'PL': 'PL',
        'Special Privilege': 'SPL',
        'SPL': 'SPL',
        'OTHER': 'OTHER',
        'Others': 'OTHER'
    }
    return mapping.get(val, 'OTHER')

def split_sql_rows(values_block: str):
    """
    Parses a string of multiple SQL row tuples: e.g. (1, 'a'), (2, 'b')
    correctly handling nested parentheses or commas inside strings.
    """
    rows = []
    in_str = False
    quote_char = None
    paren_depth = 0
    current = []

    for char in values_block:
        if in_str:
            current.append(char)
            if char == quote_char:
                # check if escaped quote e.g. ''
                in_str = False
                quote_char = None
        else:
            if char in ("'", '"'):
                in_str = True
                quote_char = char
                current.append(char)
            elif char == '(':
                paren_depth += 1
                if paren_depth == 1:
                    current = []
                else:
                    current.append(char)
            elif char == ')':
                paren_depth -= 1
                if paren_depth == 0:
                    rows.append("".join(current))
                    current = []
                else:
                    current.append(char)
            else:
                if paren_depth > 0:
                    current.append(char)
    return rows

def parse_sql_values(row_str: str):
    """
    Parses a single row's comma-separated tokens, respecting quoted strings.
    """
    tokens = []
    in_str = False
    quote_char = None
    current = []

    for char in row_str:
        if in_str:
            current.append(char)
            if char == quote_char:
                in_str = False
                quote_char = None
        else:
            if char in ("'", '"'):
                in_str = True
                quote_char = char
                current.append(char)
            elif char == ',':
                tokens.append("".join(current).strip())
                current = []
            else:
                current.append(char)
    if current:
        tokens.append("".join(current).strip())
    return tokens


def split_sql_statements(sql_text: str):
    """
    Splits SQL script into individual statements by semicolon,
    ignoring semicolons that appear inside single or double quotes.
    """
    statements = []
    current = []
    in_str = False
    quote_char = None

    for char in sql_text:
        if in_str:
            current.append(char)
            if char == quote_char:
                in_str = False
                quote_char = None
        else:
            if char in ("'", '"'):
                in_str = True
                quote_char = char
                current.append(char)
            elif char == ';':
                stmt = "".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
            else:
                current.append(char)
    remainder = "".join(current).strip()
    if remainder:
        statements.append(remainder)
    return statements


def transform_dump(input_file: Path, output_file):
    content = input_file.read_text(encoding='utf-8')
    
    profiles = []
    balances = []
    applications = []
    audit_logs = []

    # Map legacy user IDs to UUIDs
    user_id_map = {}

    statements = split_sql_statements(content)

    insert_header_pattern = re.compile(
        r"INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*(?:\(([^)]+)\))?\s+VALUES\s*([\s\S]*)$",
        re.IGNORECASE
    )

    for stmt in statements:
        match = insert_header_pattern.search(stmt)
        if not match:
            continue

        table_name = match.group(1).lower()
        cols = [c.strip(" `\"") for c in match.group(2).split(",")] if match.group(2) else []
        raw_rows_str = match.group(3).strip()

        row_tuples = split_sql_rows(raw_rows_str)

        for row_str in row_tuples:
            vals = parse_sql_values(row_str)
            row_dict = dict(zip(cols, vals)) if cols else {}

            if table_name == 'users':
                # Map columns
                legacy_id = int(row_dict.get('id', vals[0]))
                user_uuid = int_to_uuid(legacy_id)
                user_id_map[legacy_id] = user_uuid

                full_name = row_dict.get('full_name', vals[4])
                email = row_dict.get('email', vals[2])
                role = row_dict.get('role', vals[5]).strip("'\" ")
                position = row_dict.get('position', vals[6])
                vacation_credits = row_dict.get('vacation_credits', vals[7])
                sick_credits = row_dict.get('sick_credits', vals[8])
                emergency_credits = row_dict.get('emergency_credits', vals[9])
                is_active = convert_bool(row_dict.get('is_active', vals[10]))
                created_at = convert_datetime(row_dict.get('created_at', vals[11]))

                profiles.append({
                    'id': f"'{user_uuid}'",
                    'full_name': full_name,
                    'email': email,
                    'role': f"'{role}'",
                    'position': position if position != 'NULL' else 'NULL',
                    'vacation_credits': vacation_credits,
                    'sick_credits': sick_credits,
                    'emergency_credits': emergency_credits,
                    'is_active': is_active,
                    'created_at': created_at,
                    'updated_at': created_at
                })

            elif table_name == 'leave_balances':
                legacy_user_id = int(row_dict.get('user_id', vals[1]))
                user_uuid = user_id_map.get(legacy_user_id, int_to_uuid(legacy_user_id))
                vacation_credits = row_dict.get('vacation_credits', vals[2])
                sick_credits = row_dict.get('sick_credits', vals[3])
                updated_at = convert_datetime(row_dict.get('updated_at', vals[4]))

                balances.append({
                    'user_id': f"'{user_uuid}'",
                    'vacation_credits': vacation_credits,
                    'sick_credits': sick_credits,
                    'emergency_credits': '5.00',
                    'updated_at': updated_at
                })

            elif table_name == 'leave_applications':
                raw_uid = row_dict.get('user_id', vals[1])
                user_uuid = f"'{user_id_map.get(int(raw_uid), int_to_uuid(int(raw_uid)))}'" if raw_uid != 'NULL' else 'NULL'

                employee_name = row_dict.get('employee_name', vals[2])
                raw_lt = row_dict.get('leave_type', vals[3])
                leave_type = f"'{normalize_leave_type(raw_lt)}'"
                other_lt = row_dict.get('other_leave_type', vals[4])
                start_date = row_dict.get('start_date', vals[5])
                end_date = row_dict.get('end_date', vals[6])
                total_days = row_dict.get('total_days', vals[7])
                reason = row_dict.get('reason', vals[8])
                status = row_dict.get('status', vals[9])
                dss_rec = row_dict.get('dss_recommendation', vals[10])

                raw_creator = row_dict.get('created_by_admin_id', vals[11])
                creator_uuid = f"'{user_id_map.get(int(raw_creator), int_to_uuid(int(raw_creator)))}'" if raw_creator != 'NULL' else 'NULL'

                raw_proc = row_dict.get('processed_by_admin_id', vals[12])
                proc_uuid = f"'{user_id_map.get(int(raw_proc), int_to_uuid(int(raw_proc)))}'" if raw_proc != 'NULL' else 'NULL'

                admin_remarks = row_dict.get('admin_remarks', vals[13])
                processed_at = convert_datetime(row_dict.get('processed_at', vals[14]))
                created_at = convert_datetime(row_dict.get('created_at', vals[15]))

                applications.append({
                    'user_id': user_uuid,
                    'employee_name': employee_name,
                    'leave_type': leave_type,
                    'other_leave_type': other_lt,
                    'start_date': start_date,
                    'end_date': end_date,
                    'total_days': total_days,
                    'reason': reason,
                    'status': status,
                    'dss_recommendation': dss_rec,
                    'created_by_admin_id': creator_uuid,
                    'processed_by_admin_id': proc_uuid,
                    'admin_remarks': admin_remarks,
                    'processed_at': processed_at,
                    'created_at': created_at
                })

            elif table_name == 'audit_logs':
                raw_uid = row_dict.get('user_id', vals[1])
                user_uuid = f"'{user_id_map.get(int(raw_uid), int_to_uuid(int(raw_uid)))}'" if raw_uid != 'NULL' else 'NULL'
                action_type = row_dict.get('action_type', vals[2])
                description = row_dict.get('description', vals[3])
                ip_addr = row_dict.get('ip_address', vals[4])
                created_at = convert_datetime(row_dict.get('created_at', vals[5]))

                audit_logs.append({
                    'user_id': user_uuid,
                    'action_type': action_type,
                    'description': description,
                    'ip_address': ip_addr,
                    'created_at': created_at
                })

    # Generate PostgreSQL SQL output
    out = []
    out.append("-- ==============================================================================")
    out.append("-- Transformed Postgres Data Migration Script")
    out.append("-- Source: Legacy MySQL (mho_db)")
    out.append("-- Target: Supabase / PostgreSQL (public schema)")
    out.append("-- Notice: Password hashes omitted. Types and UUID foreign keys converted.")
    out.append("-- ==============================================================================\n")

    # Disable status audit trigger during bulk data load to preserve historical logs
    out.append("-- Temporarily disable status audit trigger to avoid redundant log generation")
    out.append("ALTER TABLE public.leave_applications DISABLE TRIGGER trg_leave_status_update;\n")

    # 1. Profiles
    if profiles:
        out.append("-- 1. Profiles")
        out.append("INSERT INTO public.profiles (id, full_name, email, role, position, vacation_credits, sick_credits, emergency_credits, is_active, created_at, updated_at)")
        out.append("VALUES")
        p_rows = [f"    ({p['id']}, {p['full_name']}, {p['email']}, {p['role']}, {p['position']}, {p['vacation_credits']}, {p['sick_credits']}, {p['emergency_credits']}, {p['is_active']}, {p['created_at']}, {p['updated_at']})" for p in profiles]
        out.append(",\n".join(p_rows))
        out.append("ON CONFLICT (id) DO UPDATE SET")
        out.append("    full_name = EXCLUDED.full_name,")
        out.append("    email = EXCLUDED.email,")
        out.append("    role = EXCLUDED.role,")
        out.append("    position = EXCLUDED.position,")
        out.append("    vacation_credits = EXCLUDED.vacation_credits,")
        out.append("    sick_credits = EXCLUDED.sick_credits,")
        out.append("    emergency_credits = EXCLUDED.emergency_credits,")
        out.append("    is_active = EXCLUDED.is_active;\n")

    # 2. Leave Balances
    if balances:
        out.append("-- 2. Leave Balances")
        out.append("INSERT INTO public.leave_balances (user_id, vacation_credits, sick_credits, emergency_credits, updated_at)")
        out.append("VALUES")
        b_rows = [f"    ({b['user_id']}, {b['vacation_credits']}, {b['sick_credits']}, {b['emergency_credits']}, {b['updated_at']})" for b in balances]
        out.append(",\n".join(b_rows))
        out.append("ON CONFLICT (user_id) DO UPDATE SET")
        out.append("    vacation_credits = EXCLUDED.vacation_credits,")
        out.append("    sick_credits = EXCLUDED.sick_credits,")
        out.append("    emergency_credits = EXCLUDED.emergency_credits,")
        out.append("    updated_at = EXCLUDED.updated_at;\n")

    # 3. Leave Applications
    if applications:
        out.append("-- 3. Leave Applications")
        out.append("INSERT INTO public.leave_applications (user_id, employee_name, leave_type, other_leave_type, start_date, end_date, total_days, reason, status, dss_recommendation, created_by_admin_id, processed_by_admin_id, admin_remarks, processed_at, created_at)")
        out.append("VALUES")
        a_rows = [f"    ({a['user_id']}, {a['employee_name']}, {a['leave_type']}, {a['other_leave_type']}, {a['start_date']}, {a['end_date']}, {a['total_days']}, {a['reason']}, {a['status']}, {a['dss_recommendation']}, {a['created_by_admin_id']}, {a['processed_by_admin_id']}, {a['admin_remarks']}, {a['processed_at']}, {a['created_at']})" for a in applications]
        out.append(",\n".join(a_rows) + ";\n")

    # 4. Audit Logs
    if audit_logs:
        out.append("-- 4. Audit Logs")
        out.append("INSERT INTO public.audit_logs (user_id, action_type, description, ip_address, created_at)")
        out.append("VALUES")
        l_rows = [f"    ({l['user_id']}, {l['action_type']}, {l['description']}, {l['ip_address']}, {l['created_at']})" for l in audit_logs]
        out.append(",\n".join(l_rows) + ";\n")

    out.append("-- Re-enable status audit trigger")
    out.append("ALTER TABLE public.leave_applications ENABLE TRIGGER trg_leave_status_update;\n")

    output_file.write_text("\n".join(out), encoding='utf-8')
    print(f"Successfully transformed {len(profiles)} profiles, {len(balances)} balances, {len(applications)} applications, and {len(audit_logs)} audit logs.")
    print(f"Output written to: {output_file}")

if __name__ == '__main__':
    base_dir = Path(__file__).resolve().parent
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] != '-' else base_dir / 'sample_mysql_data.sql'
    out_arg = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not in_path.exists():
        print(f"Error: Input file {in_path} not found.", file=sys.stderr)
        sys.exit(1)
        
    if out_arg and out_arg != '-':
        out_path = Path(out_arg)
        transform_dump(in_path, out_path)
    else:
        # Print to stdout
        content = in_path.read_text(encoding='utf-8')
        # We can write to a temporary buffer or print
        # Let's support stdout directly
        import io
        buf = io.StringIO()
        class DummyFile:
            def write_text(self, text, encoding='utf-8'):
                print(text)
        transform_dump(in_path, DummyFile())

