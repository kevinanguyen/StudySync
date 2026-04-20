import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  listFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  type FriendshipWithProfile,
} from '@/services/friends.service';

interface UseFriendsResult {
  all: FriendshipWithProfile[];
  accepted: FriendshipWithProfile[];
  incoming: FriendshipWithProfile[];
  outgoing: FriendshipWithProfile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  sendRequest: (otherUserId: string) => Promise<void>;
  accept: (otherUserId: string) => Promise<void>;
  remove: (otherUserId: string) => Promise<void>;
}

export function useFriends(): UseFriendsResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [all, setAll] = useState<FriendshipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setAll([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listFriendships(userId);
      setAll(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const accepted = useMemo(() => all.filter((f) => f.friendship.status === 'accepted'), [all]);
  const incoming = useMemo(() => all.filter((f) => f.direction === 'incoming'), [all]);
  const outgoing = useMemo(() => all.filter((f) => f.direction === 'outgoing'), [all]);

  const sendRequest = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await sendFriendRequest(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  const accept = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await acceptFriendRequest(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  const remove = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await removeFriendship(userId, otherUserId);
    await reload();
  }, [userId, reload]);

  return { all, accepted, incoming, outgoing, loading, error, reload, sendRequest, accept, remove };
}
