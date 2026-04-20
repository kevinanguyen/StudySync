import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => {
    if (!userId) throw new Error('Not authenticated');
    const g = await createGroup({ ...input, owner_id: userId }, initialMemberIds);
    await reload();
    return g;
  }, [userId, reload]);

  const remove = useCallback(async (groupId: string) => {
    await deleteGroup(groupId);
    await reload();
  }, [reload]);

  return { groups, loading, error, reload, create, remove };
}
