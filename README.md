# MHO DSS Leave Portal

Municipal Health Office Decision Support System (DSS) Leave Portal for the Municipality of Manolo Fortich.

> **DEMO BUILD NOTICE**: This build runs in demo/prototype mode using simulated dummy data and role-switching. Real authentication is deferred. A visible top banner indicates this mode in the application.

---

## Project Structure

The project has been flattened to root level for streamlined development and zero-config deployment:

```
├── src/                       # React 19 + TypeScript frontend application
│   ├── components/            # Shared UI components (Layout, Header, Sidebar, DssBadge, DecisionDialog, DemoBanner)
│   ├── pages/                 # Routes (Dashboard, Leave filing, Approvals, Admin, Reports)
│   ├── context/               # Role-switching context (DevRoleContext)
│   ├── lib/                   # Supabase client and utilities
│   └── test/                  # Test setup and test suites
├── public/                    # Static assets & icons
├── supabase/                  # Supabase database configuration & migrations
│   ├── migrations/            # Ordered SQL migration files
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_logic.sql
│   │   └── 0003_dev_access.sql
│   └── seed.sql               # Demo seed data (users, balances, applications)
├── docs/                      # Specification and architecture documentation
├── scripts/                   # Migration transformation utilities
├── vercel.json                # Vercel SPA routing rewrites configuration
├── package.json               # Dependencies and build scripts
└── README.md
```

---

## Supabase Migration Order

When setting up your Supabase database instance (local or hosted Supabase project), apply the migrations strictly in this order:

1. **`supabase/migrations/0001_init_schema.sql`**
   - Creates custom enum types (`user_role`, `leave_type`, `leave_status`).
   - Provisions tables: `users`, `leave_balances`, `leave_applications`, and `audit_logs`.
   - Adds indexes and updated timestamp triggers.

2. **`supabase/migrations/0002_logic.sql`**
   - Defines DSS business logic functions:
     - `count_weekdays(start_date, end_date)`
     - `check_dss_rules(applicant_id, leave_type, start_date, end_date)`
     - `process_leave_decision(application_id, decision, approver_id, remarks)`
   - Sets up triggers for auto-updating leave balances on approval.

3. **`supabase/migrations/0003_dev_access.sql`**
   - Configures row-level security (RLS) policies for development / demo mode anon access.

4. **`supabase/seed.sql`** *(Optional / Recommended for Demo)*
   - Seeds initial department staff, health personnel, leave balances, and sample applications.

### Running Migrations via Supabase CLI
```bash
# For local Supabase
supabase start
supabase db reset

# For linked hosted Supabase project
supabase link --project-ref your-project-ref
supabase db push
```

---

## Environment Variables

The web frontend uses the following environment variables:

| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon / Public API Key | `eyJhbGciOiJIUzI1NiIsIn...` |

> **Note**: An `.env.example` file is provided in the root directory. Never commit private service keys. The frontend only consumes the public `anon` key. If credentials are unset or unreachable, the web UI automatically falls back to offline dummy data.

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase URL & anon key (or leave empty for offline demo fallback)
```

### 3. Run Development Server
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

### 4. Run Tests & Build
```bash
npm run test
npm run build
```

---

## Vercel Deployment Instructions (Manual Steps)

Deploying to Vercel is now standard root-level configuration with no subfolder routing required.

### Option A: Via Vercel Web Dashboard (Recommended)

1. **Commit and Push changes** to your remote Git repository:
   ```bash
   git add .
   git commit -m "refactor: flatten web app to root and prepare Vercel deployment"
   git push origin <your-branch>
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New..." > "Project"**.
3. **Import** the repository `mho-dss-leave-portal`.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite` (detected automatically)
   - **Root Directory**: `./` (leave default root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-anon-public-key>`
6. Click **Deploy**.
7. Once deployed, verify:
   - The demo banner is visible at the top: *"Demo build - dummy data only, no authentication"*.
   - Refreshing nested routes (e.g., `/dashboard`, `/approvals`) loads properly without 404s due to `vercel.json` SPA rewrite rules.

### Option B: Via Vercel CLI

1. Install Vercel CLI globally if not already installed:
   ```bash
   npm i -g vercel
   ```
2. Run deployment directly from project root:
   ```bash
   vercel
   ```
3. Follow the interactive prompts (Root Directory: `./`).
4. Set environment variables when prompted or run:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
5. Deploy to production:
   ```bash
   vercel --prod
   ```
