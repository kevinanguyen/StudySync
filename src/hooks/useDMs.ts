import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { listMyDirectMessageGroups, type Group, type Profile } from '@/services/groups.service';

export interface DMConversation {
  group: Group;
  other: Profile;
}

interface UseDMsResult {
  conversations: DMConversation[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Lists the current user's 1:1 direct-message conversations. Mirrors the
 * useGroups shape so downstream UI patterns stay consistent.
 *
 * Realtime: subscribes to `group_members` changes (RLS filters rows to
 * ones the user can SELECT anyway). This overlaps with the `useGroups`
 * subscription but is safe — unique topic per mount, idempotent handler.
 */
export function useDMs(): UseDMsResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  const reload = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMyDirectMessageGroups(userId);
      setConversations(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load direct messages');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    function onRevive() { void reloadRef.current(); }
    window.addEventListener('studysync:tab-revived', onRevive);
    return () => window.removeEventListener('studysync:tab-revived', onRevive);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const topic = `dm_members:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => { void reloadRef.current(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { conversations, loading, error, reload };
}
