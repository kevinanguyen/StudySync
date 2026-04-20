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
