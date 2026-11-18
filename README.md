# WardSense

Configurable additive patient-workload model (W = S+M+V+D+T), competency-aware allocation,
fatigue-adjusted utilization, and minimax-oriented rebalancing. Next.js 15 + Supabase.

**Decision-support prototype. Not clinically validated. Not a substitute for hospital staffing
policy, professional judgment, or qualified supervision. All recommendations require supervisor
approval. No regulatory compliance or certification is claimed.**

## Local setup
1. `npm install`
2. Create a Supabase project (hosted scratch project, or `supabase start` for local).
3. Apply `supabase/migrations/0001_init.sql` (SQL editor, or `supabase db push` with the CLI).
4. Run `supabase/seed.sql` (synthetic demo data; ward flagged `demoData: true`).
5. Copy `.env.example` → `.env.local`, fill URL + anon key + service-role key.
6. Local Supabase only: disable email confirmation (`supabase/config.toml` → `[auth.email] enable_confirmations = false`) or confirm via the dashboard.
7. `npm run dev` → http://localhost:3000
8. Sign up your first user, then promote it in SQL:
   `update public.profiles set role = 'admin' where id = '<auth-user-uuid>';`
9. Sign in again. Create supervisors/nurses in Settings → Users; link nurse logins to nurse
   records via `nurses.profile_id` (SQL or dashboard) for the nurse-role views.

## Tests
- `npm test` — unit suites for scoring, capacity/fatigue/utilization, safety, allocation, rebalance.
- `npm run test:integration` — concurrent-approval transaction test (needs local Supabase + env; `RUN_INTEGRATION=1`).
- `npm run test:e2e` — Playwright flow (needs running app + seeded DB + E2E_* env).
- `npm run typecheck`

## Production
- `npm run build && npm start`
- Deploy: Vercel (set the three env vars; service-role key never exposed to the browser) +
  hosted Supabase with migrations applied. Health check: `GET /api/health`.

## Security model
- Supabase Auth; server-side role checks in every route handler; RLS on every table.
- Nurses see only their own assignments/patients/alerts (RLS `can_view_patient`).
- Assignment writes exist ONLY inside security-definer RPCs with full safety re-validation,
  advisory locks, row locks, and a partial unique index (one approved assignment per patient/shift).
- Scores are trigger-computed; client-submitted scores are stripped.
- Config changes bump a version and re-score patients; every run records its config version.
- Rate limiting is in-memory (single instance); swap for Redis/Upstash when scaling horizontally.
- Audit triggers on all clinical tables; co-signs and rejections carry audited reasons.
- Error logs are structured and contain no patient-identifiable data. Use synthetic data in dev.

## Backup & recovery
- Logical: `supabase db dump -f backup.sql` (or `pg_dump`); restore with `psql -f backup.sql`.
- Hosted Supabase: enable PITR for point-in-time recovery; test restores quarterly.
- `allocation_runs.input_snapshot/result_snapshot` + `shift_logs` + `audit_logs` give full
  decision replay: who approved what, under which config, with which inputs.

## Known limitations (documented, deliberate)
- Greedy minimax heuristic — no global-optimality claim. `AllocationEngine` interface allows
  ILP/CP/multi-objective replacements.
- Patient + requirement edits are two statements (assignments are the transaction-critical path).
- One ward per session (first by created_at). Multi-ward = add a ward selector + scope queries.
- Descriptors are institutional placeholders requiring hospital approval; not TISS standards.

## Dual Supervisor + Nurse Account Support (Hackathon & Demos)

WardSense allows a single authenticated user with `role = 'supervisor'` or `'admin'` to link to a nurse record (`nurses.profile_id`), enabling seamless switching between **Supervisor** and **Nurse** perspectives without signing out:

### 1. Linking an Account to a Nurse Record
Choose any of the following methods:

**Method A: In the WardSense UI (Recommended)**
1. Log in with your supervisor account.
2. Navigate to **Nurse Management** (`/nurses`).
3. Click **Edit** on the nurse you want to represent (e.g., *Grace Okafor*).
4. Click the **"Link to Me"** button to automatically populate your user UUID, or paste your User UUID manually.
5. Click **Save**.

**Method B: In the Supabase SQL Editor**
```sql
-- Link your authenticated user to a nurse record by matching your login email
UPDATE public.nurses
SET profile_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1)
WHERE name = 'Grace Okafor'; -- or any nurse of your choice
```

### 2. Switching Dashboard Perspectives
Once linked, a mode switcher appears in the dashboard banner and header:
- **Supervisor Mode**: Displays ward census, active nurse workload table, smart allocation recommendations, and rebalancing tools.
- **Nurse Mode**: Displays the personal nurse home view with your linked nurse's workload points, active shift details, assigned patient beds, and safety notifications.
- **Security**: Mode switching is purely a presentation perspective. All database operations and API writes continue to enforce full server-side supervisor privileges. Non-supervisor accounts cannot switch to supervisor mode.
