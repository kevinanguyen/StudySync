import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { useFriends } from '@/hooks/useFriends';

interface FriendRequestsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function FriendRequestsPanel({ open, onClose }: FriendRequestsPanelProps) {
  const { incoming, outgoing, accept, remove, loading } = useFriends();

  return (
    <Drawer open={open} onClose={onClose} title="Friend requests">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Incoming</h3>
          {loading && <p className="text-xs text-gray-400">Loading…</p>}
          {!loading && incoming.length === 0 && (
            <p className="text-xs text-gray-500">No incoming requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li key={f.other.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.other.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{f.other.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => accept(f.other.id)}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.other.id)}
                    className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Outgoing</h3>
          {!loading && outgoing.length === 0 && (
            <p className="text-xs text-gray-500">No outgoing requests.</p>
          )}
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <li key={f.other.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials, status: f.other.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.other.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{f.other.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.other.id)}
                  className="text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
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
