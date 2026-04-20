import type { ClassMeeting, ExpandedClassMeeting } from '@/types/domain';

export interface TimeRange {
  start: Date;
  end: Date;
}

export function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isoToDate(iso: string): Date {
  return new Date(iso);
}

export function dateToIso(d: Date): string {
  return d.toISOString();
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60000);
}

/**
 * Expand each weekly-recurring class meeting to a dated start/end within the given week.
 * weekStart must be a Monday at 00:00. day_of_week: 0=Sun..6=Sat (matches JS Date.getDay()).
 */
export function expandClassMeetings(meetings: ClassMeeting[], weekStart: Date): ExpandedClassMeeting[] {
  return meetings.map((m) => {
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
