# StudySync MVP — Design Spec

**Date:** 2026-04-20
**Status:** Approved architecture, pending implementation plan

---

## 1. Goal

Transform the existing StudySync React+Vite+Tailwind prototype into a functional MVP web app with authentication, persistence, realtime collaboration, and a coherent set of HCI-grounded features for coordinating study sessions between classmates.

Preserve the current visual design language: blue top navigation, left course sidebar, center weekly calendar, right social panel, soft rounded cards, and academic productivity feel.

---

## 2. Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Frontend framework | React 19 (existing) | Preserve existing components |
| Build tool | Vite 5 (existing) | Preserve existing setup |
| Language | TypeScript (migrating from JS) | Scales better as the project grows; catches errors at compile time |
| Styling | Tailwind 3 (existing) | Preserve mockup look and feel |
| Calendar | FullCalendar 6 (existing) | Already supports drag/resize/select |
| Routing | React Router v6 | Standard SPA routing |
| State management | Zustand | Minimal boilerplate, no re-render cascades, scales well |
| Backend | Supabase (Postgres + Auth + Realtime) | Relational data fits the domain; RLS enforces shared-block visibility at the DB level; realtime built-in |
| Testing | Vitest + React Testing Library | Native to Vite |

---

## 3. Architecture

### 3.1 Folder Structure

```
src/
├── app/                  # Router, providers, layout shells
│   ├── App.tsx
│   ├── routes.tsx
│   └── ProtectedRoute.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   ├── GroupPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── auth/
│   ├── calendar/         # StudyCalendar, EventDetailsPanel, CreateEventDrawer
│   ├── courses/          # CoursesSidebar, AddCourseModal, CourseForm
│   ├── friends/          # FriendsList, AddFriendModal, FriendSearch
│   ├── groups/           # GroupsList, CreateGroupModal, GroupChat
│   ├── layout/           # Header, Shell
│   └── shared/           # Avatar, Modal, Toast, Button, ConfirmDialog, StatusChip, EmptyState
├── hooks/                # useAuth, useCourses, useEvents, useFriends, useGroups, useMessages, useAvailability, usePresence
├── lib/
│   ├── supabase.ts       # Supabase client singleton
│   ├── time.ts           # Time math, week boundaries, ISO helpers
│   └── availability.ts   # Conflict detection engine (pure, testable)
├── services/             # Supabase query wrappers
│   ├── auth.service.ts
│   ├── courses.service.ts
│   ├── events.service.ts
│   ├── friends.service.ts
│   ├── groups.service.ts
│   └── messages.service.ts
├── store/
│   ├── authStore.ts
│   ├── socialStore.ts    # friends + groups
│   └── uiStore.ts        # toasts, modals
├── types/
│   └── db.ts             # Types generated from Supabase schema
├── utils/
└── styles/
```

### 3.2 Data Flow

Components → hooks → services → Supabase.
Shared state lives in Zustand. Transient page data lives in hook-owned state with realtime subscriptions.

### 3.3 Pure Logic Isolation

`lib/availability.ts` and `lib/time.ts` contain no Supabase, React, or hook imports. They are pure functions, unit-tested with Vitest.

---

## 4. Data Model (Supabase Schema)

### 4.1 Tables

**`profiles`** (1:1 with `auth.users`)
- `id` uuid, primary key, FK → `auth.users.id`
- `name` text
- `username` text, unique
- `school_email` text
- `major` text, nullable
- `grad_year` int, nullable
- `avatar_color` text (hex)
- `initials` text
- `status` enum: `available` | `studying` | `busy`
- `status_text` text, nullable
- `created_at` timestamptz

**`courses`** — globally shared, unique by code
- `id` uuid, primary key
- `code` text, UNIQUE (e.g. "CS4063")
- `name` text
- `default_color` text (hex) — suggested fallback if enrollment doesn't override
- `created_by` uuid, FK → `profiles.id` (first user to add; informational only)
- `created_at` timestamptz

The first user to "Add Course CS4063" creates the global row. Subsequent users searching for CS4063 find and enroll in the existing course. This makes the shared-block visibility rule trivial: "both users have an `enrollments` row for the same `course_id`."

**`enrollments`** — per-user metadata for a course
- `user_id` uuid, FK → `profiles.id`
- `course_id` uuid, FK → `courses.id`
- `color` text (hex) — user's preferred color for this course, defaults to course.default_color
- `instructor` text, nullable
- `joined_at` timestamptz
- PRIMARY KEY (user_id, course_id)

**`class_meetings`** — recurring class schedule, per user (different users in the same course may have different sections)
- `id` uuid, primary key
- `user_id` uuid, FK → `profiles.id`
- `course_id` uuid, FK → `courses.id`
- `day_of_week` smallint (0=Sun, 1=Mon...6=Sat)
- `start_time` time
- `end_time` time
- Used as busy blocks in availability. Not editable as events.

**`events`** (study sessions)
- `id` uuid, primary key
- `title` text
- `course_id` uuid, FK → `courses.id`, nullable, ON DELETE SET NULL
- `owner_id` uuid, FK → `profiles.id`
- `start_at` timestamptz
- `end_at` timestamptz (CHECK `end_at > start_at`)
- `location` text, nullable
- `description` text, nullable
- `visibility` enum: `private` | `friends` | `group`
- `group_id` uuid, FK → `groups.id`, nullable
- `created_at` timestamptz

**Default visibility:** `friends` when `course_id` is set, `private` otherwise. This makes course-tagged study blocks discoverable to classmate-friends by default (supports the "Friend 2 sees Friend 1's HCI block" requirement) without the user having to toggle a setting.

**`event_participants`**
- `event_id` uuid, FK → `events.id`
- `user_id` uuid, FK → `profiles.id`
- `status` enum: `pending` | `accepted` | `declined` | `maybe`
- `invited_at` timestamptz
- `responded_at` timestamptz, nullable
- PRIMARY KEY (event_id, user_id)

**`friendships`**
- `user_id` uuid (smaller of the two IDs)
- `friend_id` uuid (larger of the two IDs)
- `status` enum: `pending` | `accepted`
- `requested_by` uuid (which party sent the request)
- `created_at` timestamptz
- PRIMARY KEY (user_id, friend_id)

**`groups`**
- `id` uuid, primary key
- `name` text
- `description` text, nullable
- `course_id` uuid, FK → `courses.id`, nullable
- `avatar_color` text
- `initials` text
- `owner_id` uuid, FK → `profiles.id`
- `created_at` timestamptz

**`group_members`**
- `group_id` uuid, FK → `groups.id`
- `user_id` uuid, FK → `profiles.id`
- `role` enum: `owner` | `admin` | `member`
- `joined_at` timestamptz
- PRIMARY KEY (group_id, user_id)

**`messages`**
- `id` uuid, primary key
- `group_id` uuid, FK → `groups.id`
- `author_id` uuid, FK → `profiles.id`
- `body` text
- `pinned` boolean, default false
- `created_at` timestamptz

**Presence** — not a table. Uses Supabase Realtime Presence channels.

### 4.2 Row-Level Security (the critical rules)

**`events` SELECT policy** — a user can see an event if ANY of:
1. `owner_id = auth.uid()`
2. There's a row in `event_participants` with `event_id = events.id AND user_id = auth.uid() AND status IN ('pending', 'accepted', 'maybe')`
3. `group_id IS NOT NULL` AND user is in `group_members` for that group
4. `course_id IS NOT NULL` AND visibility = `friends` AND:
   - user has an `enrollments` row for `course_id` (i.e. same course as owner) AND
   - user and owner are accepted friends (row in `friendships` with `status = accepted`)

**This implements the shared-class rule**: Friend 2 sees Friend 1's HCI block only if both are enrolled in the same global HCI course AND are friends AND the event visibility is `friends`.

**`events` INSERT/UPDATE/DELETE**: owner only.

**`messages` SELECT/INSERT**: only for group members.

**`friendships` SELECT**: only if `auth.uid() IN (user_id, friend_id)`.

**`groups` SELECT**: any authenticated user (groups are discoverable by name). INSERT: any authenticated user. UPDATE/DELETE: owner only.

**`group_members`**: SELECT visible to all group members. INSERT/DELETE: owner or admin.

**`courses`**: SELECT for any authenticated user (courses are globally discoverable). INSERT for any authenticated user (creates-or-returns semantics handled in service layer via `ON CONFLICT (code) DO NOTHING`). UPDATE/DELETE restricted (courses are not edited/deleted in MVP; cleanup deferred).

**`enrollments`**: SELECT for `user_id = auth.uid()` AND for accepted friends sharing that `course_id` (so we know who else is in your HCI class). INSERT/UPDATE/DELETE for `user_id = auth.uid()`.

**`class_meetings`**: SELECT visible to owner AND to accepted friends sharing that `course_id`. Required so the availability engine can detect when an invited friend is in class during the proposed time. INSERT/UPDATE/DELETE: owner only.

**Enrollment removal (user "drops" a course):**
- Deletes the `enrollments` row and any `class_meetings` for that user + course
- Existing `events` the user owns with that `course_id` keep their time but lose the course label (sets `course_id = NULL` on those rows)
- The global `courses` row is preserved (other users may still be enrolled)

### 4.3 Indexes

- `events (owner_id, start_at)` — "my events this week"
- `events (start_at, end_at)` — range scans
- `event_participants (user_id, status)` — "my invites"
- `messages (group_id, created_at DESC)` — chat scroll
- `enrollments (user_id)` — "my courses"
- `enrollments (course_id)` — "who's also in this course"
- `courses (code)` — already unique; used for add-course search
- `class_meetings (user_id, day_of_week)` — weekly availability expansion
- `friendships (user_id, status)` and `(friend_id, status)` — friend lookups

---

## 5. Core Features

### 5.1 Authentication

- Supabase email+password auth
- Signup: name, school email, password (required); username, major, grad year (optional onboarding step)
- Password min 8 chars, email format validation, required-field validation with inline errors
- Persistent session (Supabase SDK handles refresh tokens)
- Protected routes redirect to `/login` with return-to URL
- Logout clears session and returns to `/login`
- Email verification optional for MVP (Supabase settings toggle)

### 5.2 Routing

| Path | Page | Protected |
|---|---|---|
| `/login` | LoginPage | No |
| `/signup` | SignupPage | No |
| `/` | Redirects to `/dashboard` if auth'd, else `/login` | — |
| `/dashboard` | DashboardPage (3-column layout with calendar) | Yes |
| `/groups/:groupId` | GroupPage (chat + upcoming sessions) | Yes |
| `/settings` | SettingsPage | Yes |

### 5.3 Calendar & Events

- Weekly time-grid view preserved (FullCalendar)
- Previous/next/today controls
- Current visible date range shown in header
- Drag and resize events persist to Supabase (optimistic update; revert on error)
- Events query scoped to current visible week (`start_at >= weekStart AND end_at <= weekEnd`)
- Query returns: own events + accepted/pending participant events + group events + friend-shared-course events (via RLS — client just selects from `events`)
- Click event → opens **Event Details Panel** (side drawer) with full info, participant list with status chips, invite actions, edit/delete buttons
- Select time range → opens **Create Event Drawer** (side drawer, not popover)
- Color-coded by course; icons + labels supplement color for accessibility
- "Shared" badge on events user doesn't own

**Class meetings** appear on the calendar as non-editable background blocks and count as busy time for the owning user. They come from `class_meetings` expanded across the visible week.

### 5.4 Create Event Flow

Side drawer (not a small modal) with:
- Title (default: "Study Session" or course code if course selected)
- Course picker (dropdown of user's enrolled courses, optional)
- Date + start time + end time
- Location / meeting link (text field)
- Description / agenda (textarea)
- Visibility: Private | Friends | Group
- Group picker (if Group visibility)
- Invitees: friend multi-select with inline availability indicators

**Availability display:** each friend row shows:
- Green check + "Available" if no conflicts in selected range
- Red circle + "Busy — [reason]" with expandable conflict detail
- Not color-alone: always paired with icon and text

### 5.5 Collision Detection & Join Suggestion

When the user selects a time range that overlaps with an existing event they can see (via RLS — their own events, invited events, or shared-course friend events), show an inline banner in the create drawer:

> *"Allison already has an HCI study session 12–2pm. Join instead of creating a new one?"* [Join Existing] [Create Separately]

If **Join Existing**: new event is NOT created. Current user is added to `event_participants` with `status = accepted`. Drawer closes with a success toast.
If **Create Separately**: normal create flow continues.

Only suggests joining when the overlapping event is tied to a mutual course (the event has a `course_id` both users are enrolled in), so you don't get "join Allison's doctor appointment" suggestions.

### 5.6 Availability Engine (`lib/availability.ts`)

Pure functions, no external deps. Input: events + class meetings + time range. Output: conflict results.

```ts
export function isTimeSlotFree(
  userId: string,
  range: { start: Date; end: Date },
  events: Event[],
  classMeetings: ExpandedClassMeeting[]
): boolean;

export function findConflicts(
  range: { start: Date; end: Date },
  events: Event[],
  classMeetings: ExpandedClassMeeting[]
): Conflict[];

export function getAvailableFriends(
  range: { start: Date; end: Date },
  friends: Profile[],
  eventsByUser: Record<string, Event[]>,
  classMeetingsByUser: Record<string, ExpandedClassMeeting[]>
): FriendAvailability[];

export function detectJoinableOverlap(
  range: { start: Date; end: Date },
  currentUserCourseIds: string[],
  visibleEvents: Event[],
  currentUserId: string
): Event | null;
```

Unit tests cover: exact overlap, partial overlap, adjacent (no conflict), no courses in common, class meeting conflicts, timezone edge cases.

---

## 6. Social Features

### 6.1 Courses Management

- "+" button in left sidebar header opens AddCourseModal
- Flow:
  1. User types course code (e.g. "CS4063"). Service performs case-insensitive lookup.
  2. If course exists globally → prefills name; user sets personal color + instructor + class meeting times.
  3. If course does not exist → user enters name as well; the course is created globally on save.
- Fields: code, name, color (palette picker, per-user via enrollment), instructor (optional), class meeting times (optional: day-of-week + start + end, repeatable)
- Edit via hover menu on course row (edits the user's enrollment metadata only, not the global course row)
- "Drop course" (remove enrollment) via hover menu with confirmation: "Your class meetings for CS4063 will be removed. Events tagged with this course will keep their time but lose the course label."
- Courses appear in sidebar and are available in event creation

### 6.2 Friends

- "+" on Friends section opens AddFriendModal
- Search by username or school_email
- Send friend request → creates `friendships` row with `status = pending`
- Recipient sees request in notifications / friends list → accepts or declines
- Accepted friends show in right sidebar with availability status (text + icon + color)
- Unfriend: hover menu + confirmation dialog

### 6.3 Groups

- "+" on Groups section opens CreateGroupModal
- Fields: name, description (optional), course association (optional), initial members (multi-select from friends)
- Click group in sidebar → navigates to `/groups/:groupId`
- Group page: member list + chat + upcoming sessions
- Owner/admin can invite/remove members, delete group (with confirmation)

### 6.4 Group Chat / Message Board

- Message list with sender avatar, name, timestamp, body
- Composer at bottom: textarea + send button (Enter sends, Shift+Enter newline)
- Realtime updates via Supabase channel subscription on `messages`
- Scroll-to-bottom on new message if user is near bottom; "New messages ↓" chip otherwise
- Empty state: "No messages yet. Start the conversation."
- Optional MVP: pinned message at top

### 6.5 Event Invitation Flow

- Creator selects invitees in create drawer
- Creates `event_participants` rows with `status = pending`
- Invitees see pending events in their calendar with visual distinction (striped border or "Invited" chip)
- Clicking opens details panel with Accept / Decline / Maybe buttons
- Status updates reflect on the event (accepted participants shown in avatars)

### 6.6 Settings / Profile

- `/settings` page with:
  - Profile: name, username, school_email (read-only if used for auth), major, grad year, avatar color
  - Availability: manual status override (available / studying / busy) + custom status text
  - Preferences: default event visibility, default event duration
  - Account: change password, logout, delete account

---

## 7. UI Preservation & Consolidations

### 7.1 Preserved from Mockups

- Blue top navigation with StudySync logo
- Left sidebar with course list (colored stripes)
- Center weekly calendar as focus
- Right sidebar with search, friends, groups
- Floating/drawer modals for creation
- Soft rounded cards, subtle shadows
- Color-coded events by course
- Participant avatars on events
- Discord-style status dot on profile avatar (already implemented)

### 7.2 Consolidations / Changes

1. **Quick Invite card** in left sidebar → **removed**. The "+" buttons on Friends and Groups handle their respective add flows. Quick Invite was redundant and its function was ambiguous.
2. **Replaced with**: compact **"+ New Event"** CTA button in the left sidebar (persistent entry point for the #1 app action).
3. **Create event popover** → **side drawer**. Too many fields for a tiny popover once availability and invitees are added.
4. **Event click** → opens side drawer with full details + actions (currently no click handler).
5. **Course sidebar** gets a "+" on its header, matching the friends/groups pattern.
6. **Header status** already moved to bottom-left profile (Discord-style).

---

## 8. HCI / UX Standards Applied Throughout

- **Visibility of system status:** loading spinners, optimistic updates with revert, toast on success/error
- **Recognition over recall:** dropdowns pre-populated with user's courses/friends; default values
- **User control and freedom:** escape closes modals, undo on destructive actions where reasonable
- **Error prevention:** required-field indicators, inline validation, confirm on destructive actions
- **Consistency:** "+" pattern for Add across Courses, Friends, Groups; same drawer pattern for Create/Edit
- **Color + icon + text** for all status (no color-alone indicators)
- **Focus management:** focus trap in modals, escape to close, visible focus rings
- **Empty states** for: no courses, no friends, no groups, no events this week, no messages, no invites
- **Keyboard accessibility:** all buttons reachable by Tab, Enter/Space activation, aria-labels

---

## 9. Testing

Unit tests (Vitest) cover:
- `lib/time.ts` — week math, timezone handling, range intersection
- `lib/availability.ts` — all conflict detection functions
- `services/events.service.ts` validation logic (time ordering, required fields)

Integration tests deferred post-MVP.

---

## 10. Build Phases (Priority Order)

1. **Foundation** — TS migration, Supabase project setup, env vars, Zustand bootstrap, React Router, Vitest setup, folder restructure
2. **Auth** — login/signup/logout/protected routes/session persistence
3. **Database & RLS** — schema deployment, RLS policies, seed demo data, types generation
4. **Courses** — add/edit/remove, class meetings, sidebar integration
5. **Events (persistence)** — persistent events, drag/resize saved, event details panel, create drawer
6. **Availability engine** — pure lib + unit tests, wire into create drawer
7. **Friends** — requests, search, accept/decline, availability inline
8. **Invites + collision join** — invite individuals/groups to events, pending/accepted/declined, join-suggestion banner
9. **Groups** — create, members, navigation
10. **Group chat** — messages + realtime
11. **Settings** — profile, status, preferences
12. **Polish** — empty states, toasts, skeletons, accessibility pass, responsive

---

## 11. Environment & Setup

- `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase project setup documented in README
- SQL migrations stored in `supabase/migrations/`
- Seed data in `supabase/seed.sql`
- `npm run dev`, `npm run build`, `npm run test` all documented

---

## 12. Known Limitations / Out of Scope

- No mobile native app (React Native deferred)
- No file uploads in messages
- No message threads or reactions
- No push notifications (in-app toasts only)
- No calendar sync with Google/Apple/Outlook
- No recurring events beyond class meetings
- No timezone selection (uses browser local)
- No admin panel
- Email verification optional for MVP
- Course catalog is per-user (no global course DB); duplication possible

---

## 13. Open Questions

None at spec-writing time. All architectural decisions locked in during brainstorming.
