import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GroupMembersList from '@/components/groups/GroupMembersList';
import GroupChat from '@/components/groups/GroupChat';
import { getGroup, type Group } from '@/services/groups.service';
import { useGroups } from '@/hooks/useGroups';
import { useAuthStore } from '@/store/authStore';

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const { remove } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);
    getGroup(groupId)
      .then((g) => {
        if (cancelled) return;
        if (!g) setNotFound(true);
        else setGroup(g);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  async function handleDelete() {
    if (!groupId) return;
    setConfirmDelete(false);
    try {
      await remove(groupId);
      navigate('/dashboard', { replace: true });
    } catch {
      // error surfaced via toast in the future; for now, no-op
    }
  }

  if (!groupId || notFound) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 font-semibold">Group not found</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-3 text-sm text-[#3B5BDB] font-semibold hover:underline"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !group) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading group…</div>
      </div>
    );
  }

  const isOwner = group.owner_id === userId;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '260px', minWidth: '260px' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs text-[#3B5BDB] font-semibold hover:underline mb-2 flex items-center gap-1"
            >
              ← Back to dashboard
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: group.avatar_color }}
              >
                {group.initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-800 truncate">{group.name}</h1>
                {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <GroupMembersList groupId={groupId} />
          </div>

          {isOwner && (
            <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded py-1.5 transition-colors"
              >
                Delete group
              </button>
            </div>
          )}
        </aside>

        <main className="flex flex-col flex-1 min-w-0 bg-white">
          <GroupChat groupId={groupId} />
        </main>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this group?"
        message="All messages and member associations will be deleted. This cannot be undone."
        confirmLabel="Delete group"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
