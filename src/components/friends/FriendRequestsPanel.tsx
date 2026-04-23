import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { useFriends } from '@/hooks/useFriends';
import { useUIStore } from '@/store/uiStore';

interface FriendRequestsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function FriendRequestsPanel({ open, onClose }: FriendRequestsPanelProps) {
  const { incoming, outgoing, accept, remove, loading } = useFriends();
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  async function handleAccept(userId: string, name: string) {
    try {
      await accept(userId);
      showToast({ level: 'success', message: `You are now friends with ${name}` });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to accept' });
    }
  }

  async function handleDecline(userId: string) {
    try {
      await remove(userId);
      showToast({ level: 'info', message: 'Request declined' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to decline' });
    }
  }

  async function handleCancel(userId: string) {
    try {
      await remove(userId);
      showToast({ level: 'info', message: 'Request cancelled' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to cancel' });
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Friend requests">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Incoming</h3>
          {loading && <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>Loading…</p>}
          {!loading && incoming.length === 0 && (
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No incoming requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li key={f.other.id} className={`flex items-center gap-3 rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{f.other.name}</p>
                  <p className={`text-[11px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{f.other.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAccept(f.other.id, f.other.name)}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(f.other.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors border ${theme === 'dark' ? 'text-gray-100 border-slate-700 hover:bg-slate-700/50' : 'text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Outgoing</h3>
          {!loading && outgoing.length === 0 && (
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No outgoing requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <li key={f.other.id} className={`flex items-center gap-3 rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{f.other.name}</p>
                  <p className={`text-[11px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{f.other.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancel(f.other.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors border ${theme === 'dark' ? 'text-gray-100 border-slate-700 hover:bg-slate-700/50' : 'text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}
