import { useState } from 'react';
import { FRIENDS, statusConfig } from '../data/users';
import { GROUPS as GROUPS_DATA } from '../data/groups';
import Avatar from './Avatar';

export default function RightPanel() {
  const [search, setSearch] = useState('');
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [showMoreGroups, setShowMoreGroups] = useState(false);

  const lowerSearch = search.toLowerCase();
  const filteredFriends = FRIENDS.filter(f =>
    f.name.toLowerCase().includes(lowerSearch)
  );
  const filteredGroups = GROUPS_DATA.filter(g =>
    g.name.toLowerCase().includes(lowerSearch)
  );

  const FRIEND_LIMIT = 4;
  const GROUP_LIMIT = 3;
  const displayedFriends = showMoreFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_LIMIT);
  const displayedGroups = showMoreGroups ? filteredGroups : filteredGroups.slice(0, GROUP_LIMIT);

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
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none flex-1 min-w-0"
          />
          <button className="bg-[#3B5BDB] rounded p-0.5 flex-shrink-0 hover:bg-[#3451c7] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable social content */}
      <div className="flex-1 overflow-y-auto">
        {/* FRIENDS */}
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Friends</span>
              <button className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200">
                +
              </button>
            </div>
            {filteredFriends.length > FRIEND_LIMIT && (
              <button
                className="text-[10px] text-[#3B5BDB] font-semibold hover:underline"
                onClick={() => setShowMoreFriends(v => !v)}
              >
                {showMoreFriends ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            )}
            {filteredFriends.length <= FRIEND_LIMIT && (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline">
                SHOW MORE
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {displayedFriends.map(friend => {
              const cfg = statusConfig[friend.status] || statusConfig.available;
              return (
                <div key={friend.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar user={friend} size="sm" />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{friend.name}</p>
                    <p className="text-[10px] truncate" style={{ color: friend.status === 'studying' ? '#6B7280' : cfg.color }}>
                      {friend.statusText}
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
              <button className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200">
                +
              </button>
            </div>
            {filteredGroups.length > GROUP_LIMIT && (
              <button
                className="text-[10px] text-[#3B5BDB] font-semibold hover:underline"
                onClick={() => setShowMoreGroups(v => !v)}
              >
                {showMoreGroups ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            )}
            {filteredGroups.length <= GROUP_LIMIT && (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline">
                SHOW MORE
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {displayedGroups.map(group => (
              <div key={group.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: group.avatarColor }}
                >
                  {group.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{group.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {group.memberCount ? `${group.memberCount} Members` : '# Members'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
