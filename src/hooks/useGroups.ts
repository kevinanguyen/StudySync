import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { listMyGroups, createGroup, deleteGroup, type Group, type GroupInput } from '@/services/groups.service';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => Promise<Group>;
  remove: (groupId: string) => Promise<void>;
}

export function useGroups(): UseGroupsResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  const reload = useCallback(async () => {
    if (!userId) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMyGroups(userId);
      setGroups(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { reloadRef.current = reload; }, [reload]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    function onRevive() { void reloadRef.current(); }
    window.addEventListener('studysync:tab-revived', onRevive);
    return () => window.removeEventListener('studysync:tab-revived', onRevive);
  }, []);

  // Mutations optimistically update local state, then fire-and-forget reload.
  // Never await reload — it can hang in backgrounded tabs and leave the
  // "Creating…" button stuck until full browser refresh.
  const create = useCallback(async (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => {
    if (!userId) throw new Error('Not authenticated');
    const g = await createGroup({ ...input, owner_id: userId }, initialMemberIds);
    setGroups((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
    void reload().catch(() => {});
    return g;
  }, [userId, reload]);

  const remove = useCallback(async (groupId: string) => {
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    void reload().catch(() => {});
  }, [reload]);

  return { groups, loading, error, reload, create, remove };
}
