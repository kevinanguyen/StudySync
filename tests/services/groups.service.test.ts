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
