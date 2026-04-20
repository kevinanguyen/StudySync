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
    .neq('requested_by', currentUserId);
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

/** Update current user's status. */
export async function updateOwnStatus(currentUserId: string, status: UserStatus, statusText: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, status_text: statusText })
    .eq('id', currentUserId);
  if (error) throw new FriendsServiceError(error.message, error);
}
