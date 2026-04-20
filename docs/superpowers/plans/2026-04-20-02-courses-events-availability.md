# StudySync Plan 2: Courses + Events + Availability Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-data calendar with persistent Supabase-backed courses, class meetings, and study events. Add a reusable side-drawer event create/edit flow, class-meeting busy blocks on the calendar, and a pure availability engine that detects self-conflicts.

**Architecture:** Services wrap Supabase queries. Hooks wrap services with React state. Pure `lib/availability.ts` stays free of React/Supabase so it can be unit-tested exhaustively. Calendar pulls events for the currently visible week; class meetings expand to dated background events. Snake_case DB field names are used throughout the client (fewer conversions, fewer bugs).

**Tech Stack:** React 19, TypeScript 5, Vite 5, Tailwind 3, FullCalendar 6, React Router 6, Zustand 5, Supabase (Postgres + Auth), Vitest + Testing Library.

**Scope (in):** Phases 4, 5, and 6 from the spec — Courses management, Events persistence, Availability engine.

**Scope (out — deferred to Plan 3):** Friend invitees on events, group visibility picker, event invitation accept/decline flow, collision join-suggestion banner UI (the underlying `detectJoinableOverlap` library function IS written and tested in Plan 2), "Shared" badge for friend-owned events.

**Spec reference:** `docs/superpowers/specs/2026-04-20-studysync-mvp-design.md`

---

## File Structure After This Plan

```
StudySync/
├── src/
│   ├── lib/
│   │   ├── supabase.ts           (existing)
│   │   ├── time.ts               (existing; possibly extended)
│   │   └── availability.ts       (NEW — pure conflict detection)
│   ├── services/
│   │   ├── auth.service.ts       (existing)
│   │   ├── courses.service.ts    (NEW)
│   │   └── events.service.ts     (NEW)
│   ├── hooks/
│   │   ├── useAuth.ts            (existing)
│   │   ├── useCourses.ts         (NEW)
│   │   └── useEvents.ts          (NEW)
│   ├── types/
│   │   ├── db.ts                 (existing, generated)
│   │   └── domain.ts             (NEW — app-friendly type aliases + derived shapes)
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── StudyCalendar.tsx         (REWRITE)
│   │   │   ├── CreateEventDrawer.tsx     (NEW — replaces CreateBlockModal popover)
│   │   │   └── EventDetailsPanel.tsx     (NEW)
│   │   ├── courses/
│   │   │   ├── CoursesSidebar.tsx        (MODIFY — "+ New Event" CTA, "+ add course", real data)
│   │   │   ├── AddCourseModal.tsx        (NEW)
│   │   │   └── ClassMeetingsField.tsx    (NEW — used inside AddCourseModal)
│   │   └── shared/
│   │       ├── Avatar.tsx                (existing)
│   │       ├── CreateBlockModal.tsx      (DELETE at end of plan)
│   │       ├── Drawer.tsx                (NEW — reusable side drawer)
│   │       └── ConfirmDialog.tsx         (NEW)
│   └── data/                              (DELETE at end of plan — courses.js, users.js, groups.js, studyBlocks.js)
└── tests/
    ├── lib/
    │   ├── time.test.ts          (existing; possibly extended)
    │   └── availability.test.ts  (NEW — comprehensive conflict detection tests)
    └── services/
        └── events.validation.test.ts  (NEW — pure validation helpers)
```

---

## Design Notes (for anyone reading this cold)

1. **Snake_case throughout the client.** DB fields stay `owner_id`, `start_at`, etc. No service-layer camelCase mapping. Simpler, matches generated types, one fewer place for bugs.

2. **Courses are globally shared, enrollments are per-user.** To "add" a course, we look it up by `code` (case-insensitive). If it exists, we just insert an `enrollments` row. If not, we insert a `courses` row AND an `enrollments` row. Dropping a course removes `enrollments` + `class_meetings` but preserves the global `courses` row.

3. **Visibility default.** When creating an event: default visibility is `friends` when `course_id` is set, `private` otherwise. Friends visibility is stored correctly today and "lights up" when Plan 3 adds friends.

4. **Class meetings on the calendar.** `class_meetings` are `day_of_week + start_time + end_time`. For the visible week, we expand each row into a dated start/end and render them as non-editable background FullCalendar events with a muted style.

5. **Realtime deferred.** Plan 2 uses refetch-on-mutation. Supabase Realtime subscriptions for events/messages come in Plan 3/4.

6. **No friend/group fields in CreateEventDrawer yet.** Drawer shows: title, course, date, start/end, location, description, visibility (private/friends only — group is deferred). Friend multi-select and group picker come in Plan 3.

7. **Optimistic updates with revert** for drag/resize. Insert/delete use loading states, not optimistic — they require DB round-trip for IDs.

---

## Task 1: Add domain types file

**Files:**
- Create: `src/types/domain.ts`

- [ ] **Step 1: Create domain types**

Create `/Users/exfi8/Projects/StudySync/src/types/domain.ts`:

```ts
import type { Tables, Enums } from './db';

// Direct aliases of Supabase rows (snake_case preserved)
export type Course = Tables<'courses'>;
export type Enrollment = Tables<'enrollments'>;
export type ClassMeeting = Tables<'class_meetings'>;
export type EventRow = Tables<'events'>;
export type EventParticipant = Tables<'event_participants'>;

// Enum aliases
export type UserStatus = Enums<'user_status'>;
export type EventVisibility = Enums<'event_visibility'>;
export type ParticipantStatus = Enums<'participant_status'>;

// Course with the user's enrollment metadata joined in — the shape the sidebar needs
export interface EnrolledCourse extends Course {
  color: string;               // from enrollment (falls back to default_color)
  instructor: string | null;   // from enrollment
  joined_at: string;
}

// A class meeting expanded to a concrete date range for a given week
export interface ExpandedClassMeeting {
  id: string;
  user_id: string;
  course_id: string;
  start_at: Date;
  end_at: Date;
}

// Conflict detail returned by the availability engine
export interface Conflict {
  kind: 'event' | 'class_meeting';
  id: string;
  title: string;          // event title or "CS4063 class"
  start: Date;
  end: Date;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: add domain type aliases for courses and events"
```

---

## Task 2: Courses service

**Files:**
- Create: `src/services/courses.service.ts`

- [ ] **Step 1: Create the courses service**

Create `/Users/exfi8/Projects/StudySync/src/services/courses.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Course, EnrolledCourse, ClassMeeting } from '@/types/domain';

export class CoursesServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CoursesServiceError';
  }
}

/** Case-insensitive lookup by code. Returns null if not found. */
export async function lookupCourseByCode(code: string): Promise<Course | null> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .ilike('code', normalized)
    .maybeSingle();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** Create a new global course row. */
export async function createCourse(input: {
  code: string;
  name: string;
  default_color: string;
  created_by: string;
}): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      default_color: input.default_color,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** Enroll a user in a course with personal color/instructor metadata. */
export async function enrollUserInCourse(input: {
  user_id: string;
  course_id: string;
  color: string;
  instructor: string | null;
}): Promise<void> {
  const { error } = await supabase.from('enrollments').insert({
    user_id: input.user_id,
    course_id: input.course_id,
    color: input.color,
    instructor: input.instructor,
  });
  if (error) throw new CoursesServiceError(error.message, error);
}

/** List the current user's enrollments joined with course data. */
export async function listEnrolledCourses(userId: string): Promise<EnrolledCourse[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('color, instructor, joined_at, courses(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });
  if (error) throw new CoursesServiceError(error.message, error);
  return (data ?? []).map((row) => {
    const course = row.courses as unknown as Course;
    return {
      ...course,
      color: row.color ?? course.default_color,
      instructor: row.instructor ?? null,
      joined_at: row.joined_at,
    };
  });
}

/** Remove the user's enrollment. Class meetings for that course are also deleted via separate service. */
export async function dropEnrollment(userId: string, courseId: string): Promise<void> {
  // Delete class meetings first (no cascade from enrollment).
  const delMeetings = await supabase
    .from('class_meetings')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (delMeetings.error) throw new CoursesServiceError(delMeetings.error.message, delMeetings.error);

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error) throw new CoursesServiceError(error.message, error);
}

/** Update the user's enrollment metadata (color, instructor). */
export async function updateEnrollment(input: {
  user_id: string;
  course_id: string;
  color?: string;
  instructor?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.color !== undefined) patch.color = input.color;
  if (input.instructor !== undefined) patch.instructor = input.instructor;
  const { error } = await supabase
    .from('enrollments')
    .update(patch)
    .eq('user_id', input.user_id)
    .eq('course_id', input.course_id);
  if (error) throw new CoursesServiceError(error.message, error);
}

/** Add a recurring class meeting. */
export async function addClassMeeting(input: {
  user_id: string;
  course_id: string;
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
}): Promise<ClassMeeting> {
  const { data, error } = await supabase
    .from('class_meetings')
    .insert(input)
    .select()
    .single();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** List all class meetings for a user (typically the current user). */
export async function listClassMeetings(userId: string): Promise<ClassMeeting[]> {
  const { data, error } = await supabase
    .from('class_meetings')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  if (error) throw new CoursesServiceError(error.message, error);
  return data ?? [];
}

/** Delete a single class meeting. */
export async function deleteClassMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('class_meetings').delete().eq('id', id);
  if (error) throw new CoursesServiceError(error.message, error);
}

/**
 * Convenience: atomically add-or-enroll.
 * Looks up the course by code. Creates it if missing. Then enrolls the user.
 * Throws if the user is already enrolled (pass existing-enrollment check at call site).
 */
export async function addOrEnrollCourse(input: {
  user_id: string;
  code: string;
  name: string;
  color: string;
  instructor: string | null;
}): Promise<Course> {
  const existing = await lookupCourseByCode(input.code);
  let course: Course;
  if (existing) {
    course = existing;
  } else {
    course = await createCourse({
      code: input.code,
      name: input.name,
      default_color: input.color,
      created_by: input.user_id,
    });
  }
  await enrollUserInCourse({
    user_id: input.user_id,
    course_id: course.id,
    color: input.color,
    instructor: input.instructor,
  });
  return course;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/courses.service.ts
git commit -m "feat: add courses service (lookup/create/enroll/meetings)"
```

---

## Task 3: useCourses hook

**Files:**
- Create: `src/hooks/useCourses.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useCourses.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  listEnrolledCourses,
  listClassMeetings,
  addOrEnrollCourse,
  dropEnrollment,
  addClassMeeting,
  deleteClassMeeting,
} from '@/services/courses.service';
import type { EnrolledCourse, ClassMeeting, Course } from '@/types/domain';

interface UseCoursesResult {
  courses: EnrolledCourse[];
  classMeetings: ClassMeeting[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addCourse: (input: { code: string; name: string; color: string; instructor: string | null }) => Promise<Course>;
  dropCourse: (courseId: string) => Promise<void>;
  addMeeting: (input: { course_id: string; day_of_week: number; start_time: string; end_time: string }) => Promise<ClassMeeting>;
  removeMeeting: (meetingId: string) => Promise<void>;
}

export function useCourses(): UseCoursesResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [classMeetings, setClassMeetings] = useState<ClassMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setCourses([]);
      setClassMeetings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, m] = await Promise.all([listEnrolledCourses(userId), listClassMeetings(userId)]);
      setCourses(c);
      setClassMeetings(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCourse = useCallback(
    async (input: { code: string; name: string; color: string; instructor: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      const course = await addOrEnrollCourse({ user_id: userId, ...input });
      await reload();
      return course;
    },
    [userId, reload]
  );

  const dropCourse = useCallback(
    async (courseId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await dropEnrollment(userId, courseId);
      await reload();
    },
    [userId, reload]
  );

  const addMeeting = useCallback(
    async (input: { course_id: string; day_of_week: number; start_time: string; end_time: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const m = await addClassMeeting({ user_id: userId, ...input });
      await reload();
      return m;
    },
    [userId, reload]
  );

  const removeMeeting = useCallback(
    async (meetingId: string) => {
      await deleteClassMeeting(meetingId);
      await reload();
    },
    [reload]
  );

  return { courses, classMeetings, loading, error, reload, addCourse, dropCourse, addMeeting, removeMeeting };
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCourses.ts
git commit -m "feat: add useCourses hook"
```

---

## Task 4: Reusable Drawer component

**Files:**
- Create: `src/components/shared/Drawer.tsx`

- [ ] **Step 1: Create the Drawer**

Create `/Users/exfi8/Projects/StudySync/src/components/shared/Drawer.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number; // px, default 420
}

export default function Drawer({ open, onClose, title, children, footer, width = 420 }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    // Focus the panel so keyboard nav starts inside the drawer
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 cursor-default"
      />
      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ width }}
        className="relative bg-white h-full shadow-xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-150"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-200 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Drawer.tsx
git commit -m "feat: add reusable side-drawer component"
```

---

## Task 5: ConfirmDialog component

**Files:**
- Create: `src/components/shared/ConfirmDialog.tsx`

- [ ] **Step 1: Create the ConfirmDialog**

Create `/Users/exfi8/Projects/StudySync/src/components/shared/ConfirmDialog.tsx`:

```tsx
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <h3 id="confirm-title" className="text-base font-bold text-gray-800 mb-1">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`text-sm font-semibold text-white px-3 py-1.5 rounded-md transition-colors ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B5BDB] hover:bg-[#3451c7]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog component"
```

---

## Task 6: AddCourseModal (code lookup + form)

**Files:**
- Create: `src/components/courses/AddCourseModal.tsx`
- Create: `src/components/courses/ClassMeetingsField.tsx`

- [ ] **Step 1: Create the ClassMeetingsField sub-component**

Create `/Users/exfi8/Projects/StudySync/src/components/courses/ClassMeetingsField.tsx`:

```tsx
import { useState } from 'react';

export interface ClassMeetingDraft {
  day_of_week: number;
  start_time: string; // "HH:MM"
  end_time: string;
}

interface ClassMeetingsFieldProps {
  meetings: ClassMeetingDraft[];
  onChange: (meetings: ClassMeetingDraft[]) => void;
}

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function ClassMeetingsField({ meetings, onChange }: ClassMeetingsFieldProps) {
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [err, setErr] = useState<string | null>(null);

  function add() {
    if (end <= start) {
      setErr('End must be after start.');
      return;
    }
    setErr(null);
    onChange([...meetings, { day_of_week: day, start_time: start, end_time: end }]);
  }

  function remove(idx: number) {
    onChange(meetings.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-700">Class meetings (optional)</span>
      {meetings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {meetings.map((m, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <span className="font-semibold text-gray-700 w-10">{DAYS.find((d) => d.value === m.day_of_week)?.label}</span>
              <span className="text-gray-600 flex-1">{m.start_time} – {m.end_time}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove meeting"
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          aria-label="Day of week"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label="Start time"
          className="text-sm border border-gray-200 rounded px-2 py-1.5"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          aria-label="End time"
          className="text-sm border border-gray-200 rounded px-2 py-1.5"
        />
        <button
          type="button"
          onClick={add}
          className="ml-auto text-xs font-semibold text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
        >
          Add
        </button>
      </div>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Create the AddCourseModal**

Create `/Users/exfi8/Projects/StudySync/src/components/courses/AddCourseModal.tsx`:

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import ClassMeetingsField, { type ClassMeetingDraft } from './ClassMeetingsField';
import { lookupCourseByCode } from '@/services/courses.service';
import { useCourses } from '@/hooks/useCourses';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = ['#3B5BDB', '#EF4444', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EC4899', '#F59E0B'];

export default function AddCourseModal({ open, onClose }: AddCourseModalProps) {
  const { addCourse, addMeeting, courses } = useCourses();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [instructor, setInstructor] = useState('');
  const [meetings, setMeetings] = useState<ClassMeetingDraft[]>([]);
  const [lookupResult, setLookupResult] = useState<'idle' | 'searching' | 'exists' | 'new'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCode('');
      setName('');
      setColor(COLOR_PALETTE[0]);
      setInstructor('');
      setMeetings([]);
      setLookupResult('idle');
      setErr(null);
    }
  }, [open]);

  // Debounced lookup on code change
  useEffect(() => {
    if (!code.trim()) {
      setLookupResult('idle');
      return;
    }
    setLookupResult('searching');
    const handle = setTimeout(async () => {
      try {
        const existing = await lookupCourseByCode(code);
        if (existing) {
          setLookupResult('exists');
          setName(existing.name);
        } else {
          setLookupResult('new');
        }
      } catch {
        setLookupResult('idle');
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [code]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setErr('Course code is required.');
      return;
    }
    if (!trimmedName) {
      setErr('Course name is required.');
      return;
    }
    if (courses.some((c) => c.code === trimmedCode)) {
      setErr('You are already enrolled in this course.');
      return;
    }

    setSubmitting(true);
    try {
      const course = await addCourse({
        code: trimmedCode,
        name: trimmedName,
        color,
        instructor: instructor.trim() || null,
      });
      // Add each meeting in sequence (small N, sequential is fine)
      for (const m of meetings) {
        await addMeeting({
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
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a course"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-course-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding…' : 'Add course'}
          </button>
        </div>
      }
    >
      <form id="add-course-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course code <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CS4063"
            autoFocus
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] uppercase"
          />
          {lookupResult === 'exists' && (
            <span className="text-xs text-emerald-600">✓ Found — joining existing course</span>
          )}
          {lookupResult === 'new' && (
            <span className="text-xs text-gray-500">New course — you'll be the first to add it</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HCI Design"
            disabled={lookupResult === 'exists'}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] disabled:bg-gray-50 disabled:text-gray-600"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Your color</span>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Instructor (optional)</span>
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <ClassMeetingsField meetings={meetings} onChange={setMeetings} />

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

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/AddCourseModal.tsx src/components/courses/ClassMeetingsField.tsx
git commit -m "feat: add AddCourseModal with class meetings form"
```

---

## Task 7: Wire CoursesSidebar to real data + "+" button

**Files:**
- Modify: `src/components/courses/CoursesSidebar.tsx`

- [ ] **Step 1: Read the existing file**

Run:
```bash
cat src/components/courses/CoursesSidebar.tsx
```

- [ ] **Step 2: Replace with real-data version**

Overwrite `/Users/exfi8/Projects/StudySync/src/components/courses/CoursesSidebar.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import ConfirmDialog from '../shared/ConfirmDialog';
import AddCourseModal from './AddCourseModal';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/auth.service';
import type { EnrolledCourse } from '@/types/domain';

const STATUS_LABELS: Record<string, { color: string; label: string }> = {
  available: { color: '#22C55E', label: 'Available' },
  studying: { color: '#EAB308', label: 'Studying' },
  busy: { color: '#EF4444', label: 'Busy' },
};

export default function CoursesSidebar() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const { courses, loading, dropCourse } = useCourses();

  const [addOpen, setAddOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<EnrolledCourse | null>(null);

  async function handleLogout() {
    await signOut();
    reset();
    navigate('/login', { replace: true });
  }

  async function handleConfirmDrop() {
    if (!dropTarget) return;
    try {
      await dropCourse(dropTarget.id);
    } finally {
      setDropTarget(null);
    }
  }

  const statusCfg = profile ? STATUS_LABELS[profile.status] : STATUS_LABELS.available;

  return (
    <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">My Courses</p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add course"
            className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200"
          >
            +
          </button>
        </div>
        {loading && courses.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
        {!loading && courses.length === 0 && (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            No courses yet. Click <span className="font-semibold">+</span> to add one.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative flex items-stretch rounded-md overflow-hidden bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
            >
              <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div className="px-2.5 py-2 flex-1">
                <p className="text-xs font-bold text-gray-800 leading-tight">{course.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{course.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setDropTarget(course)}
                aria-label={`Drop ${course.code}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 px-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {profile && (
            <Avatar
              user={{ avatarColor: profile.avatar_color, initials: profile.initials, status: profile.status }}
              size="md"
              showStatus
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{profile?.name ?? 'Loading…'}</p>
            <p className="text-[10px] font-medium" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </p>
          </div>
        </div>
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
      </div>

      <AddCourseModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmDialog
        open={!!dropTarget}
        title="Drop this course?"
        message={
          dropTarget
            ? `Your class meetings for ${dropTarget.code} will be removed. Study events tagged with this course will keep their time but lose the course label.`
            : ''
        }
        confirmLabel="Drop course"
        destructive
        onConfirm={handleConfirmDrop}
        onCancel={() => setDropTarget(null)}
      />
    </aside>
  );
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/CoursesSidebar.tsx
git commit -m "feat: wire CoursesSidebar to real enrollments with add/drop flows"
```

---

## Task 8: End-to-end smoke test — Courses

**Files:** No file changes — manual verification

- [ ] **Step 1: Start dev server**

Start the Vite dev server. Open http://localhost:5173 and log in (or sign up).

- [ ] **Step 2: Verify empty state**

Expected: left sidebar shows "My Courses" with an empty state message "No courses yet. Click + to add one."

- [ ] **Step 3: Add a course via "+"**

Click the "+" next to "My Courses". A side drawer opens. Type code "CS4063". After a brief pause the field shows "New course — you'll be the first to add it". Type name "HCI Design". Pick a color. Add a class meeting for Mon 9:00–10:00. Click "Add course".

Expected: drawer closes, course appears in the sidebar with the chosen color stripe.

- [ ] **Step 4: Verify persistence**

Refresh the page. Expected: the course still appears.

- [ ] **Step 5: Verify DB state**

In Supabase dashboard → Table Editor → `enrollments`: one row for the current user. `class_meetings`: one row. `courses`: one CS4063 row.

- [ ] **Step 6: Add the same course with a new account (test shared courses)**

Log out. Sign up as a second user. Add "CS4063" — after typing the code, the name field should prefill and the label should say "✓ Found — joining existing course". Pick a different color and add the course.

Expected: both users now share the same `courses.id` but have different `enrollments` rows with different colors.

- [ ] **Step 7: Drop a course**

Hover over a course in the sidebar and click the X that appears. Confirm the dialog.

Expected: course disappears from sidebar; class meetings and enrollment are deleted in Supabase; the global `courses` row remains.

- [ ] **Step 8: No commit needed**

Verification only.

---

## Task 9: Events service

**Files:**
- Create: `src/services/events.service.ts`
- Create: `tests/services/events.validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

First run `mkdir -p tests/services`.

Create `/Users/exfi8/Projects/StudySync/tests/services/events.validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateEventInput } from '@/services/events.service';

describe('validateEventInput', () => {
  const base = {
    title: 'Study',
    start_at: '2026-04-20T10:00:00.000Z',
    end_at: '2026-04-20T11:00:00.000Z',
    owner_id: '11111111-1111-1111-1111-111111111111',
    visibility: 'private' as const,
  };

  it('returns null for a valid input', () => {
    expect(validateEventInput(base)).toBeNull();
  });

  it('rejects empty title', () => {
    expect(validateEventInput({ ...base, title: '   ' })).toMatch(/title/i);
  });

  it('rejects end before start', () => {
    expect(validateEventInput({ ...base, start_at: '2026-04-20T11:00:00.000Z', end_at: '2026-04-20T10:00:00.000Z' })).toMatch(/end.*after.*start/i);
  });

  it('rejects equal start and end', () => {
    expect(validateEventInput({ ...base, start_at: '2026-04-20T10:00:00.000Z', end_at: '2026-04-20T10:00:00.000Z' })).toMatch(/end.*after.*start/i);
  });

  it('rejects group visibility without group_id', () => {
    expect(validateEventInput({ ...base, visibility: 'group' })).toMatch(/group/i);
  });

  it('accepts group visibility with group_id', () => {
    expect(
      validateEventInput({ ...base, visibility: 'group', group_id: '22222222-2222-2222-2222-222222222222' })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run:
```bash
npm run test:run -- tests/services/events.validation.test.ts
```

Expected: FAIL with "Cannot find module '@/services/events.service'".

- [ ] **Step 3: Create the events service**

Create `/Users/exfi8/Projects/StudySync/src/services/events.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { EventRow, EventVisibility } from '@/types/domain';

export class EventsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EventsServiceError';
  }
}

export interface EventInput {
  title: string;
  start_at: string;       // ISO
  end_at: string;
  owner_id: string;
  course_id?: string | null;
  location?: string | null;
  description?: string | null;
  visibility: EventVisibility;
  group_id?: string | null;
}

/** Returns null if valid, or a human-readable error message. Pure function. */
export function validateEventInput(input: EventInput): string | null {
  if (!input.title || !input.title.trim()) return 'Title is required.';
  const start = new Date(input.start_at);
  const end = new Date(input.end_at);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid start or end time.';
  if (end <= start) return 'End time must be after start time.';
  if (input.visibility === 'group' && !input.group_id) return 'Group visibility requires a group_id.';
  return null;
}

/** List events visible to the current user within [weekStart, weekEnd). RLS handles access control. */
export async function listEventsInRange(weekStart: Date, weekEnd: Date): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_at', weekStart.toISOString())
    .lt('start_at', weekEnd.toISOString())
    .order('start_at', { ascending: true });
  if (error) throw new EventsServiceError(error.message, error);
  return data ?? [];
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  const err = validateEventInput(input);
  if (err) throw new EventsServiceError(err);
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      start_at: input.start_at,
      end_at: input.end_at,
      owner_id: input.owner_id,
      course_id: input.course_id ?? null,
      location: input.location ?? null,
      description: input.description ?? null,
      visibility: input.visibility,
      group_id: input.group_id ?? null,
    })
    .select()
    .single();
  if (error) throw new EventsServiceError(error.message, error);
  return data;
}

export async function updateEvent(id: string, patch: Partial<Omit<EventInput, 'owner_id'>>): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new EventsServiceError(error.message, error);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new EventsServiceError(error.message, error);
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run:
```bash
npm run test:run -- tests/services/events.validation.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/events.service.ts tests/services/events.validation.test.ts
git commit -m "feat: add events service with validation and tests"
```

---

## Task 10: useEvents hook

**Files:**
- Create: `src/hooks/useEvents.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useEvents.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { listEventsInRange, createEvent, updateEvent, deleteEvent } from '@/services/events.service';
import type { EventRow } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface UseEventsResult {
  events: EventRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createOne: (input: EventInput) => Promise<EventRow>;
  updateOne: (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<EventRow>;
  /** Optimistic local update — use for drag/resize. Returns a rollback function. */
  patchLocal: (id: string, patch: Partial<EventRow>) => () => void;
  deleteOne: (id: string) => Promise<void>;
}

export function useEvents(weekStart: Date, weekEnd: Date): UseEventsResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Key the effect on ISO strings so identical Date instances don't re-trigger.
  const startKey = weekStart.toISOString();
  const endKey = weekEnd.toISOString();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listEventsInRange(new Date(startKey), new Date(endKey));
      setEvents(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [startKey, endKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createOne = useCallback(async (input: EventInput) => {
    const created = await createEvent(input);
    setEvents((prev) => [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    return created;
  }, []);

  const updateOne = useCallback(async (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => {
    const updated = await updateEvent(id, patch);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const patchLocal = useCallback((id: string, patch: Partial<EventRow>) => {
    let snapshot: EventRow | undefined;
    setEvents((prev) => {
      snapshot = prev.find((e) => e.id === id);
      return prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
    });
    return () => {
      if (!snapshot) return;
      setEvents((prev) => prev.map((e) => (e.id === id ? snapshot! : e)));
    };
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, error, reload, createOne, updateOne, patchLocal, deleteOne };
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEvents.ts
git commit -m "feat: add useEvents hook with weekly range query"
```

---

## Task 11: Extend time.ts with class-meeting expansion

**Files:**
- Modify: `src/lib/time.ts`
- Modify: `tests/lib/time.test.ts`

- [ ] **Step 1: Update the top-level import in time.test.ts**

Read `tests/lib/time.test.ts`. Find the existing import block at the top:

```ts
import {
  startOfWeek,
  endOfWeek,
  rangesOverlap,
  isoToDate,
  dateToIso,
  minutesBetween,
  addMinutes,
} from '@/lib/time';
```

Replace it with:

```ts
import {
  startOfWeek,
  endOfWeek,
  rangesOverlap,
  isoToDate,
  dateToIso,
  minutesBetween,
  addMinutes,
  expandClassMeetings,
} from '@/lib/time';
```

- [ ] **Step 2: Append the expansion tests**

Append to the end of `/Users/exfi8/Projects/StudySync/tests/lib/time.test.ts`:

```ts

describe('expandClassMeetings', () => {
  it('expands a Monday meeting into the correct date in a given week', () => {
    const weekStart = new Date('2026-04-20T00:00:00'); // Monday
    const meetings = [{
      id: 'm1',
      user_id: 'u1',
      course_id: 'c1',
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '10:30:00',
    }];
    const expanded = expandClassMeetings(meetings, weekStart);
    expect(expanded).toHaveLength(1);
    expect(expanded[0].start_at.getDay()).toBe(1);
    expect(expanded[0].start_at.getHours()).toBe(9);
    expect(expanded[0].start_at.getMinutes()).toBe(0);
    expect(expanded[0].end_at.getHours()).toBe(10);
    expect(expanded[0].end_at.getMinutes()).toBe(30);
    expect(expanded[0].start_at.getDate()).toBe(20);
  });

  it('expands a Sunday meeting into the Sunday of the Monday-anchored week', () => {
    const weekStart = new Date('2026-04-20T00:00:00');
    const meetings = [{
      id: 'm2',
      user_id: 'u1',
      course_id: 'c1',
      day_of_week: 0,
      start_time: '14:00:00',
      end_time: '15:00:00',
    }];
    const expanded = expandClassMeetings(meetings, weekStart);
    expect(expanded).toHaveLength(1);
    expect(expanded[0].start_at.getDay()).toBe(0);
    expect(expanded[0].start_at.getDate()).toBe(26);
  });

  it('expands multiple meetings across days', () => {
    const weekStart = new Date('2026-04-20T00:00:00');
    const meetings = [
      { id: 'a', user_id: 'u1', course_id: 'c1', day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' },
      { id: 'b', user_id: 'u1', course_id: 'c1', day_of_week: 3, start_time: '11:00:00', end_time: '12:00:00' },
      { id: 'c', user_id: 'u1', course_id: 'c1', day_of_week: 5, start_time: '13:00:00', end_time: '14:30:00' },
    ];
    const expanded = expandClassMeetings(meetings, weekStart);
    expect(expanded).toHaveLength(3);
    expect(expanded.map((e) => e.start_at.getDay())).toEqual([1, 3, 5]);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail at compile**

Run:
```bash
npm run test:run -- tests/lib/time.test.ts
```

Expected: compile/import error — `expandClassMeetings` is not exported from `@/lib/time`. This is the TDD "red" step via compile failure.

- [ ] **Step 4: Add expandClassMeetings to time.ts**

Read `src/lib/time.ts`. Currently it has no imports. Add the type import at the TOP of the file (as the first line):

```ts
import type { ClassMeeting, ExpandedClassMeeting } from '@/types/domain';
```

Then append the new function at the END of the file:

```ts

/**
 * Expand each weekly-recurring class meeting to a dated start/end within the given week.
 * weekStart must be a Monday at 00:00. day_of_week: 0=Sun..6=Sat (matches JS Date.getDay()).
 */
export function expandClassMeetings(meetings: ClassMeeting[], weekStart: Date): ExpandedClassMeeting[] {
  return meetings.map((m) => {
    // JS: 0=Sun..6=Sat. Our weekStart is Monday. Offset from Monday:
    // Mon=1 → 0, Tue=2 → 1, ..., Sat=6 → 5, Sun=0 → 6
    const offset = m.day_of_week === 0 ? 6 : m.day_of_week - 1;
    const [sh, sm] = m.start_time.split(':').map(Number);
    const [eh, em] = m.end_time.split(':').map(Number);
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() + offset);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + offset);
    end.setHours(eh, em, 0, 0);
    return {
      id: m.id,
      user_id: m.user_id,
      course_id: m.course_id,
      start_at: start,
      end_at: end,
    };
  });
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run:
```bash
npm run test:run -- tests/lib/time.test.ts
```

Expected: all 19 tests pass (16 existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/time.ts tests/lib/time.test.ts
git commit -m "feat: add expandClassMeetings utility with tests"
```

---

## Task 12: Rewrite StudyCalendar to use real events

**Files:**
- Modify: `src/components/calendar/StudyCalendar.tsx`

- [ ] **Step 1: Read the existing StudyCalendar**

Run:
```bash
cat src/components/calendar/StudyCalendar.tsx
```

- [ ] **Step 2: Replace contents with the real-data version**

Overwrite `/Users/exfi8/Projects/StudySync/src/components/calendar/StudyCalendar.tsx`:

```tsx
import { useState, useRef, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, DatesSetArg, DateSelectArg, EventDropArg, EventClickArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { startOfWeek, endOfWeek, expandClassMeetings } from '@/lib/time';
import { useEvents } from '@/hooks/useEvents';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import CreateEventDrawer from './CreateEventDrawer';
import EventDetailsPanel from './EventDetailsPanel';
import type { EventRow } from '@/types/domain';

function getCourseColor(courseId: string | null, courses: { id: string; color: string }[]): string {
  if (!courseId) return '#6B7280';
  return courses.find((c) => c.id === courseId)?.color ?? '#6B7280';
}

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

interface CreateDraft {
  start: Date;
  end: Date;
}

export default function StudyCalendar() {
  const calRef = useRef<FullCalendar>(null);
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [weekRange, setWeekRange] = useState('');
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => endOfWeek(anchorDate), [anchorDate]);

  const { events, createOne, updateOne, patchLocal, deleteOne } = useEvents(weekStart, weekEnd);
  const { courses, classMeetings } = useCourses();

  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  const expandedMeetings = useMemo(() => expandClassMeetings(classMeetings, weekStart), [classMeetings, weekStart]);

  const fcEvents = useMemo(() => {
    const eventItems = events.map((e) => ({
      id: `event:${e.id}`,
      title: e.title,
      start: e.start_at,
      end: e.end_at,
      backgroundColor: getCourseColor(e.course_id, courses),
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: e.owner_id === userId,
      extendedProps: { kind: 'event', source: e },
    }));
    const meetingItems = expandedMeetings.map((m) => ({
      id: `meeting:${m.id}`,
      title: courses.find((c) => c.id === m.course_id)?.code ?? 'Class',
      start: m.start_at,
      end: m.end_at,
      backgroundColor: getCourseColor(m.course_id, courses),
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: false,
      display: 'background' as const,
      extendedProps: { kind: 'class_meeting' },
    }));
    return [...eventItems, ...meetingItems];
  }, [events, expandedMeetings, courses, userId]);

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setCreateDraft({ start: info.start, end: info.end });
    info.view.calendar.unselect();
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const source = info.event.extendedProps.source as EventRow | undefined;
    if (source) setSelectedEvent(source);
  }, []);

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const ev = info.event;
      const source = ev.extendedProps.source as EventRow | undefined;
      if (!source) return;
      const rollback = patchLocal(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      try {
        await updateOne(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      } catch {
        rollback();
        info.revert();
      }
    },
    [patchLocal, updateOne]
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const ev = info.event;
      const source = ev.extendedProps.source as EventRow | undefined;
      if (!source) return;
      const rollback = patchLocal(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      try {
        await updateOne(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      } catch {
        rollback();
        info.revert();
      }
    },
    [patchLocal, updateOne]
  );

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    const start = dateInfo.start;
    const endDate = new Date(dateInfo.end);
    endDate.setDate(endDate.getDate() - 1);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    setWeekRange(`${startStr} – ${endStr}`);
    setAnchorDate(start);
  }, []);

  function navPrev() { calRef.current?.getApi().prev(); }
  function navNext() { calRef.current?.getApi().next(); }
  function navToday() { calRef.current?.getApi().today(); }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 mr-1">This Week</h2>
        <button onClick={navPrev} aria-label="Previous week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-500 min-w-[150px] text-center select-none">{weekRange}</span>
        <button onClick={navNext} aria-label="Next week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setCreateDraft({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) })}
          className="ml-auto text-xs font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded transition-colors"
        >
          + New Event
        </button>
        <button
          onClick={navToday}
          className="text-xs text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1 rounded hover:bg-blue-50 transition-colors font-medium"
        >
          Today
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          allDaySlot={false}
          slotMinTime="08:30:00"
          slotMaxTime="19:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: 'numeric', omitZeroMinute: false, meridiem: 'short' }}
          firstDay={1}
          nowIndicator
          selectable
          selectMirror
          editable
          eventResizableFromStart={false}
          events={fcEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventResize={handleEventResize}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          eventContent={(info) => <EventContent eventInfo={info} />}
          height="100%"
          expandRows
          scrollTime="08:45:00"
          dayHeaderContent={(args) => {
            const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            const dow = args.date.getDay();
            const label = dayNames[dow === 0 ? 6 : dow - 1];
            return (
              <div className={`text-center py-1 ${args.isToday ? 'text-[#3B5BDB]' : 'text-gray-500'}`}>
                <span className="text-[0.68rem] font-bold tracking-widest">{label}</span>
              </div>
            );
          }}
        />
      </div>

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
      <EventDetailsPanel
        event={selectedEvent}
        courses={courses}
        currentUserId={userId}
        onClose={() => setSelectedEvent(null)}
        onUpdate={async (patch) => {
          if (!selectedEvent) return;
          const updated = await updateOne(selectedEvent.id, patch);
          setSelectedEvent(updated);
        }}
        onDelete={async () => {
          if (!selectedEvent) return;
          await deleteOne(selectedEvent.id);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
```

Note: `CreateEventDrawer` and `EventDetailsPanel` don't exist yet. The next two tasks create them. `npm run typecheck` will fail until then — that's expected.

- [ ] **Step 3: Commit (despite the type error — we'll fix it in the next tasks)**

Skip commit for now. Move straight to Task 13.

---

## Task 13: CreateEventDrawer

**Files:**
- Create: `src/components/calendar/CreateEventDrawer.tsx`

- [ ] **Step 1: Create the drawer**

Create `/Users/exfi8/Projects/StudySync/src/components/calendar/CreateEventDrawer.tsx`:

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import { findConflicts } from '@/lib/availability';
import type { EventRow, EventVisibility, ExpandedClassMeeting } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface CreateEventDrawerProps {
  open: boolean;
  draft: { start: Date; end: Date } | null;
  onClose: () => void;
  onCreated: (input: EventInput) => Promise<void>;
  existingEvents: EventRow[];
  expandedClassMeetings: ExpandedClassMeeting[];
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function CreateEventDrawer({
  open,
  draft,
  onClose,
  onCreated,
  existingEvents,
  expandedClassMeetings,
}: CreateEventDrawerProps) {
  const { courses } = useCourses();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  const [title, setTitle] = useState('Study Session');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('private');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Seed form when draft changes
  useEffect(() => {
    if (open && draft) {
      setTitle('Study Session');
      setCourseId('');
      setDate(toDateInput(draft.start));
      setStartTime(toTimeInput(draft.start));
      setEndTime(toTimeInput(draft.end));
      setLocation('');
      setDescription('');
      setVisibility('private');
      setErr(null);
    }
  }, [open, draft]);

  // Default visibility follows course selection
  useEffect(() => {
    if (courseId) {
      setVisibility('friends');
      const course = courses.find((c) => c.id === courseId);
      if (course && title === 'Study Session') {
        setTitle(course.code);
      }
    } else {
      setVisibility('private');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const range = date && startTime && endTime
    ? { start: combineDateTime(date, startTime), end: combineDateTime(date, endTime) }
    : null;

  const conflicts = range && !isNaN(range.start.getTime()) && !isNaN(range.end.getTime()) && range.end > range.start
    ? findConflicts(range, existingEvents, expandedClassMeetings)
    : [];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!userId) {
      setErr('Not authenticated.');
      return;
    }
    if (!title.trim()) {
      setErr('Title is required.');
      return;
    }
    if (!range || isNaN(range.start.getTime()) || isNaN(range.end.getTime())) {
      setErr('Please select a valid date and time.');
      return;
    }
    if (range.end <= range.start) {
      setErr('End time must be after start time.');
      return;
    }
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
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New study event"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </div>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-700">Start</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-700">End</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
          </label>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm text-amber-900" role="alert">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
              Conflicts with:
            </p>
            <ul className="text-xs space-y-0.5 pl-5 list-disc">
              {conflicts.map((c) => (
                <li key={`${c.kind}:${c.id}`}>
                  {c.title} ({c.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {c.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Location (optional)</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Library room 214 or zoom link"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-y"
          />
        </label>

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

Note: this imports `findConflicts` from `@/lib/availability`, which doesn't exist yet (Task 16). Typecheck will fail until Task 16.

- [ ] **Step 2: Commit (before typecheck passes)**

Skip commit. Move to Task 14.

---

## Task 14: EventDetailsPanel

**Files:**
- Create: `src/components/calendar/EventDetailsPanel.tsx`

- [ ] **Step 1: Create the panel**

Create `/Users/exfi8/Projects/StudySync/src/components/calendar/EventDetailsPanel.tsx`:

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { EventRow, EnrolledCourse, EventVisibility } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface EventDetailsPanelProps {
  event: EventRow | null;
  courses: EnrolledCourse[];
  currentUserId: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function EventDetailsPanel({ event, courses, currentUserId, onClose, onUpdate, onDelete }: EventDetailsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('private');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setEditing(false);
      setTitle(event.title);
      setCourseId(event.course_id ?? '');
      setDate(toDateInput(event.start_at));
      setStartTime(toTimeInput(event.start_at));
      setEndTime(toTimeInput(event.end_at));
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      setVisibility(event.visibility);
      setErr(null);
    }
  }, [event]);

  if (!event) return null;

  const isOwner = event.owner_id === currentUserId;
  const course = event.course_id ? courses.find((c) => c.id === event.course_id) : null;

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) { setErr('Title is required.'); return; }
    const start = combineDateTime(date, startTime);
    const end = combineDateTime(date, endTime);
    if (end <= start) { setErr('End must be after start.'); return; }
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
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  return (
    <>
      <Drawer
        open={!!event}
        onClose={onClose}
        title={editing ? 'Edit event' : 'Event details'}
        footer={
          isOwner ? (
            <div className="flex gap-2 justify-between">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="event-edit-form"
                      disabled={submitting}
                      className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {editing ? (
          <form id="event-edit-form" onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Course</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] bg-white"
              >
                <option value="">— No course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-y"
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-semibold text-gray-700">Visibility</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                <span>Private</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} disabled={!courseId} />
                <span className={!courseId ? 'text-gray-400' : ''}>Friends in this course</span>
              </label>
            </fieldset>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Title</div>
              <div className="text-base font-bold text-gray-800">{event.title}</div>
            </div>
            {course && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Course</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: course.color }} />
                  <span className="text-gray-800">{course.code} · {course.name}</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">When</div>
              <div className="text-gray-800">
                {new Date(event.start_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                <br />
                {new Date(event.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(event.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            {event.location && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Location</div>
                <div className="text-gray-800">{event.location}</div>
              </div>
            )}
            {event.description && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Description</div>
                <div className="text-gray-800 whitespace-pre-wrap">{event.description}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Visibility</div>
              <div className="text-gray-800 capitalize">{event.visibility}</div>
            </div>
            {!isOwner && (
              <p className="text-xs text-gray-500 italic">You can only view this event — it's owned by someone else.</p>
            )}
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit EventDetailsPanel alone**

```bash
git add src/components/calendar/EventDetailsPanel.tsx
git commit -m "feat: add EventDetailsPanel side drawer"
```

---

## Task 15: Commit the StudyCalendar rewrite and CreateEventDrawer (deferred)

**Files:** StudyCalendar and CreateEventDrawer were created in earlier tasks but not committed because they depend on `lib/availability.ts` (Task 16).

- [ ] **Step 1: Don't commit yet**

StudyCalendar.tsx and CreateEventDrawer.tsx are both in the working tree from Tasks 12 and 13 but the build is broken because `@/lib/availability` doesn't exist. Move to Task 16 to unblock.

---

## Task 16: Availability engine (pure lib + tests)

**Files:**
- Create: `src/lib/availability.ts`
- Create: `tests/lib/availability.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `/Users/exfi8/Projects/StudySync/tests/lib/availability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isTimeSlotFree,
  findConflicts,
  detectJoinableOverlap,
} from '@/lib/availability';
import type { EventRow, ExpandedClassMeeting } from '@/types/domain';

function ev(partial: Partial<EventRow> & { id: string; start_at: string; end_at: string }): EventRow {
  return {
    id: partial.id,
    title: partial.title ?? 'Event',
    course_id: partial.course_id ?? null,
    owner_id: partial.owner_id ?? 'u0',
    start_at: partial.start_at,
    end_at: partial.end_at,
    location: null,
    description: null,
    visibility: partial.visibility ?? 'private',
    group_id: null,
    created_at: '2026-04-01T00:00:00.000Z',
  };
}

function meeting(partial: Partial<ExpandedClassMeeting> & { id: string; start_at: Date; end_at: Date }): ExpandedClassMeeting {
  return {
    id: partial.id,
    user_id: partial.user_id ?? 'u0',
    course_id: partial.course_id ?? 'c0',
    start_at: partial.start_at,
    end_at: partial.end_at,
  };
}

describe('isTimeSlotFree', () => {
  const range = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T11:00:00') };

  it('true when there are no events or meetings', () => {
    expect(isTimeSlotFree(range, [], [])).toBe(true);
  });

  it('false when an event overlaps', () => {
    const events = [ev({ id: 'e1', start_at: '2026-04-20T10:30:00', end_at: '2026-04-20T11:30:00' })];
    expect(isTimeSlotFree(range, events, [])).toBe(false);
  });

  it('false when a class meeting overlaps', () => {
    const meetings = [meeting({ id: 'm1', start_at: new Date('2026-04-20T10:15:00'), end_at: new Date('2026-04-20T11:15:00') })];
    expect(isTimeSlotFree(range, [], meetings)).toBe(false);
  });

  it('true for adjacent event (ends exactly when range starts)', () => {
    const events = [ev({ id: 'e1', start_at: '2026-04-20T09:00:00', end_at: '2026-04-20T10:00:00' })];
    expect(isTimeSlotFree(range, events, [])).toBe(true);
  });
});

describe('findConflicts', () => {
  const range = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T12:00:00') };

  it('returns empty array when no conflicts', () => {
    expect(findConflicts(range, [], [])).toEqual([]);
  });

  it('returns conflicting events with their titles', () => {
    const events = [
      ev({ id: 'e1', title: 'Meeting A', start_at: '2026-04-20T11:00:00', end_at: '2026-04-20T13:00:00' }),
      ev({ id: 'e2', title: 'Meeting B', start_at: '2026-04-20T14:00:00', end_at: '2026-04-20T15:00:00' }), // no conflict
    ];
    const conflicts = findConflicts(range, events, []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('event');
    expect(conflicts[0].title).toBe('Meeting A');
    expect(conflicts[0].id).toBe('e1');
  });

  it('returns conflicting class meetings labeled as class meetings', () => {
    const meetings = [meeting({ id: 'm1', course_id: 'c1', start_at: new Date('2026-04-20T10:30:00'), end_at: new Date('2026-04-20T11:30:00') })];
    const conflicts = findConflicts(range, [], meetings);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('class_meeting');
    expect(conflicts[0].id).toBe('m1');
  });

  it('returns both types of conflicts', () => {
    const events = [ev({ id: 'e1', title: 'Study', start_at: '2026-04-20T11:00:00', end_at: '2026-04-20T12:30:00' })];
    const meetings = [meeting({ id: 'm1', start_at: new Date('2026-04-20T10:15:00'), end_at: new Date('2026-04-20T11:15:00') })];
    expect(findConflicts(range, events, meetings)).toHaveLength(2);
  });
});

describe('detectJoinableOverlap', () => {
  const range = { start: new Date('2026-04-20T12:00:00'), end: new Date('2026-04-20T14:00:00') };

  it('returns null if no visible events overlap', () => {
    expect(detectJoinableOverlap(range, ['c1'], [], 'me')).toBeNull();
  });

  it('returns an event owned by someone else with a mutual course', () => {
    const events = [
      ev({ id: 'e1', owner_id: 'friend', course_id: 'c1', title: 'HCI Study', start_at: '2026-04-20T12:00:00', end_at: '2026-04-20T14:00:00' }),
    ];
    expect(detectJoinableOverlap(range, ['c1'], events, 'me')?.id).toBe('e1');
  });

  it('ignores events owned by the current user', () => {
    const events = [
      ev({ id: 'e1', owner_id: 'me', course_id: 'c1', start_at: '2026-04-20T12:00:00', end_at: '2026-04-20T14:00:00' }),
    ];
    expect(detectJoinableOverlap(range, ['c1'], events, 'me')).toBeNull();
  });

  it('ignores events with no course', () => {
    const events = [
      ev({ id: 'e1', owner_id: 'friend', course_id: null, start_at: '2026-04-20T12:00:00', end_at: '2026-04-20T14:00:00' }),
    ];
    expect(detectJoinableOverlap(range, ['c1'], events, 'me')).toBeNull();
  });

  it('ignores events in a course the user is not enrolled in', () => {
    const events = [
      ev({ id: 'e1', owner_id: 'friend', course_id: 'c2', start_at: '2026-04-20T12:00:00', end_at: '2026-04-20T14:00:00' }),
    ];
    expect(detectJoinableOverlap(range, ['c1'], events, 'me')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run:
```bash
npm run test:run -- tests/lib/availability.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/availability'".

- [ ] **Step 3: Implement availability.ts**

Create `/Users/exfi8/Projects/StudySync/src/lib/availability.ts`:

```ts
import type { EventRow, ExpandedClassMeeting, Conflict } from '@/types/domain';

export interface TimeRange {
  start: Date;
  end: Date;
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** True if the given range does not overlap any event or class meeting. */
export function isTimeSlotFree(
  range: TimeRange,
  events: EventRow[],
  classMeetings: ExpandedClassMeeting[]
): boolean {
  return findConflicts(range, events, classMeetings).length === 0;
}

/** Returns every event and class meeting that overlaps the given range. */
export function findConflicts(
  range: TimeRange,
  events: EventRow[],
  classMeetings: ExpandedClassMeeting[]
): Conflict[] {
  const out: Conflict[] = [];
  for (const e of events) {
    const eventRange = { start: new Date(e.start_at), end: new Date(e.end_at) };
    if (rangesOverlap(range, eventRange)) {
      out.push({
        kind: 'event',
        id: e.id,
        title: e.title,
        start: eventRange.start,
        end: eventRange.end,
      });
    }
  }
  for (const m of classMeetings) {
    const mRange = { start: m.start_at, end: m.end_at };
    if (rangesOverlap(range, mRange)) {
      out.push({
        kind: 'class_meeting',
        id: m.id,
        title: `Class ${m.course_id.slice(0, 4)}`,
        start: m.start_at,
        end: m.end_at,
      });
    }
  }
  return out;
}

/**
 * If an event owned by someone else overlaps the proposed range AND is tagged with a
 * course the current user is also enrolled in, return that event (candidate for a
 * "join existing session" suggestion). Otherwise null.
 */
export function detectJoinableOverlap(
  range: TimeRange,
  currentUserCourseIds: string[],
  visibleEvents: EventRow[],
  currentUserId: string
): EventRow | null {
  for (const e of visibleEvents) {
    if (e.owner_id === currentUserId) continue;
    if (!e.course_id) continue;
    if (!currentUserCourseIds.includes(e.course_id)) continue;
    const eventRange = { start: new Date(e.start_at), end: new Date(e.end_at) };
    if (rangesOverlap(range, eventRange)) return e;
  }
  return null;
}

/**
 * Compute per-friend availability for a proposed range given pre-fetched events and
 * class meetings per user. Returned in the same order as `friends`.
 */
export interface FriendAvailability {
  user_id: string;
  available: boolean;
  conflicts: Conflict[];
}

export function getAvailableFriends(
  range: TimeRange,
  friends: { id: string }[],
  eventsByUser: Record<string, EventRow[]>,
  classMeetingsByUser: Record<string, ExpandedClassMeeting[]>
): FriendAvailability[] {
  return friends.map((f) => {
    const conflicts = findConflicts(
      range,
      eventsByUser[f.id] ?? [],
      classMeetingsByUser[f.id] ?? []
    );
    return { user_id: f.id, available: conflicts.length === 0, conflicts };
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run:
```bash
npm run test:run -- tests/lib/availability.test.ts
```

Expected: all 11 tests pass.

- [ ] **Step 5: Run full typecheck (everything from Tasks 12-14 should now compile)**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

Run:
```bash
npm run test:run
```

Expected: all tests pass across all files.

- [ ] **Step 7: Commit the big integrated change**

```bash
git add src/lib/availability.ts tests/lib/availability.test.ts src/components/calendar/StudyCalendar.tsx src/components/calendar/CreateEventDrawer.tsx
git commit -m "feat: add availability engine and wire calendar to real events"
```

---

## Task 17: Delete old CreateBlockModal and mock data

**Files:**
- Delete: `src/components/shared/CreateBlockModal.tsx`
- Delete: `src/data/courses.js`
- Delete: `src/data/users.js`
- Delete: `src/data/groups.js`
- Delete: `src/data/studyBlocks.js`
- Delete: `src/data/` directory (should be empty)

- [ ] **Step 1: Confirm nothing imports the old modal or mock data**

Run:
```bash
grep -rn "CreateBlockModal\|data/courses\|data/users\|data/groups\|data/studyBlocks" src/ tests/ || echo "no imports"
```

Expected: `no imports`. If anything still imports these files, stop and resolve before deleting.

- [ ] **Step 2: Delete the files**

Run:
```bash
git rm src/components/shared/CreateBlockModal.tsx
git rm src/data/courses.js src/data/users.js src/data/groups.js src/data/studyBlocks.js
rmdir src/data
```

- [ ] **Step 3: Typecheck and test**

Run:
```bash
npm run typecheck && npm run test:run
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove mock data and deprecated CreateBlockModal"
```

---

## Task 18: End-to-end smoke test — events and availability

**Files:** No file changes — manual verification

- [ ] **Step 1: Start dev server and log in**

Start the Vite dev server at http://localhost:5173. Log in as an existing user (the one from Plan 1 smoke test, or sign up fresh).

- [ ] **Step 2: Ensure at least one course exists**

If the user has no courses, add one via the "+" button. Add a class meeting (e.g. Mon 9:00–10:00) so we can test class-meeting rendering.

- [ ] **Step 3: Verify class meetings render on the calendar**

Expected: on the matching day and time, a muted background block appears with the course code.

- [ ] **Step 4: Create an event via drag-select**

Drag-select a time range on the calendar (e.g. Tue 14:00–15:00). Expected: the drawer opens with that time pre-filled.

- [ ] **Step 5: Fill and submit**

Title: "Group work". Course: pick the existing one. Location: "Library". Description: "Review HW3". Visibility: Friends (auto-selected when course is set). Click "Create event".

Expected: drawer closes, event appears on the calendar with the course color.

- [ ] **Step 6: Verify persistence**

Refresh the page. Expected: event is still there.

- [ ] **Step 7: Drag the event to a new slot**

Drag the event to Wednesday 14:00. Expected: the event immediately moves and the change persists (verify by refreshing).

- [ ] **Step 8: Resize the event**

Drag the bottom edge to 16:00. Expected: event resizes and persists.

- [ ] **Step 9: Click the event**

Expected: the details panel opens showing title, course, when, location, description, visibility.

- [ ] **Step 10: Edit the event**

Click "Edit". Change the title. Save. Expected: title updates in the calendar.

- [ ] **Step 11: Test conflict warning**

Click "+ New Event" in the top toolbar. Enter a time that overlaps an existing event or class meeting. Expected: amber "Conflicts with: …" box appears with titles and times.

- [ ] **Step 12: Delete the event**

Open the event details. Click "Delete". Confirm. Expected: event disappears from the calendar.

- [ ] **Step 13: Test week navigation**

Click the right-arrow to navigate to next week. Expected: class meetings appear on the matching days; events only appear if they're in that week.

- [ ] **Step 14: Test protected route still works**

Log out from the bottom-left profile button. Expected: redirected to /login. Navigating to /dashboard redirects back to /login.

- [ ] **Step 15: No commit — verification only**

---

## Task 19: Update README with Plan 2 features

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read existing README**

Run:
```bash
cat README.md
```

- [ ] **Step 2: Add "Current Features" updates and new troubleshooting entries**

Modify `README.md`. Find the **"Current Features"** section and replace it with:

```markdown
## Current Features

- Email/password authentication (Supabase) with session persistence
- Protected dashboard with TypeScript + React Router + Zustand
- **Courses management**: globally shared courses, per-user enrollment metadata (color, instructor, class meetings), case-insensitive code lookup, add/drop flow with confirmation
- **Class meetings**: recurring weekly schedule rendered as non-editable background blocks on the calendar
- **Persistent weekly calendar** (FullCalendar) with events saved to Supabase, drag/resize with optimistic updates and revert-on-error
- **Create event drawer**: title, course, date, start/end time, location, description, visibility (private / friends-in-same-course)
- **Event details panel**: view, edit, delete your events; read-only view for others' events
- **Availability engine**: pure-function conflict detection (`lib/availability.ts`) with unit tests; wired into create drawer as an amber conflict warning
- Profile status indicator (Discord-style avatar dot)
```

Then in the **Troubleshooting** section, add this entry if it isn't already there:

```markdown
**"Schema types out of date after changing migrations"**
Regenerate with the Supabase CLI or MCP:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/db.ts
```
```

(If it's already there, leave it — no change needed.)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for Plan 2 features"
```

---

## Self-Review Checklist

**Spec coverage (Plan 2 — Phases 4, 5, 6):**
- Phase 4 Courses: Tasks 2, 3, 6, 7 cover add/edit/remove, class meetings, sidebar integration ✓
- Phase 5 Events: Tasks 9, 10, 12, 13, 14 cover persistence, drag/resize, event details panel, create drawer ✓
- Phase 6 Availability: Tasks 11, 16 cover expansion utility + pure availability engine with tests; Task 13 wires self-conflict detection into the drawer ✓

**Deferred to Plan 3 (explicitly out of scope):**
- Friend multi-select in drawer
- Group picker / group visibility
- Event invitation accept/decline flow
- Collision join-suggestion banner UI (lib function is implemented + tested)
- Friend availability display
- "Shared" badge for others' events

**Placeholder scan:** No TBDs, TODOs, or "similar to" references. Every code block is complete.

**Type consistency verified:**
- `EventInput` type signature consistent across Tasks 9, 10, 13, 14
- `Conflict` type defined in `domain.ts` (Task 1), used in Tasks 13, 16
- `ExpandedClassMeeting` defined in Task 1, consumed by Tasks 11, 12, 16
- `EnrolledCourse` shape used in Tasks 2, 3, 7, 13, 14
- Service function names consistent: `listEventsInRange`, `createEvent`, `updateEvent`, `deleteEvent`, `validateEventInput`, `listEnrolledCourses`, `addOrEnrollCourse`, `dropEnrollment`, `addClassMeeting`, `listClassMeetings`, `deleteClassMeeting`

**Build-order sanity:** Tasks 12-14 depend on Task 16's output but are written first for cohesion; Task 16 commits them together at the end after all types resolve. Typecheck will fail between Tasks 12 and 16 — this is called out explicitly in those task notes.

**Known deferrals documented in README update (Task 19):** the feature list reflects Plan 2 accurately; Plan 3 features not promised.
