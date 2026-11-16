# MHO DSS Leave Portal — Web Frontend

React + TypeScript + Vite front-end for the **Municipal Health Office Decision Support System Leave Portal**.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Radix primitives + CVA) |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (PostgreSQL + PostgREST + RPC) |

---

## Prerequisites

- Node.js ≥ 20
- A running Supabase project (local or cloud) with migrations applied

---

## Setup

### 1. Copy environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Offline / demo mode**: If the credentials are left as placeholders, the app falls back to hardcoded seed data for all screens. No network is needed for local development review.

### 2. Install dependencies

```bash
npm install
```

### 3. Apply database migrations

From the repo root:

```bash
supabase db push
# or for local dev:
supabase start
supabase db reset
```

### 4. Run dev server

```bash
npm run dev
```

App will be available at **http://localhost:5173**

---

## Build for Production

```bash
npm run build
npm run preview   # preview the dist/ build locally
```

---

## Project Structure

```
src/
├── App.tsx                   # React Router routes
├── index.css                 # Tailwind v4 @import + CSS variables
├── main.tsx
│
├── components/
│   ├── Header.tsx            # Sticky header + DevRole switcher (TEMPORARY)
│   ├── Sidebar.tsx           # Navigation sidebar (role-based)
│   ├── Layout.tsx            # Shell: Sidebar + Header + <Outlet>
│   ├── DssBadge.tsx          # RECOMMENDED / NEEDS_REVIEW badge
│   └── DecisionDialog.tsx    # Approve / reject modal
│
├── context/
│   └── DevRoleContext.tsx    # ⚠️ TEMPORARY — simulates auth roles via dropdown
│
├── lib/
│   ├── supabase.ts           # Typed Supabase client
│   └── utils.ts              # cn() class utility
│
├── pages/
│   ├── auth/LoginScreen.tsx                    # Auth-deferred placeholder
│   ├── dashboard/ExecutiveDashboard.tsx         # Metrics, charts, CSV export
│   ├── leaves/
│   │   ├── LeaveFilingPage.tsx                 # Employee + on-behalf filing
│   │   └── ApprovalQueueScreen.tsx             # PENDING queue + approve/reject
│   ├── admin/
│   │   ├── LeaveMonitorHub.tsx                 # Full leave table + filters
│   │   ├── PersonnelDirectoryScreen.tsx        # Roster + credit balances
│   │   └── UserManagementScreen.tsx            # CRUD users + credit adjustments
│   └── reports/
│       └── AuditLogsScreen.tsx                 # Paginated audit log + filters
│
├── types/
│   └── database.types.ts     # Auto-typed Supabase schema types
│
└── utils/
    ├── weekday.ts            # countWeekdays() — mirrors Postgres count_weekdays()
    └── csv.ts                # exportToCsv() — download data as .csv
```

---

## Role-Based Access

> ⚠️ **Auth is deferred.** Role enforcement is currently simulated via `DevRoleContext`.
> The header shows a "Acting as" dropdown — pick any seed profile to preview role-gated UI.
> See [`docs/auth-phase-todo.md`](../docs/auth-phase-todo.md) for the full auth migration plan.

| Role | Leave Filing | Approval | Monitor Hub | Personnel Dir | User Mgmt | Audit Logs |
|------|:-----------:|:--------:|:-----------:|:-------------:|:---------:|:---------:|
| **head** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **hr** | ✅ | ✅ (view) | ✅ | ✅ | ❌ | ✅ |
| **staff** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Development Notes

- **Offline fallback**: Every page falls back to hardcoded seed data if Supabase is unreachable. Controlled by `placeholderData` in TanStack Query.
- **No password handling**: Authentication is completely deferred. No passwords are stored or transmitted.
- **Dev RLS policies**: All Supabase tables use permissive `anon` policies marked TEMPORARY. See `supabase/migrations/0003_dev_access.sql`.
- **TypeScript types**: `src/types/database.types.ts` is manually maintained. When schema changes, re-generate with:
  ```bash
  npx supabase gen types typescript --local > src/types/database.types.ts
  ```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |
