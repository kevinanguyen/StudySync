# StudySync Plan 4: Settings + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings page for profile editing + manual status override, a toast notification system for success/error feedback across every mutation flow, and the remaining polish items (unfriend confirmation, upcoming group sessions card, focus traps, loading skeletons, tablet responsive tweaks).

**Architecture:** Toasts use Zustand's `uiStore` (new) with a `ToastContainer` mounted once at the app root. Settings page at `/settings` edits the current user's profile row directly via `profiles` table, with separate sub-forms for profile, availability, and account. Focus trap is a small custom hook applied to Drawer + ConfirmDialog. Loading skeletons use simple animated Tailwind divs. Responsive layout uses Tailwind's `md:` and `lg:` breakpoints on the existing 3-column shell.

**Tech Stack:** React 19, TypeScript 5, Vite 5, Tailwind 3, React Router 6, Zustand 5, Supabase. No new dependencies.

**Scope (in):** Phases 11 and 12 from the spec — Settings (profile + status override) and Polish (toasts, skeletons, empty states, a11y, responsive, unfriend, upcoming sessions).

**Scope (out — deferred):**
- Delete-account flow (requires Supabase Admin API / edge function; defer to post-MVP)
- Notification inbox (in-app toasts are enough for MVP)
- Password reset via email (use Supabase dashboard for now)
- Default-preferences fields (visibility, duration) — needs schema migration; defer
- Full mobile phone layout (MVP is desktop + tablet only)
- Message edit/delete (deferred)

**Spec reference:** `docs/superpowers/specs/2026-04-20-studysync-mvp-design.md`

---

## File Structure After This Plan

```
src/
├── store/
│   ├── authStore.ts              (existing)
│   └── uiStore.ts                (NEW — toast queue)
├── components/
│   ├── shared/
│   │   ├── Toast.tsx             (NEW — single toast)
│   │   ├── ToastContainer.tsx    (NEW — stack, auto-dismiss)
│   │   ├── Skeleton.tsx          (NEW — loading placeholder)
│   │   ├── Drawer.tsx            (MODIFY — focus trap)
│   │   └── ConfirmDialog.tsx     (MODIFY — focus trap)
│   ├── layout/
│   │   └── Header.tsx            (MODIFY — add settings link)
│   ├── friends/
│   │   └── RightPanel.tsx        (MODIFY — unfriend flow)
│   └── groups/
│       └── UpcomingSessionsCard.tsx  (NEW)
├── hooks/
│   └── useFocusTrap.ts           (NEW)
├── pages/
│   ├── SettingsPage.tsx          (NEW)
│   └── GroupPage.tsx             (MODIFY — add upcoming card)
├── services/
│   └── profile.service.ts        (NEW — update profile, change password)
└── app/
    └── App.tsx                   (MODIFY — mount ToastContainer)
    └── routes.tsx                (MODIFY — add /settings)
```

---

## Design Notes

1. **Toasts fire from anywhere.** Any code can call `useUIStore.getState().showToast({ level: 'success', message: '…' })`. The `ToastContainer` reads the queue and auto-dismisses each toast after 3s. Toast types: `success` (green), `error` (red), `info` (blue).

2. **Settings is a 3-section page**, not a drawer. Unlike course/event/group modals which are transient, settings is a destination page that gets its own scroll, header, and structure.

3. **Status override is live.** When the user picks a new status on the settings page, it immediately writes to `profiles.status` and updates the authStore. Other users see the new status on next query (realtime presence is deferred).

4. **Focus trap is minimal.** A simple `useFocusTrap(ref)` hook that catches Tab/Shift+Tab and cycles focus within the ref element. Used in Drawer and ConfirmDialog.

5. **Upcoming sessions card** uses the existing events RLS. For a group, query events where `group_id = X AND start_at >= now()`. Order ascending, limit 10.

6. **Loading skeletons** are simple placeholder blocks for: course sidebar, friends list, calendar events. Not a full polish pass; just replaces "Loading…" text with visual placeholders where it matters.

7. **Tablet responsive** means "doesn't break at 768–1024px." The 3-column layout cramps but still works. At widths below 768px (phone), we'll show a banner suggesting desktop — that's acceptable for MVP.

---

## Task 1: uiStore for toasts

**Files:**
- Create: `src/store/uiStore.ts`
- Create: `tests/store/uiStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/Users/exfi8/Projects/StudySync/tests/store/uiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/uiStore';

describe('uiStore toasts', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('starts with an empty toast queue', () => {
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('showToast adds a toast with a generated id', () => {
    const id = useUIStore.getState().showToast({ level: 'success', message: 'Saved' });
    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id, level: 'success', message: 'Saved' });
  });

  it('dismissToast removes the matching toast', () => {
    const id1 = useUIStore.getState().showToast({ level: 'success', message: 'A' });
    const id2 = useUIStore.getState().showToast({ level: 'error', message: 'B' });
    useUIStore.getState().dismissToast(id1);
    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id2);
  });

  it('dismissToast with unknown id is a no-op', () => {
    useUIStore.getState().showToast({ level: 'info', message: 'A' });
    useUIStore.getState().dismissToast('does-not-exist');
    expect(useUIStore.getState().toasts).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run -- tests/store/uiStore.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the store**

Create `/Users/exfi8/Projects/StudySync/src/store/uiStore.ts`:

```ts
import { create } from 'zustand';

export type ToastLevel = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
}

interface UIState {
  toasts: Toast[];
  showToast: (input: { level: ToastLevel; message: string }) => string;
  dismissToast: (id: string) => void;
}

function makeId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  showToast: (input) => {
    const id = makeId();
    set((s) => ({ toasts: [...s.toasts, { id, ...input }] }));
    return id;
  },
  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run -- tests/store/uiStore.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/uiStore.ts tests/store/uiStore.test.ts
git commit -m "feat: add uiStore for toast notifications"
```

NO Co-Authored-By line.

---

## Task 2: Toast + ToastContainer components, mounted at app root

**Files:**
- Create: `src/components/shared/Toast.tsx`
- Create: `src/components/shared/ToastContainer.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Create Toast component**

Create `/Users/exfi8/Projects/StudySync/src/components/shared/Toast.tsx`:

```tsx
import { useEffect } from 'react';
import type { Toast as ToastType } from '@/store/uiStore';
import { useUIStore } from '@/store/uiStore';

interface ToastProps {
  toast: ToastType;
  durationMs?: number;
}

const STYLES: Record<ToastType['level'], { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: '✓' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-900',     icon: '!' },
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-900',    icon: 'ⓘ' },
};

export default function Toast({ toast, durationMs = 3000 }: ToastProps) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const style = STYLES[toast.level];

  useEffect(() => {
    const handle = setTimeout(() => dismiss(toast.id), durationMs);
    return () => clearTimeout(handle);
  }, [toast.id, dismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 ${style.bg} ${style.border} ${style.text} border rounded-md shadow-sm px-3 py-2 min-w-[220px] max-w-sm`}
    >
      <span aria-hidden className="font-bold text-sm leading-none mt-0.5">{style.icon}</span>
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create ToastContainer**

Create `/Users/exfi8/Projects/StudySync/src/components/shared/ToastContainer.tsx`:

```tsx
import { useUIStore } from '@/store/uiStore';
import Toast from './Toast';

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Mount ToastContainer in App root**

Read `src/app/App.tsx`. Current contents:

```tsx
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { router } from './routes';

export default function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}
```

Replace with:

```tsx
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';

export default function App() {
  useAuthBootstrap();
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/Toast.tsx src/components/shared/ToastContainer.tsx src/app/App.tsx
git commit -m "feat: add Toast component and mount ToastContainer in app root"
```

NO Co-Authored-By line.

---

## Task 3: Wire toasts into existing mutation flows

Adds success/error toasts to the key mutation call sites. Keeps existing inline error rendering as a backup.

**Files to modify:**
- `src/components/courses/AddCourseModal.tsx`
- `src/components/courses/CoursesSidebar.tsx` (drop course)
- `src/components/friends/AddFriendModal.tsx`
- `src/components/friends/FriendRequestsPanel.tsx`
- `src/components/groups/CreateGroupModal.tsx`
- `src/components/calendar/CreateEventDrawer.tsx`
- `src/components/calendar/EventDetailsPanel.tsx` (delete, respond, save)

- [ ] **Step 1: Wire toasts into AddCourseModal**

Read `src/components/courses/AddCourseModal.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body (after the existing state declarations), add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find the `handleSubmit` try block:

```tsx
    setSubmitting(true);
    try {
      const course = await onAddCourse({
        code: trimmedCode,
        name: trimmedName,
        color,
        instructor: instructor.trim() || null,
      });
      for (const m of meetings) {
        await onAddMeeting({
          course_id: course.id,
          day_of_week: m.day_of_week,
          start_time: `${m.start_time}:00`,
          end_time: `${m.end_time}:00`,
        });
      }
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to add course.');
    } finally {
      setSubmitting(false);
    }
```

Replace with:

```tsx
    setSubmitting(true);
    try {
      const course = await onAddCourse({
        code: trimmedCode,
        name: trimmedName,
        color,
        instructor: instructor.trim() || null,
      });
      for (const m of meetings) {
        await onAddMeeting({
          course_id: course.id,
          day_of_week: m.day_of_week,
          start_time: `${m.start_time}:00`,
          end_time: `${m.end_time}:00`,
        });
      }
      showToast({ level: 'success', message: `Added ${trimmedCode}` });
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add course.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
```

- [ ] **Step 2: Wire toasts into CoursesSidebar (drop course)**

Read `src/components/courses/CoursesSidebar.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find `handleConfirmDrop`:

```tsx
  async function handleConfirmDrop() {
    if (!dropTarget) return;
    try {
      await dropCourse(dropTarget.id);
    } finally {
      setDropTarget(null);
    }
  }
```

Replace with:

```tsx
  async function handleConfirmDrop() {
    if (!dropTarget) return;
    const code = dropTarget.code;
    try {
      await dropCourse(dropTarget.id);
      showToast({ level: 'success', message: `Dropped ${code}` });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to drop course' });
    } finally {
      setDropTarget(null);
    }
  }
```

- [ ] **Step 3: Wire toasts into AddFriendModal**

Read `src/components/friends/AddFriendModal.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find `handleSend`:

```tsx
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
```

Replace with:

```tsx
  async function handleSend(otherId: string) {
    setSending(otherId);
    setErr(null);
    try {
      await sendRequest(otherId);
      showToast({ level: 'success', message: 'Friend request sent' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send request';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSending(null);
    }
  }
```

- [ ] **Step 4: Wire toasts into FriendRequestsPanel**

Read `src/components/friends/FriendRequestsPanel.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find the accept/remove button click handlers (the `onClick={() => accept(f.other.id)}` and `onClick={() => remove(f.other.id)}` inline calls). These currently call `accept` and `remove` directly. Replace them with wrapped handlers.

Add inside the component (near the top, after the `const showToast` line):

```tsx
  async function handleAccept(userId: string, name: string) {
    try {
      await accept(userId);
      showToast({ level: 'success', message: `You are now friends with ${name}` });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to accept' });
    }
  }

  async function handleDecline(userId: string) {
    try {
      await remove(userId);
      showToast({ level: 'info', message: 'Request declined' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to decline' });
    }
  }

  async function handleCancel(userId: string) {
    try {
      await remove(userId);
      showToast({ level: 'info', message: 'Request cancelled' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to cancel' });
    }
  }
```

Then update the button onClicks. Find:

```tsx
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
```

Replace with:

```tsx
                  <button
                    type="button"
                    onClick={() => handleAccept(f.other.id, f.other.name)}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(f.other.id)}
                    className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                  >
                    Decline
                  </button>
```

Find the outgoing "Cancel" button:

```tsx
                <button
                  type="button"
                  onClick={() => remove(f.other.id)}
                  className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
```

Replace with:

```tsx
                <button
                  type="button"
                  onClick={() => handleCancel(f.other.id)}
                  className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
```

- [ ] **Step 5: Wire toasts into CreateGroupModal**

Read `src/components/groups/CreateGroupModal.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find the `handleSubmit` try block:

```tsx
    setErr(null);
    setSubmitting(true);
    try {
      const group = await onCreate(
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
```

Replace with:

```tsx
    setErr(null);
    setSubmitting(true);
    try {
      const group = await onCreate(
        { name: name.trim(), description: description.trim() || null, course_id: courseId || null },
        Array.from(selectedMembers)
      );
      showToast({ level: 'success', message: `Group "${group.name}" created` });
      onCreated?.(group);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create group.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
```

- [ ] **Step 6: Wire toasts into CreateEventDrawer**

Read `src/components/calendar/CreateEventDrawer.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find the `handleSubmit` try block:

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
      const invited = inviteeIds.size > 0 ? ` · ${inviteeIds.size} invited` : '';
      showToast({ level: 'success', message: `Event created${invited}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create event.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
```

Also update `handleJoin`:

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

Replace with:

```tsx
  async function handleJoin() {
    if (!joinable || !userId) return;
    setSubmitting(true);
    setErr(null);
    try {
      await selfJoinEvent(joinable.id, userId);
      showToast({ level: 'success', message: `Joined "${joinable.title}"` });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 7: Wire toasts into EventDetailsPanel**

Read `src/components/calendar/EventDetailsPanel.tsx`. At the top imports, add:

```tsx
import { useUIStore } from '@/store/uiStore';
```

Inside the component body, add:

```tsx
  const showToast = useUIStore((s) => s.showToast);
```

Find `handleSave` try block:

```tsx
    setSubmitting(true);
    try {
      await onUpdate({
        title: title.trim(),
        course_id: courseId || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
      });
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update.');
    } finally {
      setSubmitting(false);
    }
```

Replace with:

```tsx
    setSubmitting(true);
    try {
      await onUpdate({
        title: title.trim(),
        course_id: courseId || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
      });
      showToast({ level: 'success', message: 'Event updated' });
      setEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
```

Find `handleDelete`:

```tsx
  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }
```

Replace with:

```tsx
  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await onDelete();
      showToast({ level: 'success', message: 'Event deleted' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    }
  }
```

Find `handleRespond`:

```tsx
  async function handleRespond(response: 'accepted' | 'declined' | 'maybe') {
    if (!event || !currentUserId) return;
    try {
      await respondToInvite(event.id, currentUserId, response);
      const updated = await listParticipants(event.id);
      setParticipants(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to respond.');
    }
  }
```

Replace with:

```tsx
  async function handleRespond(response: 'accepted' | 'declined' | 'maybe') {
    if (!event || !currentUserId) return;
    try {
      await respondToInvite(event.id, currentUserId, response);
      const updated = await listParticipants(event.id);
      setParticipants(updated);
      const label = response === 'accepted' ? 'Accepted' : response === 'declined' ? 'Declined' : 'Marked as maybe';
      showToast({ level: 'success', message: label });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to respond.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    }
  }
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/courses/AddCourseModal.tsx src/components/courses/CoursesSidebar.tsx src/components/friends/AddFriendModal.tsx src/components/friends/FriendRequestsPanel.tsx src/components/groups/CreateGroupModal.tsx src/components/calendar/CreateEventDrawer.tsx src/components/calendar/EventDetailsPanel.tsx
git commit -m "feat: show success/error toasts for mutation flows"
```

NO Co-Authored-By line.

---

## Task 4: Profile service

**Files:**
- Create: `src/services/profile.service.ts`

- [ ] **Step 1: Create the service**

Create `/Users/exfi8/Projects/StudySync/src/services/profile.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { UserStatus } from '@/types/domain';
import type { Tables } from '@/types/db';

export type Profile = Tables<'profiles'>;

export class ProfileServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProfileServiceError';
  }
}

export interface ProfileUpdateInput {
  name?: string;
  username?: string;
  major?: string | null;
  grad_year?: number | null;
  avatar_color?: string;
}

/** Update editable profile fields for the current user. */
export async function updateProfile(userId: string, patch: ProfileUpdateInput): Promise<Profile> {
  const clean: Partial<Profile> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.username !== undefined) clean.username = patch.username.trim();
  if (patch.major !== undefined) clean.major = patch.major?.trim() || null;
  if (patch.grad_year !== undefined) clean.grad_year = patch.grad_year ?? null;
  if (patch.avatar_color !== undefined) clean.avatar_color = patch.avatar_color;

  // Keep initials in sync with name changes.
  if (patch.name !== undefined) {
    clean.initials = initialsFromName(patch.name.trim());
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new ProfileServiceError(error.message, error);
  return data;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Update current user's status (available/studying/busy) and optional status text. */
export async function updateStatus(userId: string, status: UserStatus, statusText: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status, status_text: statusText })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new ProfileServiceError(error.message, error);
  return data;
}

/** Change password via Supabase auth. User must have a current session. */
export async function changePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new ProfileServiceError('Password must be at least 8 characters.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ProfileServiceError(error.message, error);
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/services/profile.service.ts
git commit -m "feat: add profile service (update profile, status, password)"
```

NO Co-Authored-By line.

---

## Task 5: SettingsPage

**Files:**
- Create: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create the page**

Create `/Users/exfi8/Projects/StudySync/src/pages/SettingsPage.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Avatar from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { updateProfile, updateStatus, changePassword } from '@/services/profile.service';
import { signOut } from '@/services/auth.service';
import { statusConfig } from '@/lib/status';
import type { UserStatus } from '@/types/domain';

const AVATAR_PALETTE = ['#3B5BDB', '#EF4444', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EC4899', '#F59E0B', '#6366F1'];

export default function SettingsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const setProfileInStore = useAuthStore((s) => s.setProfile);
  const resetAuth = useAuthStore((s) => s.reset);
  const showToast = useUIStore((s) => s.showToast);

  // Profile form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_PALETTE[0]);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Status form
  const [status, setStatus] = useState<UserStatus>('available');
  const [statusText, setStatusText] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  // Seed from profile
  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setUsername(profile.username);
    setMajor(profile.major ?? '');
    setGradYear(profile.grad_year ? String(profile.grad_year) : '');
    setAvatarColor(profile.avatar_color);
    setStatus(profile.status);
    setStatusText(profile.status_text ?? '');
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileErr(null);
    if (!name.trim()) { setProfileErr('Name is required.'); return; }
    if (!username.trim()) { setProfileErr('Username is required.'); return; }
    if (gradYear && !/^\d{4}$/.test(gradYear)) { setProfileErr('Grad year must be 4 digits.'); return; }
    setProfileSubmitting(true);
    try {
      const updated = await updateProfile(profile!.id, {
        name,
        username,
        major: major.trim() || null,
        grad_year: gradYear ? Number(gradYear) : null,
        avatar_color: avatarColor,
      });
      setProfileInStore(updated);
      showToast({ level: 'success', message: 'Profile updated' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile.';
      setProfileErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleStatusSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusSubmitting(true);
    try {
      const updated = await updateStatus(profile!.id, status, statusText.trim() || null);
      setProfileInStore(updated);
      showToast({ level: 'success', message: 'Status updated' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to update status.' });
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordErr(null);
    if (newPassword.length < 8) { setPasswordErr('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordErr('Passwords do not match.'); return; }
    setPasswordSubmitting(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast({ level: 'success', message: 'Password updated' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to change password.';
      setPasswordErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleLogout() {
    await signOut();
    resetAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-[#3B5BDB] font-semibold hover:underline">
              ← Back to dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          </div>

          {/* Profile */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Profile</h2>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex items-center gap-4">
                <Avatar user={{ avatarColor, initials: profile.initials, status }} size="lg" showStatus />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{profile.school_email}</p>
                  <p className="text-xs text-gray-500">(email is read-only)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Name <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Username <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Major (optional)</span>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Grad year (optional)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Avatar color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {AVATAR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      aria-label={`Color ${c}`}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        avatarColor === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {profileErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
                  {profileErr}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {profileSubmitting ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Availability */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Availability</h2>
            <form onSubmit={handleStatusSubmit} className="flex flex-col gap-4" noValidate>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold text-gray-700">Status</legend>
                {(Object.keys(statusConfig) as UserStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusConfig[s].color }} />
                    <span>{statusConfig[s].label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Status note (optional)</span>
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. In the library till 4pm"
                  maxLength={80}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {statusSubmitting ? 'Saving…' : 'Update status'}
                </button>
              </div>
            </form>
          </section>

          {/* Account */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Account</h2>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 mb-6" noValidate>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Change password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm"
                  autoComplete="new-password"
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </div>
              {passwordErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
                  {passwordErr}
                </div>
              )}
              <div>
                <button
                  type="submit"
                  disabled={passwordSubmitting || !newPassword}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {passwordSubmitting ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Session</h3>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-md transition-colors"
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/pages/SettingsPage.tsx
git commit -m "feat: add SettingsPage with profile, availability, and account sections"
```

NO Co-Authored-By line.

---

## Task 6: Register /settings route + add gear icon navigation

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/components/courses/CoursesSidebar.tsx`

- [ ] **Step 1: Register the route**

Read `src/app/routes.tsx`. Find the imports near the top:

```tsx
import GroupPage from '@/pages/GroupPage';
```

Add below it:

```tsx
import SettingsPage from '@/pages/SettingsPage';
```

Find the routes array — find this existing block:

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

Add below it:

```tsx
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
```

- [ ] **Step 2: Add gear icon to CoursesSidebar**

Read `src/components/courses/CoursesSidebar.tsx`. Find the bottom profile area:

```tsx
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
          aria-label="Log out"
          title="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
```

Replace with:

```tsx
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
            aria-label="Settings"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            aria-label="Log out"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add src/app/routes.tsx src/components/courses/CoursesSidebar.tsx
git commit -m "feat: add /settings route and gear icon in sidebar"
```

NO Co-Authored-By line.

---

## Task 7: Unfriend flow

**Files:**
- Modify: `src/components/friends/RightPanel.tsx`

- [ ] **Step 1: Add unfriend with hover X and confirmation**

Read `src/components/friends/RightPanel.tsx`. At the top imports, add:

```tsx
import ConfirmDialog from '../shared/ConfirmDialog';
import { useUIStore } from '@/store/uiStore';
import type { FriendshipWithProfile } from '@/services/friends.service';
```

Inside the component body, find:

```tsx
  const { groups, loading: groupsLoading, create: createGroup } = useGroups();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
```

Add after:

```tsx
  const showToast = useUIStore((s) => s.showToast);
  const { remove: removeFriend } = useFriends();
  const [unfriendTarget, setUnfriendTarget] = useState<FriendshipWithProfile | null>(null);
```

Add a handler:

```tsx
  async function handleConfirmUnfriend() {
    if (!unfriendTarget) return;
    const name = unfriendTarget.other.name;
    try {
      await removeFriend(unfriendTarget.other.id);
      showToast({ level: 'info', message: `Unfriended ${name}` });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to unfriend' });
    } finally {
      setUnfriendTarget(null);
    }
  }
```

Find the friend row rendering:

```tsx
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
```

Replace with:

```tsx
            {displayedFriends.map((f) => {
              const cfg = statusConfig[f.other.status];
              return (
                <div key={f.other.id} className="group relative flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{f.other.name}</p>
                    <p className="text-[10px] truncate" style={{ color: cfg.color }}>
                      {f.other.status_text ?? cfg.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnfriendTarget(f)}
                    aria-label={`Unfriend ${f.other.name}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 px-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
```

Find the closing JSX with the existing modals:

```tsx
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} onCreate={createGroup} />
```

Add the confirm dialog below:

```tsx
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} onCreate={createGroup} />
      <ConfirmDialog
        open={!!unfriendTarget}
        title="Unfriend this person?"
        message={unfriendTarget ? `You'll no longer see ${unfriendTarget.other.name}'s shared study blocks. You can send a new friend request anytime.` : ''}
        confirmLabel="Unfriend"
        destructive
        onConfirm={handleConfirmUnfriend}
        onCancel={() => setUnfriendTarget(null)}
      />
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/components/friends/RightPanel.tsx
git commit -m "feat: add unfriend flow with confirmation"
```

NO Co-Authored-By line.

---

## Task 8: Upcoming group sessions card on GroupPage

**Files:**
- Create: `src/components/groups/UpcomingSessionsCard.tsx`
- Modify: `src/pages/GroupPage.tsx`

- [ ] **Step 1: Create the card**

Create `/Users/exfi8/Projects/StudySync/src/components/groups/UpcomingSessionsCard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/types/domain';

interface UpcomingSessionsCardProps {
  groupId: string;
}

export default function UpcomingSessionsCard({ groupId }: UpcomingSessionsCardProps) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('group_id', groupId)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(10);
      if (!cancelled) {
        setEvents((data ?? []) as EventRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Upcoming sessions</h3>
      {loading && <p className="text-xs text-gray-400">Loading…</p>}
      {!loading && events.length === 0 && (
        <p className="text-xs text-gray-500 italic">No upcoming sessions scheduled for this group.</p>
      )}
      <ul className="flex flex-col gap-2">
        {events.map((e) => {
          const start = new Date(e.start_at);
          const end = new Date(e.end_at);
          return (
            <li key={e.id} className="flex flex-col bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
              <p className="text-sm font-semibold text-gray-800">{e.title}</p>
              <p className="text-[11px] text-gray-500">
                {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
              {e.location && <p className="text-[11px] text-gray-500">📍 {e.location}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Mount the card in GroupPage**

Read `src/pages/GroupPage.tsx`. At the top imports, add:

```tsx
import UpcomingSessionsCard from '@/components/groups/UpcomingSessionsCard';
```

Find the chat main section:

```tsx
        <main className="flex flex-col flex-1 min-w-0 bg-white">
          <GroupChat groupId={groupId} />
        </main>
```

Replace with:

```tsx
        <main className="flex flex-col flex-1 min-w-0 bg-white">
          <GroupChat groupId={groupId} />
        </main>

        <aside className="hidden lg:flex flex-col bg-gray-50 border-l border-gray-200 p-4 gap-4 overflow-y-auto" style={{ width: '280px', minWidth: '280px' }}>
          <UpcomingSessionsCard groupId={groupId} />
        </aside>
```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add src/components/groups/UpcomingSessionsCard.tsx src/pages/GroupPage.tsx
git commit -m "feat: add Upcoming group sessions card on GroupPage"
```

NO Co-Authored-By line.

---

## Task 9: Focus trap hook + apply to Drawer and ConfirmDialog

**Files:**
- Create: `src/hooks/useFocusTrap.ts`
- Modify: `src/components/shared/Drawer.tsx`
- Modify: `src/components/shared/ConfirmDialog.tsx`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useFocusTrap.ts`:

```ts
import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within the given container element while active.
 * Tab and Shift+Tab cycle through focusable descendants.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }, [ref, active]);
}
```

- [ ] **Step 2: Apply focus trap to Drawer**

Read `src/components/shared/Drawer.tsx`. At the top imports, add:

```ts
import { useFocusTrap } from '@/hooks/useFocusTrap';
```

Inside the component body, just below the `panelRef` declaration, add:

```ts
  useFocusTrap(panelRef, open);
```

- [ ] **Step 3: Apply focus trap to ConfirmDialog**

Read `src/components/shared/ConfirmDialog.tsx`. At the top imports, add:

```ts
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
```

Wait — check if `useRef` is already imported. If it is, don't duplicate. Look at the existing `import { useEffect, useRef } from 'react';` line. Add only `useFocusTrap` import:

```ts
import { useFocusTrap } from '@/hooks/useFocusTrap';
```

Inside the component body, find the `confirmRef` declaration:

```tsx
  const confirmRef = useRef<HTMLButtonElement>(null);
```

Below it, add:

```tsx
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
```

Find the panel JSX:

```tsx
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
```

Add a ref:

```tsx
      <div ref={panelRef} className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
```

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add src/hooks/useFocusTrap.ts src/components/shared/Drawer.tsx src/components/shared/ConfirmDialog.tsx
git commit -m "feat: add focus trap to Drawer and ConfirmDialog"
```

NO Co-Authored-By line.

---

## Task 10: Loading skeletons

**Files:**
- Create: `src/components/shared/Skeleton.tsx`
- Modify: `src/components/courses/CoursesSidebar.tsx`
- Modify: `src/components/friends/RightPanel.tsx`

- [ ] **Step 1: Create Skeleton**

Create `/Users/exfi8/Projects/StudySync/src/components/shared/Skeleton.tsx`:

```tsx
interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

/** Preset: course row placeholder. */
export function CourseRowSkeleton() {
  return (
    <div className="flex items-stretch rounded-md overflow-hidden bg-gray-50 border border-gray-100">
      <div className="w-1.5 animate-pulse bg-gray-200" />
      <div className="px-2.5 py-2 flex-1 flex flex-col gap-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/** Preset: friend row placeholder. */
export function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1.5">
      <Skeleton className="w-7 h-7 rounded-full" />
      <div className="flex-1 flex flex-col gap-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2 w-14" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use skeletons in CoursesSidebar**

Read `src/components/courses/CoursesSidebar.tsx`. At the top imports, add:

```tsx
import { CourseRowSkeleton } from '../shared/Skeleton';
```

Find:

```tsx
        {loading && courses.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
```

Replace with:

```tsx
        {loading && courses.length === 0 && (
          <div className="flex flex-col gap-1.5">
            <CourseRowSkeleton />
            <CourseRowSkeleton />
            <CourseRowSkeleton />
          </div>
        )}
```

- [ ] **Step 3: Use skeletons in RightPanel**

Read `src/components/friends/RightPanel.tsx`. At the top imports, add:

```tsx
import { FriendRowSkeleton } from '../shared/Skeleton';
```

Find:

```tsx
          {loading && accepted.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
```

Replace with:

```tsx
          {loading && accepted.length === 0 && (
            <div className="flex flex-col gap-0.5">
              <FriendRowSkeleton />
              <FriendRowSkeleton />
              <FriendRowSkeleton />
            </div>
          )}
```

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add src/components/shared/Skeleton.tsx src/components/courses/CoursesSidebar.tsx src/components/friends/RightPanel.tsx
git commit -m "feat: add loading skeletons for course and friend lists"
```

NO Co-Authored-By line.

---

## Task 11: Tablet responsive tweaks

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/GroupPage.tsx`
- Modify: `src/components/calendar/StudyCalendar.tsx`

- [ ] **Step 1: Read existing DashboardPage**

```bash
cat src/pages/DashboardPage.tsx
```

- [ ] **Step 2: Add responsive hiding below tablet**

Overwrite `src/pages/DashboardPage.tsx`:

```tsx
import Header from '@/components/layout/Header';
import CoursesSidebar from '@/components/courses/CoursesSidebar';
import StudyCalendar from '@/components/calendar/StudyCalendar';
import RightPanel from '@/components/friends/RightPanel';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />

      {/* Small-screen notice (under tablet) */}
      <div className="md:hidden bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
        StudySync is best on a tablet or desktop. Some features may be hard to reach on small screens.
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex"><CoursesSidebar /></div>
        <StudyCalendar />
        <div className="hidden lg:flex"><RightPanel /></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Make calendar toolbar wrap nicely on tablet**

Read `src/components/calendar/StudyCalendar.tsx`. Find the toolbar:

```tsx
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
```

Replace with:

```tsx
      <div className="flex items-center flex-wrap gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
```

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add src/pages/DashboardPage.tsx src/components/calendar/StudyCalendar.tsx
git commit -m "feat: responsive tweaks — hide side panels below tablet, wrap toolbar"
```

NO Co-Authored-By line.

---

## Task 12: E2E smoke test — settings + polish

**Files:** No changes — manual verification.

- [ ] **Step 1: Restart dev server**

```bash
rm -rf node_modules/.vite
npm run dev
```

- [ ] **Step 2: Log in, click gear icon in bottom-left**

Expected: navigate to `/settings`.

- [ ] **Step 3: Update profile fields**

Change your name, major, grad year, and avatar color. Click "Save profile". Expected: green success toast in top-right; sidebar profile reflects the new avatar color and (if name changed) new initials.

- [ ] **Step 4: Update status**

Switch status to "Studying" and type "Working on HW3" in the note. Click "Update status". Expected: success toast.

- [ ] **Step 5: Verify status propagates**

Navigate back to dashboard. The status dot in the bottom-left profile shows the new status color and the label reads "Studying" or the status note.

- [ ] **Step 6: Change password**

In settings → Account → Change password. Type a new password twice. Submit. Expected: success toast.

- [ ] **Step 7: Test unfriend flow**

Go to dashboard. Hover over a friend in the right panel → X appears. Click. ConfirmDialog shows. Click "Unfriend". Expected: info toast "Unfriended [name]".

- [ ] **Step 8: Test focus trap**

Open a drawer (e.g. "+ New Event"). Press Tab repeatedly. Expected: focus stays within the drawer.

- [ ] **Step 9: Test upcoming sessions card**

Navigate to a group page. On desktop (width >= 1024px), the right sidebar should show "Upcoming sessions" card. If there are future group events, they appear.

- [ ] **Step 10: Test toast dismissal**

Trigger a few toasts (e.g. multiple status updates). Expected: they stack top-right, auto-dismiss after 3s, and can be manually X'd.

- [ ] **Step 11: Test tablet responsive**

Resize browser to 900px wide. Expected: right panel (Friends/Groups) hides, calendar takes its space. Resize to 700px. Expected: left panel also hides, amber banner appears.

- [ ] **Step 12: No commit — verification only.**

---

## Task 13: Update README with Plan 4 features

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace "Current Features" section**

Read the existing `README.md`. Find the `## Current Features` section and replace it with:

```markdown
## Current Features

- Email/password authentication (Supabase) with session persistence
- Protected dashboard with TypeScript + React Router + Zustand
- **Courses**: globally shared courses, per-user enrollment metadata, case-insensitive code lookup, add/drop flow, class meetings rendered as background blocks on the calendar
- **Persistent weekly calendar** (FullCalendar): drag/resize events with optimistic updates and revert-on-error; "Shared" badge for events owned by others
- **Event creation drawer**: title, course, date/time, location, description, visibility (private / friends-in-course / group), friend multi-select with inline availability ("Available" ✓ / "Busy — [conflict]" ●), group picker
- **Event details panel**: view, edit, delete (owner); accept/decline/maybe for invited users; participant list with status chips
- **Availability engine**: pure-function conflict detection with full unit tests; wired into create drawer as self-conflict warning + per-friend availability + collision-join-suggestion banner ("Someone already has this slot — join instead?")
- **Friends**: profile search by username/email, friend requests with accept/decline, friend list with availability status, pending-request badge, hover-to-unfriend with confirmation
- **Groups**: create groups with optional course + description, invite friends on creation, group page at `/groups/:id` with member list, upcoming sessions card, and delete flow
- **Realtime group chat**: Supabase Postgres Changes subscription; instant message delivery across members; Enter-to-send composer
- **Settings page** (`/settings`): edit profile (name, username, major, grad year, avatar color), manual status override with custom status note, change password
- **Toast notifications**: success/error/info feedback for every mutation, auto-dismiss, stackable
- **Loading skeletons** for courses and friends lists
- **Focus-trapped modals** for keyboard accessibility
- **Responsive layout**: desktop-first, gracefully collapses below tablet
- Profile status indicator (Discord-style avatar dot)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Plan 4 features"
```

NO Co-Authored-By line.

---

## Self-Review Checklist

**Spec coverage (Plan 4 — Phases 11 and 12):**

- Phase 11 Settings: Tasks 4 (service), 5 (page), 6 (route + nav entry) cover profile, status override, change password ✓
- Phase 12 Polish: Tasks 1 + 2 + 3 (toasts), 9 (focus trap), 10 (skeletons), 11 (responsive), 7 (unfriend confirmation) ✓
- Plan 3 deferred items: Task 8 (Upcoming group sessions card) ✓

**Deferred items (documented in scope-out):**
- Delete account flow (Supabase Admin API needed)
- Notification inbox
- Password reset via email
- Default-preferences settings (would need schema migration)
- Full mobile phone layout
- Message edit/delete

**Placeholder scan:** No TBDs, TODOs, or "similar to" references. Every code block is complete.

**Type consistency:**
- `Toast` type exported from `uiStore.ts`, consumed in Toast.tsx + ToastContainer.tsx ✓
- `Profile` type from profile.service.ts aliases `Tables<'profiles'>` — matches usage in SettingsPage ✓
- `useFocusTrap(ref, active)` signature consistent across Drawer and ConfirmDialog ✓
- `showToast({ level, message })` signature identical everywhere (Tasks 2, 3, 7) ✓

**Build-order sanity:** Tasks are independent. Each commits on its own. No deferred commits.

**Manual actions:** Task 12 requires the developer to open the app in a browser and click through the flows. No database migrations required. No external account changes.
