import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  endOfWeek,
  rangesOverlap,
  isoToDate,
  dateToIso,
  minutesBetween,
  addMinutes,
} from '@/lib/time';

describe('startOfWeek', () => {
  it('returns Monday 00:00 for a Wednesday input', () => {
    const wed = new Date('2026-04-22T14:30:00');
    const result = startOfWeek(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('returns previous Monday for a Sunday input', () => {
    const sun = new Date('2026-04-26T10:00:00');
    const result = startOfWeek(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(20);
  });

  it('returns the same Monday for a Monday input', () => {
    const mon = new Date('2026-04-20T09:00:00');
    const result = startOfWeek(mon);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(0);
  });
});

describe('endOfWeek', () => {
  it('returns Sunday 23:59:59.999 for a Wednesday input', () => {
    const wed = new Date('2026-04-22T14:30:00');
    const result = endOfWeek(wed);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });
});

describe('rangesOverlap', () => {
  const a = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T12:00:00') };

  it('returns true for exact overlap', () => {
    const b = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T12:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true for partial overlap (b starts inside a)', () => {
    const b = { start: new Date('2026-04-20T11:00:00'), end: new Date('2026-04-20T13:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true for partial overlap (b ends inside a)', () => {
    const b = { start: new Date('2026-04-20T09:00:00'), end: new Date('2026-04-20T11:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true when b is entirely inside a', () => {
    const b = { start: new Date('2026-04-20T10:30:00'), end: new Date('2026-04-20T11:30:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns false for adjacent ranges (b starts when a ends)', () => {
    const b = { start: new Date('2026-04-20T12:00:00'), end: new Date('2026-04-20T13:00:00') };
    expect(rangesOverlap(a, b)).toBe(false);
  });

  it('returns false for disjoint ranges', () => {
    const b = { start: new Date('2026-04-20T14:00:00'), end: new Date('2026-04-20T15:00:00') };
    expect(rangesOverlap(a, b)).toBe(false);
  });
});

describe('isoToDate / dateToIso', () => {
  it('round-trips an ISO string to Date and back', () => {
    const iso = '2026-04-20T14:30:00.000Z';
    const date = isoToDate(iso);
    expect(date.toISOString()).toBe(iso);
    expect(dateToIso(date)).toBe(iso);
  });
});

describe('minutesBetween', () => {
  it('returns positive minutes when end > start', () => {
    const start = new Date('2026-04-20T10:00:00');
    const end = new Date('2026-04-20T10:45:00');
    expect(minutesBetween(start, end)).toBe(45);
  });

  it('returns 0 for equal times', () => {
    const d = new Date('2026-04-20T10:00:00');
    expect(minutesBetween(d, d)).toBe(0);
  });

  it('rounds to nearest minute', () => {
    const start = new Date('2026-04-20T10:00:00');
    const end = new Date('2026-04-20T10:00:30');
    expect(minutesBetween(start, end)).toBe(1);
  });
});

describe('addMinutes', () => {
  it('adds minutes without mutating the input', () => {
    const start = new Date('2026-04-20T10:00:00');
    const result = addMinutes(start, 30);
    expect(result.getMinutes()).toBe(30);
    expect(start.getMinutes()).toBe(0);
  });

  it('handles negative minutes', () => {
    const start = new Date('2026-04-20T10:00:00');
    const result = addMinutes(start, -30);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });
});
