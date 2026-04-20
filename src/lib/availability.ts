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
