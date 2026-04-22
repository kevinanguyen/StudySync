import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GroupMembersList from '@/components/groups/GroupMembersList';
import GroupChat from '@/components/groups/GroupChat';
import UpcomingSessionsCard from '@/components/groups/UpcomingSessionsCard';
import { getGroup, type Group } from '@/services/groups.service';
import { useGroups } from '@/hooks/useGroups';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const { remove } = useGroups();
  const theme = useUIStore((s) => s.theme);

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);
    getGroup(groupId)
      .then((g) => { if (cancelled) return; if (!g) setNotFound(true); else setGroup(g); })
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
    } catch {}
  }

  if (!groupId || notFound) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className={`${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'} font-semibold`}>Group not found</p>
            <button type="button" onClick={() => navigate('/dashboard')} className="mt-3 text-sm text-[#3B5BDB] font-semibold hover:underline">Back to dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !group) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <Header />
        <div className={`flex-1 flex items-center justify-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading group…</div>
      </div>
    );
  }

  const isOwner = group.owner_id === userId;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Header />
      <div className="flex flex-1 min-h-0">
        
        <aside className={`flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`} style={{ width: '260px', minWidth: '260px' }}>
          <div className={`px-4 py-3 flex-shrink-0 ${theme === 'dark' ? 'border-b border-slate-700' : 'border-b border-gray-100'}`}>
            <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-[#3B5BDB] font-semibold hover:underline mb-2 flex items-center gap-1">← Back to dashboard</button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: group.avatar_color }}>{group.initials}</div>
              <div className="min-w-0">
                <h1 className={`text-base font-bold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{group.name}</h1>
                {group.description && <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{group.description}</p>}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <GroupMembersList groupId={groupId} />
          </div>

          {isOwner && (
            <div className={`px-3 py-3 flex-shrink-0 ${theme === 'dark' ? 'border-t border-slate-700' : 'border-t border-gray-200'}`}>
              <button type="button" onClick={() => setConfirmDelete(true)} className={`w-full text-xs font-semibold rounded py-1.5 transition-colors border ${theme === 'dark' ? 'text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10' : 'text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50'}`}>Delete group</button>
            </div>
          )}
        </aside>

        <main className={`flex flex-col flex-1 min-w-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          <GroupChat groupId={groupId} />
        </main>

        <aside className={`hidden lg:flex flex-col p-4 gap-4 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950 border-l border-slate-700' : 'bg-gray-50 border-l border-gray-200'}`} style={{ width: '280px', minWidth: '280px' }}>
          <UpcomingSessionsCard groupId={groupId} />
        </aside>

      </div>

      <ConfirmDialog open={confirmDelete} title="Delete this group?" message="All messages and member associations will be deleted. This cannot be undone." confirmLabel="Delete group" destructive onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}