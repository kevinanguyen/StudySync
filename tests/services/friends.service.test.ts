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
