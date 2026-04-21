# StudySync

A collaborative study scheduling platform for college students. StudySync replaces the usual mess of group-texting and screenshot-comparing with a shared weekly calendar that shows when your friends are free, lets you create study blocks together, and keeps everyone in sync in real time.

---

## What StudySync Does

- **See overlap at a glance.** Your friends' class meetings and shared study blocks render directly on your calendar alongside your own — no switching tabs.
- **Create study blocks in context.** The create-event drawer shows, per-invitee, whether they're available for the slot you picked, and surfaces an existing overlapping event as a "join this one instead" suggestion.
- **Organize around courses.** A course is a globally shared record; your personal color, instructor nickname, and class meeting times live on your enrollment, so classmates can customize their own view independently.
- **Groups with realtime chat.** Create study groups from your friends, plan upcoming sessions, and chat live — messages deliver instantly via Supabase Realtime.
- **Auth, persistence, and access control** handled by Supabase (Postgres + Auth + Row-Level Security).

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 5 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3 |
| Calendar | FullCalendar 6 (timeGrid + interaction plugins) |
| Routing | React Router 6 (data router API) |
| State | Zustand 5 |
| Backend | Supabase (Postgres 17, Auth, Realtime) |
| Testing | Vitest + @testing-library/react + jsdom |
| Linting | ESLint 9 (react-hooks, react-refresh) |

---

## Feature Tour

### Authentication
- Email/password sign-up with session persistence (refresh tokens auto-renewed).
- Protected routes: any page under `/` redirects unauthenticated users to `/login`.
- Sign-out, password change, and profile edit from the settings page.

### Calendar & events
- Weekly time-grid view (Mon–Sun, 8:30 AM – 7:00 PM).
- Class meetings render as **background blocks** in the course color; events render as **foreground blocks** on top.
- Drag-to-create: click-drag on an empty slot to open the create-event drawer with times pre-filled.
- Drag-to-reschedule: events you own can be dragged or resized; changes persist optimistically with revert-on-error.
- Read-only for non-owners: shared events show a small creator-initials avatar instead of being editable.
- "Now" indicator: red dot + thin line marks the current time; a Central-Time clock pill in the header gives an unambiguous CST reference.

### Courses
- Shared course records keyed by code (case-insensitive) — if a classmate has already added `CS4063`, you enroll in the same underlying record.
- Per-user personal color and instructor/nickname fields — customize without affecting classmates.
- Class meetings modeled as recurring weekly slots (day-of-week + time range) that expand to dated background events for each week view.
- Click a course row to edit; hover and click the × to drop. Drop cascades to remove your class meetings for that course.

### Friends & invites
- Username/email profile search with case-insensitive prefix matching.
- Friend requests with accept / decline flows.
- Per-friend availability shown in the invite picker — an inline "Busy — overlaps with CS4063" banner warns before you invite.
- Click a friend's avatar to open a profile card (major, graduation year, status).
- Realtime friend-request notification: a pending friendship inserted elsewhere appears on your right panel immediately.

### Groups & chat
- Create a group with optional course association + description, invite members on creation.
- Group detail page at `/groups/:id` with member list and upcoming group sessions.
- Realtime chat via Supabase Postgres Changes — messages appear across all members' screens without polling.

### Settings
- Edit profile (name, username, major, graduation year, avatar color).
- Manual status override (`available` / `studying` / `busy`) with optional custom status text.
- Change password (Supabase Auth).

### Polish
- Toast notifications for every mutation (success / error / info).
- Loading skeletons for initial data fetch.
- Focus-trapped modals and Escape-to-close.
- Empty-state illustrations with inline CTAs on the courses, friends, and groups lists.
- Responsive layout: desktop-first, gracefully degrades to tablet width.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier is sufficient)

### 1. Install

```bash
git clone <repository-url>
cd StudySync
npm install
```

### 2. Create a Supabase project
1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Once provisioned, go to **Settings → API Keys** and note:
   - The project **URL**
   - The **anon public** key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=<your project URL>
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

### 4. Apply database migrations

In the Supabase dashboard → **SQL Editor**, run the migration files in order:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_fix_enrollments_recursive_rls.sql
supabase/migrations/0004_fix_all_recursive_rls.sql
supabase/migrations/0005_enable_messages_realtime.sql
supabase/migrations/0006_enable_friendships_realtime.sql
```

Or, if you have the Supabase CLI:

```bash
supabase db push
```

### 5. Disable email confirmation for development

In the Supabase dashboard: **Authentication → Sign In / Providers → Email** — disable the **Confirm email** toggle. Without this, new sign-ups return no session because Supabase expects the user to click a verification email first.

### 6. Run

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) and create an account.

---

## Scripts

```bash
npm run dev        # Vite dev server (HMR) at http://localhost:5173
npm run build      # Production build (tsc --build + vite build)
npm run preview    # Serve the production build locally
npm run typecheck  # TypeScript compile-only check
npm run test       # Vitest in watch mode
npm run test:run   # Vitest single run (suitable for CI)
npm run lint       # ESLint
```

---

## Project Structure

```
src/
├── app/                 Router + providers
│   ├── App.tsx
│   ├── routes.tsx
│   └── ProtectedRoute.tsx
├── pages/               Route-level pages
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   ├── GroupPage.tsx
│   └── SettingsPage.tsx
├── components/          UI components grouped by domain
│   ├── auth/            Login + signup layout
│   ├── calendar/        StudyCalendar, CreateEventDrawer, EventDetailsPanel, InviteePicker
│   ├── courses/         CoursesSidebar, Add/Edit course modals, ClassMeetingsField
│   ├── friends/         RightPanel, AddFriendModal, FriendProfileModal, FriendRequestsPanel
│   ├── groups/          CreateGroupModal, GroupChat, GroupMembersList, UpcomingSessionsCard
│   ├── layout/          Header
│   └── shared/          Avatar, Drawer, ConfirmDialog, Toast, EmptyState, Skeleton
├── hooks/               React hooks (data, auth, UI)
│   ├── useAuth.ts
│   ├── useCourses.ts
│   ├── useEvents.ts
│   ├── useFriends.ts
│   ├── useGroups.ts
│   ├── useMessages.ts
│   ├── useFocusTrap.ts
│   └── useSupabaseKeepalive.ts
├── lib/                 Pure utilities (no external deps)
│   ├── supabase.ts      Typed client + 10s fetch timeout
│   ├── time.ts          Week math, range overlap, class-meeting expansion
│   ├── availability.ts  Conflict detection, join-suggestion
│   └── status.ts        Status enum → label + color map
├── services/            Supabase query wrappers (one per domain)
│   ├── auth.service.ts
│   ├── profile.service.ts
│   ├── courses.service.ts
│   ├── events.service.ts
│   ├── friends.service.ts
│   ├── groups.service.ts
│   └── messages.service.ts
├── store/               Zustand stores
│   ├── authStore.ts
│   └── uiStore.ts
├── types/               TypeScript types
│   ├── db.ts            Generated from Supabase schema
│   └── domain.ts        App-friendly aliases + derived shapes
└── index.css            Tailwind + FullCalendar overrides

supabase/migrations/     Schema + RLS + realtime migrations

tests/                   Unit tests (Vitest + Testing Library)
├── lib/                 Pure-logic tests (time, availability)
├── services/            Service-level tests
└── store/               Store tests
```

---

## Architecture

**Data flow:** Components → hooks → services → Supabase.
Components render; hooks own stateful logic; services are thin, pure async wrappers around the Supabase client. Services throw typed `*ServiceError` errors which hooks catch and surface to the user via the toast store.

**Database access control** is enforced at the Postgres level via Row-Level Security policies. Friend-tagged course events, for example, are visible only to friends enrolled in the same course — enforced by the RLS policy on the `events` table, not by a client filter.

**Realtime.** Three tables broadcast Postgres changes via Supabase Realtime: `friendships` (pending-request / accept notifications), `messages` (group chat), and `events` is served over the fetch path (no subscription currently). Each subscription uses a unique channel topic per mount to survive React strict-mode remounts.

**Tab lifecycle.** A single `useSupabaseKeepalive` hook mounted at the app root pauses Supabase Auth's auto-refresh while the window is blurred or hidden, and resumes it on focus/visibility. This prevents the JS engine from stalling on a throttled background refresh promise — a common failure mode when browser tabs live on different macOS Spaces or virtual desktops. On resume, the hook also re-subscribes any realtime channels that dropped and dispatches a `studysync:tab-revived` event that data hooks listen for to reload any data that stalled.

**Network safety.** The Supabase client uses a custom `fetch` with a 10-second abort timeout on every REST and auth call — stuck connections fail loudly instead of hanging indefinitely.

**Pure logic is tested.** `lib/time.ts` and `lib/availability.ts` have no external dependencies and are covered by unit tests. Other layers are tested where behavior is non-trivial.

---

## Testing

58 unit tests covering pure-logic modules, services, and Zustand stores.

```bash
npm run test:run
```

---

## Design Decisions of Note

- **Snake_case on the client.** Database-derived field names (`owner_id`, `start_at`, etc.) are preserved all the way to the UI rather than being remapped to camelCase. One fewer place for naming bugs to hide.
- **Services throw, hooks catch, UI toasts.** Any Supabase error becomes a typed service error; callers catch it, surface a toast, and optionally keep an inline field error as a backup.
- **Optimistic mutations + fire-and-forget reload.** Mutations update local state immediately with the returned row, then fire `reload()` in the background without awaiting. This keeps submit buttons from spinning on slow follow-up refetches and plays nicely with realtime subscriptions.
- **Channel topic uniqueness.** Realtime channel topics include a per-mount suffix so remounted effects never get handed back a previously-subscribed channel (which would throw on the next `.on()` call).
