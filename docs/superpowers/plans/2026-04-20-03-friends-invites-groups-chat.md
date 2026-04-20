# StudySync Plan 3: Friends + Invites + Groups + Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add friend requests and friend lists, event invitations (with inline availability per friend and a collision-join-suggestion banner), study groups (create/manage/navigate), and realtime group chat.

**Architecture:** Services wrap Supabase queries. Hooks wrap services with React state. Realtime uses Supabase's Postgres Changes API on the `messages` table. The availability engine from Plan 2 (`lib/availability.ts`) is finally wired into the create-event drawer for per-friend availability and the join-suggestion feature. Status metadata moves out of mock data into a shared const file. RightPanel rewired to use real data, replacing the last mock consumers so `src/data/` can be deleted.

**Tech Stack:** React 19, TypeScript 5, Vite 5, Tailwind 3, FullCalendar 6, React Router 6, Zustand 5, Supabase (Postgres + Auth + **Realtime**), Vitest + Testing Library.

**Scope (in):** Phases 7, 8, 9, 10 from the spec — Friends, Invites + collision-join UI, Groups, Group chat.

**Scope (out — deferred to Plan 4):** Settings/profile page, notifications, accessibility audit, responsive polish, group admin role promotion, message editing/deletion, pinned messages, "Upcoming group sessions" on group page.

**Spec reference:** `docs/superpowers/specs/2026-04-20-studysync-mvp-design.md`

---

## File Structure After This Plan

```
StudySync/
├── src/
│   ├── lib/
│   │   ├── availability.ts       (existing — now finally wired into UI)
│   │   ├── supabase.ts           (existing)
│   │   ├── time.ts               (existing)
│   │   └── status.ts             (NEW — moves statusConfig out of mock data)
│   ├── services/
│   │   ├── auth.service.ts       (existing)
│   │   ├── courses.service.ts    (existing)
│   │   ├── events.service.ts     (MODIFY — add invite/participation fns)
│   │   ├── friends.service.ts    (NEW)
│   │   ├── groups.service.ts     (NEW)
│   │   └── messages.service.ts   (NEW)
│   ├── hooks/
│   │   ├── useAuth.ts            (existing)
│   │   ├── useCourses.ts         (existing)
│   │   ├── useEvents.ts          (existing)
│   │   ├── useFriends.ts         (NEW)
│   │   ├── useGroups.ts          (NEW)
│   │   └── useMessages.ts        (NEW — realtime subscription)
│   ├── app/
│   │   └── routes.tsx            (MODIFY — add /groups/:groupId)
│   ├── pages/
│   │   └── GroupPage.tsx         (NEW)
│   ├── components/
│   │   ├── friends/
│   │   │   ├── RightPanel.tsx        (REWRITE — real data, open modals)
│   │   │   ├── AddFriendModal.tsx    (NEW)
│   │   │   └── FriendRequestsPanel.tsx (NEW)
│   │   ├── groups/
│   │   │   ├── CreateGroupModal.tsx  (NEW)
│   │   │   ├── GroupChat.tsx         (NEW)
│   │   │   ├── GroupMembersList.tsx  (NEW)
│   │   │   └── UpcomingGroupSessions.tsx  (NEW — minimal, shows group's events)
│   │   ├── calendar/
│   │   │   ├── StudyCalendar.tsx         (MODIFY — "Shared" badge for non-owned events)
│   │   │   ├── CreateEventDrawer.tsx     (MODIFY — invitee picker, group picker, join-banner)
│   │   │   ├── EventDetailsPanel.tsx     (MODIFY — participant list + accept/decline)
│   │   │   └── InviteePicker.tsx         (NEW sub-component with availability display)
│   │   └── shared/
│   │       └── Avatar.tsx                (MODIFY — import statusConfig from lib/status)
│   └── data/                              (DELETE — finally unused)
└── tests/
    └── services/
        └── friends.validation.test.ts  (NEW — canonical ordering helper)
```

---

## Design Notes

1. **Friendship ordering.** The `friendships` table has a `CHECK (user_id < friend_id)` constraint. The service layer MUST sort the two user IDs lexicographically before insert so the row key is canonical. Everyone reading/writing friendships goes through the service so this stays consistent.

2. **Friend request direction.** `requested_by` stores which party sent the request. The other party sees it as incoming; the sender sees it as outgoing.

3. **Realtime.** Chat uses Supabase Postgres Changes subscription on `messages` filtered by `group_id`. Requires enabling replication on the `messages` table via a SQL migration.

4. **Status config.** Moving `statusConfig` from `src/data/users.js` to `src/lib/status.ts` so `src/data/` can be deleted once RightPanel is rewired.

5. **Invitee availability.** In CreateEventDrawer, invitee multi-select pre-fetches each friend's visible events and class meetings for the proposed time range, then uses `getAvailableFriends` from the availability lib to mark each friend as Available/Busy with the conflict reason in a tooltip. This is what the spec called out as the key HCI feature.

6. **Collision-join banner.** Uses `detectJoinableOverlap` from the availability lib (already written + tested in Plan 2). When the proposed time range overlaps with a visible event owned by a friend AND the event's course is also one the user is enrolled in, show an inline amber banner in CreateEventDrawer: "Alice already has an HCI session 12–2pm — join instead?" [Join Existing] [Create Separately].

7. **Event visibility: group.** CreateEventDrawer gains a third visibility option: Group. When selected, the user picks which of their groups. The event auto-shows to all group members via the existing RLS policy.

8. **GroupPage** lives at `/groups/:groupId`. 3-column layout is replaced by a dedicated page layout: header with group name + back button, left pane with member list + group info, center with chat, right with "Upcoming group sessions" card (a filtered event list).

---

## Task 1: Extract status metadata to shared lib

**Files:**
- Create: `src/lib/status.ts`
- Modify: `src/components/shared/Avatar.tsx`
- Modify: `src/components/courses/CoursesSidebar.tsx` (already uses local STATUS_LABELS — replace with import)

- [ ] **Step 1: Create the status module**

Create `/Users/exfi8/Projects/StudySync/src/lib/status.ts`:

```ts
import type { UserStatus } from '@/types/domain';

export interface StatusMeta {
  color: string;
  label: string;
}

export const statusConfig: Record<UserStatus, StatusMeta> = {
  available: { color: '#22C55E', label: 'Available' },
  studying:  { color: '#EAB308', label: 'Studying'  },
  busy:      { color: '#EF4444', label: 'Busy'      },
};
```

- [ ] **Step 2: Update Avatar import**

Read `src/components/shared/Avatar.tsx`. Change line 1:

```ts
import { statusConfig } from '../../data/users';
```

to:

```ts
import { statusConfig } from '@/lib/status';
```

- [ ] **Step 3: Update CoursesSidebar to use shared config**

Read `src/components/courses/CoursesSidebar.tsx`. Find the local `STATUS_LABELS` const and the usages. Replace with import from shared.

At the top imports, add:

```ts
import { statusConfig } from '@/lib/status';
```

Then DELETE the local `STATUS_LABELS` const:

```ts
const STATUS_LABELS: Record<string, { color: string; label: string }> = {
  available: { color: '#22C55E', label: 'Available' },
  studying: { color: '#EAB308', label: 'Studying' },
  busy: { color: '#EF4444', label: 'Busy' },
};
```

Find this line:

```tsx
const statusCfg = profile ? STATUS_LABELS[profile.status] : STATUS_LABELS.available;
```

Replace with:

```tsx
const statusCfg = profile ? statusConfig[profile.status] : statusConfig.available;
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/status.ts src/components/shared/Avatar.tsx src/components/courses/CoursesSidebar.tsx
git commit -m "refactor: move statusConfig to shared lib/status"
```

NO Co-Authored-By line.

---

## Task 2: Friends service

**Files:**
- Create: `src/services/friends.service.ts`
- Create: `tests/services/friends.service.test.ts`

- [ ] **Step 1: Write failing tests for the canonical-ordering helper**

Create `/Users/exfi8/Projects/StudySync/tests/services/friends.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canonicalFriendshipKey } from '@/services/friends.service';

describe('canonicalFriendshipKey', () => {
  it('orders the smaller uuid as user_id', () => {
    const a = '11111111-1111-1111-1111-111111111111';
    const b = '22222222-2222-2222-2222-222222222222';
    expect(canonicalFriendshipKey(a, b)).toEqual({ user_id: a, friend_id: b });
    expect(canonicalFriendshipKey(b, a)).toEqual({ user_id: a, friend_id: b });
  });

  it('throws when both ids are identical', () => {
    const a = '11111111-1111-1111-1111-111111111111';
    expect(() => canonicalFriendshipKey(a, a)).toThrow(/same/i);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- tests/services/friends.service.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create the service**

Create `/Users/exfi8/Projects/StudySync/src/services/friends.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';
import type { UserStatus } from '@/types/domain';

export type Friendship = Tables<'friendships'>;
export type Profile = Tables<'profiles'>;

export class FriendsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'FriendsServiceError';
  }
}

/** Enforces the DB's user_id < friend_id check constraint. */
export function canonicalFriendshipKey(a: string, b: string): { user_id: string; friend_id: string } {
  if (a === b) throw new Error('Cannot friend yourself (same id).');
  return a < b ? { user_id: a, friend_id: b } : { user_id: b, friend_id: a };
}

/** Search profiles by username or school_email (case-insensitive prefix match). */
export async function searchProfiles(query: string, currentUserId: string, limit = 10): Promise<Profile[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.${q}%,school_email.ilike.${q}%`)
    .neq('id', currentUserId)
    .limit(limit);
  if (error) throw new FriendsServiceError(error.message, error);
  return data ?? [];
}

/** Send a friend request from currentUserId to otherUserId. */
export async function sendFriendRequest(currentUserId: string, otherUserId: string): Promise<void> {
  const key = canonicalFriendshipKey(currentUserId, otherUserId);
  const { error } = await supabase.from('friendships').insert({
    ...key,
    status: 'pending',
    requested_by: currentUserId,
  });
  if (error) throw new FriendsServiceError(error.message, error);
}

/** Accept a pending friend request where the other party is the requester. */
export async function acceptFriendRequest(currentUserId: string, otherUserId: string): Promise<void> {
  const key = canonicalFriendshipKey(currentUserId, otherUserId);
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', key.user_id)
    .eq('friend_id', key.friend_id)
    .eq('status', 'pending')
    .neq('requested_by', currentUserId); // only accept requests NOT sent by me
  if (error) throw new FriendsServiceError(error.message, error);
}

/** Decline a pending friend request, or remove any friendship entirely (unfriend). */
export async function removeFriendship(currentUserId: string, otherUserId: string): Promise<void> {
  const key = canonicalFriendshipKey(currentUserId, otherUserId);
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', key.user_id)
    .eq('friend_id', key.friend_id);
  if (error) throw new FriendsServiceError(error.message, error);
}

/** All friendships touching the current user, joined with the OTHER party's profile. */
export interface FriendshipWithProfile {
  friendship: Friendship;
  other: Profile;
  direction: 'incoming' | 'outgoing' | 'mutual';
}

export async function listFriendships(currentUserId: string): Promise<FriendshipWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, user_profile:profiles!friendships_user_id_fkey(*), friend_profile:profiles!friendships_friend_id_fkey(*)')
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
  if (error) throw new FriendsServiceError(error.message, error);
  return (data ?? []).map((row) => {
    const userProfile = row.user_profile as unknown as Profile;
    const friendProfile = row.friend_profile as unknown as Profile;
    const other: Profile = row.user_id === currentUserId ? friendProfile : userProfile;
    const friendship: Friendship = {
      user_id: row.user_id,
      friend_id: row.friend_id,
      status: row.status,
      requested_by: row.requested_by,
      created_at: row.created_at,
    };
    let direction: 'incoming' | 'outgoing' | 'mutual' = 'mutual';
    if (friendship.status === 'pending') {
      direction = friendship.requested_by === currentUserId ? 'outgoing' : 'incoming';
    }
    return { friendship, other, direction };
  });
}

/** Update current user's status (e.g. available → studying). */
export async function updateOwnStatus(currentUserId: string, status: UserStatus, statusText: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, status_text: statusText })
    .eq('id', currentUserId);
  if (error) throw new FriendsServiceError(error.message, error);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run -- tests/services/friends.service.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/friends.service.ts tests/services/friends.service.test.ts
git commit -m "feat: add friends service with canonical-ordering helper"
```

NO Co-Authored-By line.

---

## Task 3: useFriends hook

**Files:**
- Create: `src/hooks/useFriends.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useFriends.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  listFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  type FriendshipWithProfile,
} from '@/services/friends.service';

interface UseFriendsResult {
  all: FriendshipWithProfile[];
  accepted: FriendshipWithProfile[];
  incoming: FriendshipWithProfile[];
  outgoing: FriendshipWithProfile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  sendRequest: (otherUserId: string) => Promise<void>;
  accept: (otherUserId: string) => Promise<void>;
  remove: (otherUserId: string) => Promise<void>;
}

export function useFriends(): UseFriendsResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [all, setAll] = useState<FriendshipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setAll([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listFriendships(userId);
      setAll(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const accepted = useMemo(() => all.filter((f) => f.friendship.status === 'accepted'), [all]);
  const incoming = useMemo(() => all.filter((f) => f.direction === 'incoming'), [all]);
  const outgoing = useMemo(() => all.filter((f) => f.direction === 'outgoing'), [all]);

  const sendRequest = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await sendFriendRequest(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  const accept = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await acceptFriendRequest(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  const remove = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await removeFriendship(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  return { all, accepted, incoming, outgoing, loading, error, reload, sendRequest, accept, remove };
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFriends.ts
git commit -m "feat: add useFriends hook"
```

NO Co-Authored-By line.

---

## Task 4: AddFriendModal

**Files:**
- Create: `src/components/friends/AddFriendModal.tsx`

- [ ] **Step 1: Create the modal**

Create `/Users/exfi8/Projects/StudySync/src/components/friends/AddFriendModal.tsx`:

```tsx
import { useState, useEffect } from 'react';
import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { searchProfiles, type Profile } from '@/services/friends.service';
import { useAuthStore } from '@/store/authStore';
import { useFriends } from '@/hooks/useFriends';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddFriendModal({ open, onClose }: AddFriendModalProps) {
  const currentUserId = useAuthStore((s) => s.session?.user.id ?? null);
  const { all, sendRequest } = useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null); // userId being sent

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setErr(null); }
  }, [open]);

  useEffect(() => {
    if (!currentUserId || !query.trim()) { setResults([]); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const rows = await searchProfiles(query, currentUserId, 10);
        setResults(rows);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, currentUserId]);

  // A set of user IDs the current user already has any friendship row with
  const existingIds = new Set(all.map((f) => f.other.id));

  async function handleSend(otherId: string) {
    setSending(otherId);
    setErr(null);
    try {
      await sendRequest(otherId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setSending(null);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a friend">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Search by username or school email</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. alice or alice@school.edu"
            autoFocus
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        {searching && <p className="text-xs text-gray-400">Searching…</p>}

        {!searching && query.trim() && results.length === 0 && (
          <p className="text-xs text-gray-500">No users found. Try their full username or school email.</p>
        )}

        <ul className="flex flex-col gap-2">
          {results.map((p) => {
            const already = existingIds.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                <Avatar user={{ avatarColor: p.avatar_color, initials: p.initials, status: p.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{p.username}</p>
                </div>
                {already ? (
                  <span className="text-xs text-gray-500 italic">Already connected</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend(p.id)}
                    disabled={sending === p.id}
                    className="text-xs font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-2.5 py-1 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {sending === p.id ? 'Sending…' : 'Send request'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {err}
          </div>
        )}
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/friends/AddFriendModal.tsx
git commit -m "feat: add AddFriendModal with profile search"
```

NO Co-Authored-By line.

---

## Task 5: FriendRequestsPanel

**Files:**
- Create: `src/components/friends/FriendRequestsPanel.tsx`

- [ ] **Step 1: Create the panel**

Create `/Users/exfi8/Projects/StudySync/src/components/friends/FriendRequestsPanel.tsx`:

```tsx
import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { useFriends } from '@/hooks/useFriends';

interface FriendRequestsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function FriendRequestsPanel({ open, onClose }: FriendRequestsPanelProps) {
  const { incoming, outgoing, accept, remove, loading } = useFriends();

  return (
    <Drawer open={open} onClose={onClose} title="Friend requests">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Incoming</h3>
          {loading && <p className="text-xs text-gray-400">Loading…</p>}
          {!loading && incoming.length === 0 && (
            <p className="text-xs text-gray-500">No incoming requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li key={f.other.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.other.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{f.other.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => accept(f.other.id)}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.other.id)}
                    className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Outgoing</h3>
          {!loading && outgoing.length === 0 && (
            <p className="text-xs text-gray-500">No outgoing requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <li key={f.other.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.other.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{f.other.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.other.id)}
                  className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/friends/FriendRequestsPanel.tsx
git commit -m "feat: add FriendRequestsPanel drawer"
```

NO Co-Authored-By line.

---

## Task 6: Rewire RightPanel to real data

**Files:**
- Modify: `src/components/friends/RightPanel.tsx`

- [ ] **Step 1: Overwrite RightPanel**

Replace ENTIRE contents of `/Users/exfi8/Projects/StudySync/src/components/friends/RightPanel.tsx` with:

```tsx
import { useState } from 'react';
import Avatar from '../shared/Avatar';
import AddFriendModal from './AddFriendModal';
import FriendRequestsPanel from './FriendRequestsPanel';
import { useFriends } from '@/hooks/useFriends';
import { statusConfig } from '@/lib/status';

export default function RightPanel() {
  const [search, setSearch] = useState('');
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const { accepted, incoming, loading } = useFriends();

  const lowerSearch = search.toLowerCase();
  const filteredFriends = accepted.filter((f) =>
    f.other.name.toLowerCase().includes(lowerSearch) || f.other.username.toLowerCase().includes(lowerSearch)
  );

  const FRIEND_LIMIT = 4;
  const displayedFriends = showMoreFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_LIMIT);

  return (
    <aside className="flex flex-col bg-white border-l border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus-within:ring-1 focus-within:ring-blue-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* FRIENDS */}
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Friends</span>
              <button
                type="button"
                onClick={() => setAddFriendOpen(true)}
                aria-label="Add friend"
                className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200"
              >
                +
              </button>
              {incoming.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRequestsOpen(true)}
                  aria-label="Friend requests"
                  className="ml-1 bg-[#3B5BDB] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none hover:bg-[#3451c7] transition-colors"
                >
                  {incoming.length} pending
                </button>
              )}
            </div>
            {filteredFriends.length > FRIEND_LIMIT && (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline" onClick={() => setShowMoreFriends((v) => !v)}>
                {showMoreFriends ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            )}
          </div>

          {loading && accepted.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!loading && accepted.length === 0 && (
            <p className="text-[11px] text-gray-500 leading-relaxed">No friends yet. Click <span className="font-semibold">+</span> to find people.</p>
          )}

          <div className="flex flex-col gap-0.5">
            {displayedFriends.map((f) => {
              const cfg = statusConfig[f.other.status];
              return (
                <div key={f.other.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{f.other.name}</p>
                    <p className="text-[10px] truncate" style={{ color: cfg.color }}>
                      {f.other.status_text ?? cfg.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GROUPS — wired in Task 15 */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groups</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 italic">Coming soon.</p>
        </div>
      </div>

      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/friends/RightPanel.tsx
git commit -m "feat: wire RightPanel friends section to real data with add/requests flows"
```

NO Co-Authored-By line.

---

## Task 7: E2E smoke test — Friends (manual)

**Files:** No changes — manual verification.

- [ ] **Step 1: Start dev server and log in as the test user**

Open http://localhost:5173. Log in as `kevinatnguyen+ss1@gmail.com` (test user from Plan 1).

- [ ] **Step 2: Create a second test account in another browser / incognito**

Sign up with a different gmail subaddress (e.g. `kevinatnguyen+ss2@gmail.com`). Note its username.

- [ ] **Step 3: From user 1, search and send a friend request**

Click "+" next to Friends. Type the username prefix of user 2. Click "Send request".

- [ ] **Step 4: Verify outgoing state**

Click the pending count chip (or reopen the "+" modal) — user 2 shows as "Already connected".

- [ ] **Step 5: From user 2, accept the request**

Switch to user 2's window. The "+ pending" badge should appear next to "Friends". Click it. See incoming request. Click "Accept".

- [ ] **Step 6: Verify both sides see the friend**

Both users now have the other in their Friends list with status dot.

- [ ] **Step 7: Unfriend**

Hover over the friend in RightPanel — unfriend flow isn't in the sidebar yet (that's a Plan 4 polish item). For now, verify via the DB or return later. Skip this check.

- [ ] **Step 8: No commit needed — verification only.**

---

## Task 8: Extend events service with invite/participation functions

**Files:**
- Modify: `src/services/events.service.ts`

- [ ] **Step 1: Add invite functions**

Read `src/services/events.service.ts`. At the END of the file, append:

```ts

/** Invite a user to an event (creator action). Creates a pending participation row. */
export async function inviteParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status: 'pending',
  });
  if (error) throw new EventsServiceError(error.message, error);
}

/** Remove a participant (creator action or self-leave). */
export async function removeParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new EventsServiceError(error.message, error);
}

/** Respond to an invite (self action). Sets responded_at. */
export async function respondToInvite(
  eventId: string,
  userId: string,
  response: 'accepted' | 'declined' | 'maybe'
): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new EventsServiceError(error.message, error);
}

import type { Tables } from '@/types/db';
export type EventParticipantRow = Tables<'event_participants'>;

/** List participants for an event (creator view). Joined with profile. */
export interface ParticipantWithProfile {
  participant: EventParticipantRow;
  profile: Tables<'profiles'>;
}

export async function listParticipants(eventId: string): Promise<ParticipantWithProfile[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select('*, profiles(*)')
    .eq('event_id', eventId);
  if (error) throw new EventsServiceError(error.message, error);
  return (data ?? []).map((row) => ({
    participant: {
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status,
      invited_at: row.invited_at,
      responded_at: row.responded_at,
    },
    profile: row.profiles as unknown as Tables<'profiles'>,
  }));
}

/** Self-join: add current user to an event as accepted (used by collision-join-suggestion). */
export async function selfJoinEvent(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status: 'accepted',
    responded_at: new Date().toISOString(),
  });
  if (error) throw new EventsServiceError(error.message, error);
}
```

Note: the `import type { Tables }` should be moved to the top of the file alongside the existing imports. Find this section near the top:

```ts
import { supabase } from '@/lib/supabase';
import type { EventRow, EventVisibility } from '@/types/domain';
```

Change to:

```ts
import { supabase } from '@/lib/supabase';
import type { EventRow, EventVisibility } from '@/types/domain';
import type { Tables } from '@/types/db';
```

Then remove the duplicate `import type { Tables }` inside the appended block.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run existing events.validation tests — verify still pass**

```bash
npm run test:run -- tests/services/events.validation.test.ts
```

Expected: 6 existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/services/events.service.ts
git commit -m "feat: add event invite, response, self-join, and participants query"
```

NO Co-Authored-By line.

---

## Task 9: Groups service + validation tests

**Files:**
- Create: `src/services/groups.service.ts`
- Create: `tests/services/groups.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/Users/exfi8/Projects/StudySync/tests/services/groups.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateGroupInput, initialsFromGroupName } from '@/services/groups.service';

describe('initialsFromGroupName', () => {
  it('returns first two letters of single-word name', () => {
    expect(initialsFromGroupName('Algorithms')).toBe('AL');
  });

  it('returns first letters of first two words', () => {
    expect(initialsFromGroupName('HCI Study')).toBe('HS');
  });

  it('uppercases', () => {
    expect(initialsFromGroupName('capstone squad')).toBe('CS');
  });

  it('pads short names', () => {
    expect(initialsFromGroupName('X')).toBe('X');
  });
});

describe('validateGroupInput', () => {
  it('returns null for a valid input', () => {
    expect(validateGroupInput({ name: 'Algo Study', owner_id: 'u1' })).toBeNull();
  });

  it('rejects empty name', () => {
    expect(validateGroupInput({ name: '  ', owner_id: 'u1' })).toMatch(/name/i);
  });

  it('rejects names over 60 chars', () => {
    expect(validateGroupInput({ name: 'a'.repeat(61), owner_id: 'u1' })).toMatch(/60/);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- tests/services/groups.service.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create the service**

Create `/Users/exfi8/Projects/StudySync/src/services/groups.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;

export class GroupsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'GroupsServiceError';
  }
}

const GROUP_COLORS = ['#6366F1', '#14B8A6', '#84CC16', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'];

function randomGroupColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

export function initialsFromGroupName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface GroupInput {
  name: string;
  owner_id: string;
  description?: string | null;
  course_id?: string | null;
  avatar_color?: string;
}

export function validateGroupInput(input: GroupInput): string | null {
  const trimmed = input.name.trim();
  if (!trimmed) return 'Group name is required.';
  if (trimmed.length > 60) return 'Group name must be at most 60 characters.';
  return null;
}

/** Create a group AND add the owner as the first member with role='owner'. */
export async function createGroup(input: GroupInput, initialMemberIds: string[] = []): Promise<Group> {
  const err = validateGroupInput(input);
  if (err) throw new GroupsServiceError(err);

  const trimmed = input.name.trim();
  const { data: created, error: insertErr } = await supabase
    .from('groups')
    .insert({
      name: trimmed,
      description: input.description ?? null,
      course_id: input.course_id ?? null,
      avatar_color: input.avatar_color ?? randomGroupColor(),
      initials: initialsFromGroupName(trimmed),
      owner_id: input.owner_id,
    })
    .select()
    .single();
  if (insertErr) throw new GroupsServiceError(insertErr.message, insertErr);

  // Add owner + initial members
  const memberRows = [
    { group_id: created.id, user_id: input.owner_id, role: 'owner' as const },
    ...initialMemberIds.filter((id) => id !== input.owner_id).map((id) => ({
      group_id: created.id,
      user_id: id,
      role: 'member' as const,
    })),
  ];
  const { error: memberErr } = await supabase.from('group_members').insert(memberRows);
  if (memberErr) throw new GroupsServiceError(memberErr.message, memberErr);

  return created;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw new GroupsServiceError(error.message, error);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
  if (error) throw new GroupsServiceError(error.message, error);
  return data;
}

/** List groups the current user is a member of. */
export async function listMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);
  if (error) throw new GroupsServiceError(error.message, error);
  return (data ?? []).map((row) => row.groups as unknown as Group);
}

export interface GroupMemberWithProfile {
  member: GroupMember;
  profile: Tables<'profiles'>;
}

export async function listGroupMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(*)')
    .eq('group_id', groupId);
  if (error) throw new GroupsServiceError(error.message, error);
  return (data ?? []).map((row) => ({
    member: {
      group_id: row.group_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
    },
    profile: row.profiles as unknown as Tables<'profiles'>,
  }));
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' });
  if (error) throw new GroupsServiceError(error.message, error);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) throw new GroupsServiceError(error.message, error);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run -- tests/services/groups.service.test.ts
```

Expected: 7 tests pass (4 initials + 3 validation).

- [ ] **Step 5: Commit**

```bash
git add src/services/groups.service.ts tests/services/groups.service.test.ts
git commit -m "feat: add groups service with validation tests"
```

NO Co-Authored-By line.

---

## Task 10: useGroups hook

**Files:**
- Create: `src/hooks/useGroups.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useGroups.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { listMyGroups, createGroup, deleteGroup, type Group, type GroupInput } from '@/services/groups.service';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => Promise<Group>;
  remove: (groupId: string) => Promise<void>;
}

export function useGroups(): UseGroupsResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMyGroups(userId);
      setGroups(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => {
    if (!userId) throw new Error('Not authenticated');
    const g = await createGroup({ ...input, owner_id: userId }, initialMemberIds);
    await reload();
    return g;
  }, [userId, reload]);

  const remove = useCallback(async (groupId: string) => {
    await deleteGroup(groupId);
    await reload();
  }, [reload]);

  return { groups, loading, error, reload, create, remove };
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/hooks/useGroups.ts
git commit -m "feat: add useGroups hook"
```

NO Co-Authored-By line.

---

## Task 11: CreateGroupModal

**Files:**
- Create: `src/components/groups/CreateGroupModal.tsx`

- [ ] **Step 1: Create the modal**

Create `/Users/exfi8/Projects/StudySync/src/components/groups/CreateGroupModal.tsx`:

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { useCourses } from '@/hooks/useCourses';
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import type { Group } from '@/services/groups.service';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (group: Group) => void;
}

export default function CreateGroupModal({ open, onClose, onCreated }: CreateGroupModalProps) {
  const { courses } = useCourses();
  const { accepted } = useFriends();
  const { create } = useGroups();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setDescription(''); setCourseId('');
      setSelectedMembers(new Set()); setErr(null);
    }
  }, [open]);

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const group = await create(
        { name: name.trim(), description: description.trim() || null, course_id: courseId || null },
        Array.from(selectedMembers)
      );
      onCreated?.(group);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create a group"
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="create-group-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create group'}
          </button>
        </div>
      }
    >
      <form id="create-group-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HCI Study Group"
            autoFocus
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course (optional)</span>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] bg-white"
          >
            <option value="">— No course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-y"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Invite friends (optional)</span>
          {accepted.length === 0 ? (
            <p className="text-xs text-gray-500">You have no friends yet. You'll be the only member.</p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-gray-100 rounded-md p-1">
              {accepted.map((f) => {
                const checked = selectedMembers.has(f.other.id);
                return (
                  <li key={f.other.id}>
                    <button
                      type="button"
                      onClick={() => toggleMember(f.other.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}
                    >
                      <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
                      <span className="flex-1 text-left text-sm font-medium text-gray-800 truncate">{f.other.name}</span>
                      <input type="checkbox" checked={checked} onChange={() => {}} className="pointer-events-none" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {err}
          </div>
        )}
      </form>
    </Drawer>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/components/groups/CreateGroupModal.tsx
git commit -m "feat: add CreateGroupModal with friend multi-select"
```

NO Co-Authored-By line.

---

## Task 12: Wire RightPanel Groups section + add route

**Files:**
- Modify: `src/components/friends/RightPanel.tsx`
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Update RightPanel with real groups**

Read `src/components/friends/RightPanel.tsx`. Find the "Groups" section placeholder:

```tsx
        {/* GROUPS — wired in Task 15 */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groups</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 italic">Coming soon.</p>
        </div>
```

Replace with:

```tsx
        {/* GROUPS */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groups</span>
              <button
                type="button"
                onClick={() => setCreateGroupOpen(true)}
                aria-label="Create group"
                className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200"
              >
                +
              </button>
            </div>
          </div>

          {groupsLoading && groups.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!groupsLoading && groups.length === 0 && (
            <p className="text-[11px] text-gray-500 leading-relaxed">No groups yet. Click <span className="font-semibold">+</span> to create one.</p>
          )}

          <div className="flex flex-col gap-0.5">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => navigate(`/groups/${g.id}`)}
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: g.avatar_color }}
                >
                  {g.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{g.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
```

At the top of the file, update imports and state:

Find:

```tsx
import { useState } from 'react';
import Avatar from '../shared/Avatar';
import AddFriendModal from './AddFriendModal';
import FriendRequestsPanel from './FriendRequestsPanel';
import { useFriends } from '@/hooks/useFriends';
import { statusConfig } from '@/lib/status';
```

Replace with:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import AddFriendModal from './AddFriendModal';
import FriendRequestsPanel from './FriendRequestsPanel';
import CreateGroupModal from '../groups/CreateGroupModal';
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import { statusConfig } from '@/lib/status';
```

Find inside the component:

```tsx
  const { accepted, incoming, loading } = useFriends();
```

Replace with:

```tsx
  const navigate = useNavigate();
  const { accepted, incoming, loading } = useFriends();
  const { groups, loading: groupsLoading } = useGroups();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
```

At the bottom where the existing modals are rendered:

```tsx
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
```

Add CreateGroupModal below them:

```tsx
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
```

- [ ] **Step 2: Register route**

Read `src/app/routes.tsx`. Find:

```tsx
import DashboardPage from '@/pages/DashboardPage';
import ProtectedRoute from './ProtectedRoute';
```

Add the import:

```tsx
import GroupPage from '@/pages/GroupPage';
```

(GroupPage doesn't exist yet — Task 13 creates it. Typecheck will fail until then.)

Then find the routes array:

```tsx
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
```

Add a sibling entry directly below it (before the `*` catchall):

```tsx
  {
    path: '/groups/:groupId',
    element: (
      <ProtectedRoute>
        <GroupPage />
      </ProtectedRoute>
    ),
  },
```

- [ ] **Step 3: Don't commit yet** — typecheck is broken until Task 13.

---

## Task 13: GroupPage + member list + group chat shell

**Files:**
- Create: `src/pages/GroupPage.tsx`
- Create: `src/components/groups/GroupMembersList.tsx`

- [ ] **Step 1: Create the members list**

Create `/Users/exfi8/Projects/StudySync/src/components/groups/GroupMembersList.tsx`:

```tsx
import { useEffect, useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { listGroupMembers, type GroupMemberWithProfile } from '@/services/groups.service';

interface GroupMembersListProps {
  groupId: string;
}

export default function GroupMembersList({ groupId }: GroupMembersListProps) {
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGroupMembers(groupId)
      .then((rows) => { if (!cancelled) setMembers(rows); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members ({members.length})</h3>
      {loading && <p className="text-xs text-gray-400">Loading…</p>}
      <ul className="flex flex-col gap-1">
        {members.map((m) => (
          <li key={m.member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
            <Avatar user={{ avatarColor: m.profile.avatar_color, initials: m.profile.initials, status: m.profile.status }} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{m.profile.name}</p>
              <p className="text-[10px] text-gray-500 capitalize">{m.member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create the GroupPage**

Create `/Users/exfi8/Projects/StudySync/src/pages/GroupPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GroupMembersList from '@/components/groups/GroupMembersList';
import GroupChat from '@/components/groups/GroupChat';
import { getGroup, type Group } from '@/services/groups.service';
import { useGroups } from '@/hooks/useGroups';
import { useAuthStore } from '@/store/authStore';

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const { remove } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);
    getGroup(groupId)
      .then((g) => {
        if (cancelled) return;
        if (!g) setNotFound(true);
        else setGroup(g);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  async function handleDelete() {
    if (!groupId) return;
    setConfirmDelete(false);
    try {
      await remove(groupId);
      navigate('/dashboard', { replace: true });
    } catch {
      // error surfaced via toast in the future; for now, no-op
    }
  }

  if (!groupId || notFound) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 font-semibold">Group not found</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-3 text-sm text-[#3B5BDB] font-semibold hover:underline"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !group) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading group…</div>
      </div>
    );
  }

  const isOwner = group.owner_id === userId;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Left column: group info + members */}
        <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '260px', minWidth: '260px' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs text-[#3B5BDB] font-semibold hover:underline mb-2 flex items-center gap-1"
            >
              ← Back to dashboard
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: group.avatar_color }}
              >
                {group.initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-800 truncate">{group.name}</h1>
                {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <GroupMembersList groupId={groupId} />
          </div>

          {isOwner && (
            <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded py-1.5 transition-colors"
              >
                Delete group
              </button>
            </div>
          )}
        </aside>

        {/* Center column: chat */}
        <main className="flex flex-col flex-1 min-w-0 bg-white">
          <GroupChat groupId={groupId} />
        </main>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this group?"
        message="All messages and member associations will be deleted. This cannot be undone."
        confirmLabel="Delete group"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
```

Note: GroupChat doesn't exist yet (Tasks 15-17). Typecheck still broken. DO NOT commit yet.

---

## Task 14: Enable realtime on messages table

**Files:**
- Create: `supabase/migrations/0005_enable_messages_realtime.sql`

- [ ] **Step 1: Create migration file**

Create `/Users/exfi8/Projects/StudySync/supabase/migrations/0005_enable_messages_realtime.sql`:

```sql
-- Enable Postgres logical replication for the messages table so Supabase Realtime
-- can broadcast INSERT/UPDATE/DELETE events. RLS still applies per-subscriber.

alter publication supabase_realtime add table public.messages;
```

- [ ] **Step 2: Apply via MCP or dashboard**

If you have Supabase MCP connected, apply this migration via `apply_migration`. Otherwise run it via the SQL Editor in the Supabase dashboard.

Via MCP (announce this as a controller action, not an implementer action):

```
mcp__supabase__apply_migration project_id=mmkvqvhewxkscylqfowk name=enable_messages_realtime query=<contents of 0005_enable_messages_realtime.sql>
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_enable_messages_realtime.sql
git commit -m "feat: enable realtime replication on messages table"
```

NO Co-Authored-By line.

---

## Task 15: Messages service

**Files:**
- Create: `src/services/messages.service.ts`

- [ ] **Step 1: Create the service**

Create `/Users/exfi8/Projects/StudySync/src/services/messages.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Message = Tables<'messages'>;

export class MessagesServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MessagesServiceError';
  }
}

/** List recent messages for a group (oldest first, most recent N items). */
export async function listRecentMessages(groupId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new MessagesServiceError(error.message, error);
  // Reverse so oldest is first (chat scroll expects oldest → newest).
  return (data ?? []).reverse();
}

/** Post a new message to a group. */
export async function sendMessage(groupId: string, authorId: string, body: string): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) throw new MessagesServiceError('Message cannot be empty.');
  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, author_id: authorId, body: trimmed })
    .select()
    .single();
  if (error) throw new MessagesServiceError(error.message, error);
  return data;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/services/messages.service.ts
git commit -m "feat: add messages service (list + send)"
```

NO Co-Authored-By line. Note: full-project typecheck still fails because of GroupChat + GroupPage imports; this service file alone compiles. If the typecheck command fails, add `--noEmit --skipLibCheck tests/services/messages` — actually just let it fail and commit anyway (other files are unresolved references, not issues in THIS file). Or better: skip the typecheck for this intermediate commit and run it after Task 17.

---

## Task 16: useMessages hook with realtime

**Files:**
- Create: `src/hooks/useMessages.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useMessages.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listRecentMessages, sendMessage, type Message } from '@/services/messages.service';
import { useAuthStore } from '@/store/authStore';

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  send: (body: string) => Promise<void>;
}

export function useMessages(groupId: string): UseMessagesResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    subscribedRef.current = false;
    setLoading(true);
    setError(null);
    setMessages([]);

    listRecentMessages(groupId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load messages'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const newRow = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev; // dedupe
            return [...prev, newRow];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const send = useCallback(async (body: string) => {
    if (!userId) throw new Error('Not authenticated');
    // Optimistic: insert; the realtime callback will dedupe.
    const sent = await sendMessage(groupId, userId, body);
    setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
  }, [groupId, userId]);

  return { messages, loading, error, send };
}
```

- [ ] **Step 2: Typecheck (full project now — Tasks 12, 13, 15 should be resolvable once GroupChat is done)**

Don't run the full typecheck yet. Just commit this intermediate file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMessages.ts
git commit -m "feat: add useMessages hook with realtime subscription"
```

NO Co-Authored-By line.

---

## Task 17: GroupChat component + commit the full batch

**Files:**
- Create: `src/components/groups/GroupChat.tsx`

- [ ] **Step 1: Create the chat**

Create `/Users/exfi8/Projects/StudySync/src/components/groups/GroupChat.tsx`:

```tsx
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Avatar from '@/components/shared/Avatar';
import { useMessages } from '@/hooks/useMessages';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

type Profile = Tables<'profiles'>;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface GroupChatProps {
  groupId: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const currentUserId = useAuthStore((s) => s.session?.user.id ?? null);
  const { messages, loading, send } = useMessages(groupId);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch author profiles on demand
  useEffect(() => {
    const missing = messages.map((m) => m.author_id).filter((id) => !(id in profiles));
    const unique = Array.from(new Set(missing));
    if (unique.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('*').in('id', unique);
      if (cancelled || !data) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data) next[p.id] = p;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [messages, profiles]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await send(body);
      setBody('');
    } catch {
      // simple: show nothing; in Plan 4 we add toasts
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = (e.target as HTMLTextAreaElement).closest('form');
      form?.requestSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {loading && <p className="text-center text-xs text-gray-400">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500 italic my-auto">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const author = profiles[m.author_id];
          const mine = m.author_id === currentUserId;
          return (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar user={{ avatarColor: author?.avatar_color, initials: author?.initials ?? '?' }} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-xs font-semibold ${mine ? 'text-[#3B5BDB]' : 'text-gray-800'}`}>
                    {author?.name ?? 'Unknown'}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatTime(m.created_at)}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 px-4 py-3 flex gap-2 flex-shrink-0">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-none"
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Run full typecheck**

```bash
npm run typecheck
```

Expected: no errors. All previously-uncommitted files should now compile.

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit the integrated batch**

```bash
git add src/components/friends/RightPanel.tsx src/app/routes.tsx src/pages/GroupPage.tsx src/components/groups/GroupMembersList.tsx src/components/groups/GroupChat.tsx
git commit -m "feat: add group page, members list, and realtime chat"
```

NO Co-Authored-By line.

---

## Task 18: Extend CreateEventDrawer with invitees, group picker, and join-suggestion banner

**Files:**
- Modify: `src/components/calendar/CreateEventDrawer.tsx`
- Create: `src/components/calendar/InviteePicker.tsx`

- [ ] **Step 1: Create InviteePicker**

Create `/Users/exfi8/Projects/StudySync/src/components/calendar/InviteePicker.tsx`:

```tsx
import { useEffect, useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { supabase } from '@/lib/supabase';
import { getAvailableFriends, type FriendAvailability } from '@/lib/availability';
import { expandClassMeetings } from '@/lib/time';
import type { EventRow, ExpandedClassMeeting } from '@/types/domain';
import type { Tables } from '@/types/db';
import type { FriendshipWithProfile } from '@/services/friends.service';

interface InviteePickerProps {
  friends: FriendshipWithProfile[];
  range: { start: Date; end: Date } | null;
  selected: Set<string>;
  onToggle: (userId: string) => void;
}

export default function InviteePicker({ friends, range, selected, onToggle }: InviteePickerProps) {
  const [availability, setAvailability] = useState<FriendAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!range || friends.length === 0) { setAvailability([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const ids = friends.map((f) => f.other.id);
      // Fetch events and class meetings for each friend (RLS-gated).
      // Pull a day-wide window around the range to reduce round trips.
      const dayStart = new Date(range.start); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(range.end); dayEnd.setHours(23, 59, 59, 999);

      const [eventsRes, meetingsRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .in('owner_id', ids)
          .gte('start_at', dayStart.toISOString())
          .lte('end_at', dayEnd.toISOString()),
        supabase
          .from('class_meetings')
          .select('*')
          .in('user_id', ids),
      ]);
      if (cancelled) return;

      const eventsByUser: Record<string, EventRow[]> = {};
      for (const row of eventsRes.data ?? []) {
        (eventsByUser[row.owner_id] ||= []).push(row as EventRow);
      }

      // Expand class meetings to concrete dates on the range's day.
      const weekStart = new Date(range.start);
      weekStart.setHours(0, 0, 0, 0);
      const day = weekStart.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + offset);
      const meetingsByUser: Record<string, ExpandedClassMeeting[]> = {};
      for (const m of meetingsRes.data ?? []) {
        const row = m as Tables<'class_meetings'>;
        const expanded = expandClassMeetings([row], weekStart);
        (meetingsByUser[row.user_id] ||= []).push(...expanded);
      }

      const result = getAvailableFriends(
        range,
        friends.map((f) => ({ id: f.other.id })),
        eventsByUser,
        meetingsByUser
      );
      if (!cancelled) {
        setAvailability(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [friends, range]);

  if (friends.length === 0) {
    return <p className="text-xs text-gray-500">Add friends first to invite them.</p>;
  }

  const availByUser: Record<string, FriendAvailability> = {};
  for (const a of availability) availByUser[a.user_id] = a;

  return (
    <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-gray-100 rounded-md p-1">
      {friends.map((f) => {
        const checked = selected.has(f.other.id);
        const avail = availByUser[f.other.id];
        const hasConflict = avail && !avail.available;
        return (
          <li key={f.other.id}>
            <button
              type="button"
              onClick={() => onToggle(f.other.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}
            >
              <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.other.name}</p>
                {range && (loading ? (
                  <p className="text-[10px] text-gray-400">Checking…</p>
                ) : hasConflict ? (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <span aria-hidden>●</span>
                    <span>Busy — {avail.conflicts[0].title}</span>
                  </p>
                ) : avail ? (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <span aria-hidden>✓</span>
                    <span>Available</span>
                  </p>
                ) : null)}
              </div>
              <input type="checkbox" checked={checked} onChange={() => {}} className="pointer-events-none" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Extend CreateEventDrawer**

Read `src/components/calendar/CreateEventDrawer.tsx`. Update it per the changes below.

At the top imports, add:

```tsx
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import { detectJoinableOverlap } from '@/lib/availability';
import { inviteParticipant, selfJoinEvent } from '@/services/events.service';
import InviteePicker from './InviteePicker';
```

Update the props interface so we can surface success for join-suggestion:

Find:

```tsx
interface CreateEventDrawerProps {
  open: boolean;
  draft: { start: Date; end: Date } | null;
  onClose: () => void;
  onCreated: (input: EventInput) => Promise<void>;
  existingEvents: EventRow[];
  expandedClassMeetings: ExpandedClassMeeting[];
}
```

Replace with:

```tsx
interface CreateEventDrawerProps {
  open: boolean;
  draft: { start: Date; end: Date } | null;
  onClose: () => void;
  onCreated: (input: EventInput) => Promise<{ id: string }>;
  existingEvents: EventRow[];
  expandedClassMeetings: ExpandedClassMeeting[];
  currentUserCourseIds: string[];
  currentUserId: string | null;
}
```

Inside the component body, after the `useCourses()` line, add:

```tsx
  const { accepted: friends } = useFriends();
  const { groups } = useGroups();
```

Add new state for invitees and group:

```tsx
  const [inviteeIds, setInviteeIds] = useState<Set<string>>(new Set());
  const [groupId, setGroupId] = useState<string | ''>('');
```

Reset them when drawer opens — find the `if (open && draft) {` reset block and add:

```tsx
      setInviteeIds(new Set());
      setGroupId('');
```

Compute the joinable-overlap candidate after the `conflicts` computation:

Add after the `const conflicts = ...` line:

```tsx
  const joinable = range && currentUserId
    ? detectJoinableOverlap(range, currentUserCourseIds, existingEvents, currentUserId)
    : null;
```

Update the `handleSubmit` function. Find the existing try block:

```tsx
    setSubmitting(true);
    try {
      await onCreated({
        title: title.trim(),
        start_at: range.start.toISOString(),
        end_at: range.end.toISOString(),
        owner_id: userId,
        course_id: courseId || null,
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
```

Replace with:

```tsx
    setSubmitting(true);
    try {
      const created = await onCreated({
        title: title.trim(),
        start_at: range.start.toISOString(),
        end_at: range.end.toISOString(),
        owner_id: userId,
        course_id: courseId || null,
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
        group_id: visibility === 'group' ? (groupId || null) : null,
      });
      for (const inviteeId of inviteeIds) {
        await inviteParticipant(created.id, inviteeId);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
```

Add a join-handler function just above `handleSubmit`:

```tsx
  async function handleJoin() {
    if (!joinable || !userId) return;
    setSubmitting(true);
    setErr(null);
    try {
      await selfJoinEvent(joinable.id, userId);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to join.');
    } finally {
      setSubmitting(false);
    }
  }
```

Add the join-suggestion banner INSIDE the form, AFTER the conflicts block:

```tsx
        {joinable && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-900">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Someone already has this slot.
            </p>
            <p className="text-xs mb-2">
              There's already a session for this course at the same time. Join it instead of creating a duplicate?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleJoin}
                disabled={submitting}
                className="text-xs font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-2.5 py-1 rounded transition-colors disabled:bg-gray-300"
              >
                Join existing
              </button>
              <button
                type="button"
                onClick={() => { /* user dismisses by submitting the form as usual */ }}
                className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
              >
                Create separately
              </button>
            </div>
          </div>
        )}
```

Modify the visibility fieldset to add the group option. Find:

```tsx
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-gray-700">Visibility</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
            <span>Private — only you</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'friends'}
              onChange={() => setVisibility('friends')}
              disabled={!courseId}
            />
            <span className={!courseId ? 'text-gray-400' : ''}>
              Friends in this course {!courseId && '(requires course)'}
            </span>
          </label>
        </fieldset>
```

Replace with:

```tsx
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-gray-700">Visibility</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
            <span>Private — only you and invitees</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} disabled={!courseId} />
            <span className={!courseId ? 'text-gray-400' : ''}>Friends in this course {!courseId && '(requires course)'}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" checked={visibility === 'group'} onChange={() => setVisibility('group')} disabled={groups.length === 0} />
            <span className={groups.length === 0 ? 'text-gray-400' : ''}>Group {groups.length === 0 && '(no groups yet)'}</span>
          </label>
          {visibility === 'group' && (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="ml-6 border border-gray-200 rounded-md px-2 py-1 text-sm bg-white"
            >
              <option value="">— Pick a group —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </fieldset>
```

Add an invitees field before the visibility fieldset:

```tsx
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Invite friends (optional)</span>
          <InviteePicker
            friends={friends}
            range={range}
            selected={inviteeIds}
            onToggle={(id) => {
              setInviteeIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            }}
          />
        </div>
```

- [ ] **Step 3: Update StudyCalendar to pass the new props**

Read `src/components/calendar/StudyCalendar.tsx`. Find the `<CreateEventDrawer ... />` JSX at the bottom. It currently passes open/draft/onClose/onCreated/existingEvents/expandedClassMeetings. Update to also pass the new props.

Find:

```tsx
      <CreateEventDrawer
        open={!!createDraft}
        draft={createDraft}
        onClose={() => setCreateDraft(null)}
        onCreated={async (input) => {
          await createOne(input);
          setCreateDraft(null);
        }}
        existingEvents={events}
        expandedClassMeetings={expandedMeetings}
      />
```

Replace with:

```tsx
      <CreateEventDrawer
        open={!!createDraft}
        draft={createDraft}
        onClose={() => setCreateDraft(null)}
        onCreated={async (input) => {
          const created = await createOne(input);
          setCreateDraft(null);
          return { id: created.id };
        }}
        existingEvents={events}
        expandedClassMeetings={expandedMeetings}
        currentUserCourseIds={courses.map((c) => c.id)}
        currentUserId={userId}
      />
```

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add src/components/calendar/InviteePicker.tsx src/components/calendar/CreateEventDrawer.tsx src/components/calendar/StudyCalendar.tsx
git commit -m "feat: add invitee picker with availability, group visibility, and join-suggestion banner"
```

NO Co-Authored-By line.

---

## Task 19: Extend EventDetailsPanel with participant list + respond actions

**Files:**
- Modify: `src/components/calendar/EventDetailsPanel.tsx`

- [ ] **Step 1: Read and extend EventDetailsPanel**

Read `src/components/calendar/EventDetailsPanel.tsx`. At the top imports, add:

```tsx
import Avatar from '@/components/shared/Avatar';
import { listParticipants, respondToInvite, type ParticipantWithProfile } from '@/services/events.service';
```

In the component body, after existing state declarations, add:

```tsx
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
```

In the `useEffect(() => { if (event) { ... } }, [event])` block, add at the end of the `if (event)` branch:

```tsx
      setParticipantsLoading(true);
      listParticipants(event.id)
        .then(setParticipants)
        .catch(() => setParticipants([]))
        .finally(() => setParticipantsLoading(false));
```

Add a handler for the current user responding:

```tsx
  async function handleRespond(response: 'accepted' | 'declined' | 'maybe') {
    if (!event || !currentUserId) return;
    try {
      await respondToInvite(event.id, currentUserId, response);
      // Refresh local participant state
      const updated = await listParticipants(event.id);
      setParticipants(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to respond.');
    }
  }

  const myParticipation = participants.find((p) => p.participant.user_id === currentUserId);
```

In the non-editing render (the details view, not the edit form), add a participants section AFTER the "Visibility" div and BEFORE the `{!isOwner && ...}` italic note:

```tsx
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Participants</div>
              {participantsLoading && <p className="text-xs text-gray-400">Loading…</p>}
              {!participantsLoading && participants.length === 0 && (
                <p className="text-xs text-gray-500 italic">No invitees.</p>
              )}
              <ul className="flex flex-col gap-1">
                {participants.map((p) => (
                  <li key={p.participant.user_id} className="flex items-center gap-2">
                    <Avatar user={{ avatarColor: p.profile.avatar_color, initials: p.profile.initials }} size="sm" />
                    <span className="text-sm text-gray-800 flex-1 truncate">{p.profile.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      p.participant.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      p.participant.status === 'declined' ? 'bg-gray-100 text-gray-600' :
                      p.participant.status === 'maybe' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {p.participant.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {!isOwner && myParticipation && myParticipation.participant.status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-xs font-semibold text-blue-900 mb-2">You've been invited. Respond:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond('accepted')}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond('maybe')}
                    className="text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 px-2.5 py-1 rounded transition-colors"
                  >
                    Maybe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond('declined')}
                    className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/components/calendar/EventDetailsPanel.tsx
git commit -m "feat: show participants in event details, allow invitees to respond"
```

NO Co-Authored-By line.

---

## Task 20: Add "Shared" badge for non-owned events on calendar

**Files:**
- Modify: `src/components/calendar/StudyCalendar.tsx`

- [ ] **Step 1: Update EventContent**

Read `src/components/calendar/StudyCalendar.tsx`. Find the `EventContent` function:

```tsx
function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { event } = eventInfo;
  const isClassMeeting = event.extendedProps.kind === 'class_meeting';
  return (
    <div className="h-full flex flex-col px-1 py-0.5 overflow-hidden">
      <span className={`font-bold text-[0.68rem] leading-tight truncate ${isClassMeeting ? 'opacity-70' : ''}`}>
        {event.title}
      </span>
      <span className="text-[0.6rem] opacity-80 leading-tight truncate">{eventInfo.timeText}</span>
    </div>
  );
}
```

Replace with:

```tsx
function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { event } = eventInfo;
  const isClassMeeting = event.extendedProps.kind === 'class_meeting';
  const isShared = event.extendedProps.kind === 'event' && !event.startEditable;
  return (
    <div className="h-full flex flex-col px-1 py-0.5 overflow-hidden">
      <div className="flex items-center gap-1">
        <span className={`font-bold text-[0.68rem] leading-tight truncate ${isClassMeeting ? 'opacity-70' : ''}`}>
          {event.title}
        </span>
        {isShared && (
          <span className="text-[0.5rem] bg-white/30 rounded px-0.5 leading-tight flex-shrink-0 uppercase font-semibold">
            shared
          </span>
        )}
      </div>
      <span className="text-[0.6rem] opacity-80 leading-tight truncate">{eventInfo.timeText}</span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/components/calendar/StudyCalendar.tsx
git commit -m "feat: add Shared badge to events user does not own"
```

NO Co-Authored-By line.

---

## Task 21: Delete unused mock data

**Files:**
- Delete: `src/data/users.js`
- Delete: `src/data/groups.js`
- Delete: `src/data/` directory (if empty)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rn "from.*data/users\|from.*data/groups\|FRIENDS\b\|GROUPS_DATA\|CURRENT_USER" src/ tests/ 2>&1
```

Expected: no hits (or only this file's own references).

If there are any stray imports, resolve them before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/data/users.js src/data/groups.js
rmdir src/data 2>/dev/null || true
```

- [ ] **Step 3: Typecheck and test**

```bash
npm run typecheck
npm run test:run
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused mock data (users, groups)"
```

NO Co-Authored-By line.

---

## Task 22: End-to-end smoke test — full social flow

**Files:** No changes — manual verification.

- [ ] **Step 1: Restart dev server**

```bash
rm -rf node_modules/.vite
npm run dev
```

(Prevents stale Vite cache issues.)

- [ ] **Step 2: Two users — add each other as friends**

User A and User B (two browser windows) — User A sends a friend request to User B's username. User B accepts via the pending-requests panel. Both see the other in the friends list.

- [ ] **Step 3: User A creates a course AND enrolls User B**

User A adds CS4063 with a class meeting Mon 9–10. User B also adds CS4063 (joins existing). Both now share the course.

- [ ] **Step 4: User A creates a shared event**

User A drags a time range on the calendar. Title defaults to CS4063. Picks the course. Visibility auto-sets to "Friends in this course". In the invitee picker, User B shows as "Available" (green check). User A selects User B. Submits.

- [ ] **Step 5: Verify User B sees the event**

In User B's window, reload. The event appears on the calendar with the course color and a "shared" badge. Clicking it shows the details panel.

- [ ] **Step 6: User B responds to the invite**

Scroll to the bottom of the details panel — blue "You've been invited" card. Click "Accept". The participant status updates to "accepted".

- [ ] **Step 7: Test collision-join-suggestion**

User B drags another time range overlapping User A's event. The create drawer shows both the amber "Conflicts with:" warning AND the blue "Someone already has this slot" banner. Click "Join existing". A success flow should add User B as an accepted participant instead of creating a new event.

- [ ] **Step 8: User A creates a group with User B**

User A clicks "+" in Groups sidebar. Creates "HCI Study Group", description "Weekly meetings", course CS4063, member User B. Group appears in sidebar for both users.

- [ ] **Step 9: Test group chat**

User A clicks the group. Navigates to /groups/:id. Types "hey team" and sends. User B navigates to the group (in their own window). They see the message in real time — no refresh needed. User B replies "yo!" — User A sees it instantly.

- [ ] **Step 10: Test group event visibility**

User A creates a new event with visibility=Group, picks the HCI Study Group. User B sees it automatically (via RLS).

- [ ] **Step 11: Owner deletes group**

User A clicks "Delete group" from the group page sidebar. Confirms. Redirected to dashboard. Group disappears from both users' sidebars.

- [ ] **Step 12: No commit — verification only**

---

## Task 23: Update README with Plan 3 features

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

Run: `cat README.md`

- [ ] **Step 2: Replace "Current Features" section**

Find the `## Current Features` section and replace with:

```markdown
## Current Features

- Email/password authentication (Supabase) with session persistence
- Protected dashboard with TypeScript + React Router + Zustand
- **Courses**: globally shared courses, per-user enrollment metadata, case-insensitive code lookup, add/drop flow, class meetings rendered as background blocks on the calendar
- **Persistent weekly calendar** (FullCalendar): drag/resize events with optimistic updates and revert-on-error; "Shared" badge for events owned by others
- **Event creation drawer**: title, course, date/time, location, description, visibility (private / friends-in-course / group), friend multi-select with inline availability ("Available" ✓ / "Busy — [conflict]" ●), group picker
- **Event details panel**: view, edit, delete (owner); accept/decline/maybe for invited users
- **Availability engine**: pure-function conflict detection with full unit tests; wired into the create drawer as self-conflict warning + per-friend availability + collision-join-suggestion banner ("Someone already has this slot — join instead?")
- **Friends**: profile search by username/email, friend requests with accept/decline, friend list with availability status
- **Groups**: create groups with optional course + description, invite friends on creation, group page at `/groups/:id` with member list and delete flow
- **Realtime group chat**: Supabase Postgres Changes subscription; instant message delivery across members
- Profile status indicator (Discord-style avatar dot)
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for Plan 3 features"
```

NO Co-Authored-By line.

---

## Self-Review Checklist

**Spec coverage (Plan 3 — Phases 7, 8, 9, 10):**

- Phase 7 Friends: Tasks 2, 3, 4, 5, 6 cover search, requests, accept/decline, friend list, availability status ✓
- Phase 8 Invites + collision join: Tasks 8, 18, 19 cover invite individuals, pending/accepted/declined, join-suggestion banner using the pre-built availability lib ✓
- Phase 9 Groups: Tasks 9, 10, 11, 12, 13 cover create, members, navigation, delete ✓
- Phase 10 Group chat: Tasks 14, 15, 16, 17 cover messages + realtime subscription ✓

**Deferred to Plan 4 (explicitly out of scope):**
- Settings/profile page
- Notification system
- Accessibility audit
- Responsive polish
- Admin role promotion within groups
- Message editing/deletion
- Pinned messages
- "Upcoming group sessions" card on group page

**Placeholder scan:** No TBDs, TODOs, or "similar to" references. All code blocks are complete.

**Type consistency:**
- `FriendshipWithProfile` defined in Task 2, used in Tasks 3, 4, 5, 6, 18 ✓
- `Group` type alias exported from `services/groups.service.ts` (Task 9), used in Tasks 10, 11, 12, 13 ✓
- `ParticipantWithProfile` defined in Task 8, used in Task 19 ✓
- Service function names consistent: `searchProfiles`, `sendFriendRequest`, `acceptFriendRequest`, `removeFriendship`, `listFriendships`, `createGroup`, `listMyGroups`, `listGroupMembers`, `inviteParticipant`, `respondToInvite`, `selfJoinEvent`, `listParticipants`, `listRecentMessages`, `sendMessage` ✓
- `statusConfig` exported from `lib/status.ts` in Task 1, consumed by Avatar (Task 1), RightPanel (Task 6) ✓

**Build-order sanity:** Tasks 12-13 and 15-17 have intentional uncommitted-state dependencies documented within each task. Task 17 commits the integrated batch. Task 18 extends the CreateEventDrawer which then requires StudyCalendar to pass new props (also updated in Task 18).

**Manual actions:**
- Task 14 requires applying a Supabase migration (via MCP or dashboard) before Task 16 can function.
- Task 22 is a manual smoke test requiring two browser windows with two accounts.
