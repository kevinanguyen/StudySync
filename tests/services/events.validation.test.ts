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
