import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import AddFriendModal from './AddFriendModal';
import FriendRequestsPanel from './FriendRequestsPanel';
import CreateGroupModal from '../groups/CreateGroupModal';
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import { statusConfig } from '@/lib/status';

export default function RightPanel() {
  const [search, setSearch] = useState('');
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const navigate = useNavigate();
  const { accepted, incoming, loading } = useFriends();
  const { groups, loading: groupsLoading } = useGroups();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const lowerSearch = search.toLowerCase();
  const filteredFriends = accepted.filter((f) =>
    f.other.name.toLowerCase().includes(lowerSearch) || f.other.username.toLowerCase().includes(lowerSearch)
  );

  const FRIEND_LIMIT = 4;
  const displayedFriends = showMoreFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_LIMIT);

  return (
    <aside className="flex flex-col bg-white border-l border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus-within:ring-1 focus-within:ring-blue-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* FRIENDS */}
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Friends</span>
              <button
                type="button"
                onClick={() => setAddFriendOpen(true)}
                aria-label="Add friend"
                className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200"
              >
                +
              </button>
              {incoming.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRequestsOpen(true)}
                  aria-label="Friend requests"
                  className="ml-1 bg-[#3B5BDB] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none hover:bg-[#3451c7] transition-colors"
                >
                  {incoming.length} pending
                </button>
              )}
            </div>
            {filteredFriends.length > FRIEND_LIMIT && (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline" onClick={() => setShowMoreFriends((v) => !v)}>
                {showMoreFriends ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            )}
          </div>

          {loading && accepted.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!loading && accepted.length === 0 && (
            <p className="text-[11px] text-gray-500 leading-relaxed">No friends yet. Click <span className="font-semibold">+</span> to find people.</p>
          )}

          <div className="flex flex-col gap-0.5">
            {displayedFriends.map((f) => {
              const cfg = statusConfig[f.other.status];
              return (
                <div key={f.other.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{f.other.name}</p>
                    <p className="text-[10px] truncate" style={{ color: cfg.color }}>
                      {f.other.status_text ?? cfg.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GROUPS */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groups</span>
              <button
                type="button"
                onClick={() => setCreateGroupOpen(true)}
                aria-label="Create group"
                className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200"
              >
                +
              </button>
            </div>
          </div>

          {groupsLoading && groups.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!groupsLoading && groups.length === 0 && (
            <p className="text-[11px] text-gray-500 leading-relaxed">No groups yet. Click <span className="font-semibold">+</span> to create one.</p>
          )}

          <div className="flex flex-col gap-0.5">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => navigate(`/groups/${g.id}`)}
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: g.avatar_color }}
                >
                  {g.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{g.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
    </aside>
  );
}
