import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  const reloadRef = useRef<() => Promise<void>>(async () => {});

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

  // Keep a ref so the realtime subscription effect doesn't need reload in its deps.
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: subscribe to friendships changes touching this user so a friend
  // request from another tab/device appears immediately without a refresh.
  //
  // Two gotchas:
  //  - ONE `.on()` call only. Calling `.on()` twice before `.subscribe()` is
  //    legal, but if React StrictMode (or a nav bounce) causes this effect to
  //    re-run before the async `removeChannel` cleanup completes,
  //    `supabase.channel(topic)` can return the previous — already subscribed —
  //    channel, and the second `.on()` throws
  //    "cannot add postgres_changes callbacks ... after subscribe()".
  //  - Unique channel topic per mount for the same reason. RLS filters the
  //    rows anyway (users only see friendships they're a party to), so we
  //    don't need a filter here.
  useEffect(() => {
    if (!userId) return;
    const topic = `friendships:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => { void reloadRef.current(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Tab-revived event from useSupabaseKeepalive: refresh in case we missed
  // realtime events while the tab was backgrounded.
  useEffect(() => {
    function onRevive() { void reloadRef.current(); }
    window.addEventListener('studysync:tab-revived', onRevive);
    return () => window.removeEventListener('studysync:tab-revived', onRevive);
  }, []);

  const accepted = useMemo(() => all.filter((f) => f.friendship.status === 'accepted'), [all]);
  const incoming = useMemo(() => all.filter((f) => f.direction === 'incoming'), [all]);
  const outgoing = useMemo(() => all.filter((f) => f.direction === 'outgoing'), [all]);

  // Mutations: await the actual write, then kick a reload in the background.
  // Never `await reload()` here — it can hang in backgrounded tabs, which
  // would leave modal submit buttons stuck on "Sending…" forever.
  const sendRequest = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await sendFriendRequest(userId, otherUserId);
    void reload().catch(() => {});
  }, [userId, reload]);

  const accept = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await acceptFriendRequest(userId, otherUserId);
    void reload().catch(() => {});
  }, [userId, reload]);

  const remove = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error('Not authenticated');
    await removeFriendship(userId, otherUserId);
    void reload().catch(() => {});
  }, [userId, reload]);

  return { all, accepted, incoming, outgoing, loading, error, reload, sendRequest, accept, remove };
}
