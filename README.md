# StudySync

A collaborative study scheduling platform for college students. StudySync helps students coordinate study sessions, see when friends are available, and organize group study time — all from a shared calendar view.

---

## What We're Building

StudySync solves the problem of disorganized study coordination. Instead of texting back and forth to find a time, students can see their friends' schedules, create shared study blocks, join study groups, and stay in sync — across web today, and mobile in the future.

**Roadmap:**
- **Phase 1 (current):** Web app with Supabase backend, auth, persistent data, real-time features
- **Phase 2:** Mobile app (React Native / Expo) sharing core business logic with the web

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 5 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Calendar | FullCalendar 6 |
| Routing | React Router 6 |
| State | Zustand 5 |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 |

---

## Current Features

- Email/password authentication (Supabase)
- Protected dashboard with session persistence
- Weekly calendar (FullCalendar) with drag/resize (mock data, to be persisted in next plan)
- Course sidebar with color-coded courses
- Right-sidebar with friends and groups
- Profile status indicator (Discord-style avatar dot)
- Automatic profile row creation on signup (via Postgres trigger)

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:kevinanguyen/StudySync.git
cd StudySync
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com and sign up / log in
2. Create a new project named "StudySync"
3. Choose a strong database password (save it somewhere safe)
4. Select the closest region
5. Wait for the project to finish provisioning

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

In your Supabase project dashboard → Settings → API Keys:
- Copy the **Project URL** (or use the domain from the REST endpoint, without the `/rest/v1/` suffix) → paste into `VITE_SUPABASE_URL` in `.env.local`
- Copy the **anon public** key → paste into `VITE_SUPABASE_ANON_KEY` in `.env.local`

### 4. Run database migrations

Two ways to apply the schema:

**Option A: Supabase SQL Editor (manual)**
1. Dashboard → SQL Editor → New Query
2. Copy contents of `supabase/migrations/0001_schema.sql` → Run
3. Open a new query, copy `supabase/migrations/0002_rls.sql` → Run
4. Verify tables exist: Database → Tables (should show 10 tables, all with RLS enabled)

**Option B: Supabase CLI or MCP (automated)**
If you have the Supabase CLI or MCP connected:
```bash
supabase db push
```

### 5. Disable email confirmation for dev

In the Supabase dashboard: **Authentication** → **Sign In / Providers** → **Email** → disable the **"Confirm email"** toggle.

Without this, signup returns no session (Supabase requires email verification first) and the app will throw an error. Re-enable it before production.

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:5173 and create an account.

---

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # Production build (tsc + vite build)
npm run typecheck   # TypeScript type-check only
npm run test        # Run tests in watch mode
npm run test:run    # Run tests once (CI-friendly)
npm run lint        # ESLint check
```

---

## Project Structure

```
src/
├── app/              # Router, providers (App, routes, ProtectedRoute)
├── pages/            # Route-level pages (LoginPage, SignupPage, DashboardPage)
├── components/       # UI components grouped by domain
│   ├── auth/
│   ├── calendar/
│   ├── courses/
│   ├── friends/
│   ├── groups/
│   ├── layout/
│   └── shared/
├── hooks/            # React hooks (useAuth)
├── lib/              # Pure utilities (supabase client, time helpers)
├── services/         # Supabase query wrappers (auth, ...)
├── store/            # Zustand stores (authStore)
├── types/            # TypeScript types (generated from Supabase)
└── data/             # Mock data (to be replaced by real queries)

supabase/
└── migrations/       # SQL migrations (0001_schema.sql, 0002_rls.sql)

tests/
├── lib/              # Unit tests for pure utilities
├── store/            # Store tests
└── setup.ts          # Test setup (jest-dom matchers)

docs/
└── superpowers/
    ├── specs/        # Design specs
    └── plans/        # Implementation plans
```

---

## Architecture Notes

- **Data flow:** Components → hooks → services → Supabase
- **State:** Zustand for app-wide state (auth, etc.); hook-local state for transient data
- **RLS:** Row-level security enforces access control at the database level
- **Pure logic:** `lib/time.ts` and (eventually) `lib/availability.ts` have no external deps and are fully unit-tested
- **Shared-block visibility:** friend-tagged course events visible only to friends enrolled in the same course (enforced at the DB level via RLS)

---

## Troubleshooting

**"Invalid hook call" errors spamming the console**
Vite sometimes caches React and React-DOM with mismatched hashes after a dep change. Fix:
```bash
rm -rf node_modules/.vite
npm run dev
```

**"Signup returned no session"**
Email confirmation is still enabled in Supabase. See Setup Step 5.

**"email rate limit exceeded"**
Supabase free-tier SMTP only allows ~3-4 confirmation emails per hour. Disable email confirmation (Setup Step 5) or wait.

**Schema types out of date after changing migrations**
Regenerate with the Supabase CLI:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/db.ts
```
