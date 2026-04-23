import { useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { useUIStore } from '@/store/uiStore';
import type { FriendshipWithProfile } from '@/services/friends.service';

interface FriendMultiSelectProps {
  friends: FriendshipWithProfile[];
  selected: Set<string>;
  onToggle: (userId: string) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  maxDefaultResults?: number;
  hideUntilQuery?: boolean;
  renderExtra?: (friend: FriendshipWithProfile) => React.ReactNode;
}

export default function FriendMultiSelect({ friends, selected, onToggle, emptyMessage = "Add friends first to invite them.", searchPlaceholder = "Search friends to invite…", maxDefaultResults = 10, hideUntilQuery = false, renderExtra }: FriendMultiSelectProps) {
  const [query, setQuery] = useState('');
  const theme = useUIStore((s) => s.theme);

  if (friends.length === 0) return <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{emptyMessage}</p>;

  const trimmedQuery = query.toLowerCase().trim();

  const filteredFriends = friends.filter((f) => {
    if (!trimmedQuery) return true;
    return f.other.name.toLowerCase().includes(trimmedQuery) || f.other.username.toLowerCase().includes(trimmedQuery);
  }).slice(0, trimmedQuery ? undefined : maxDefaultResults);

  const visibleFriends = hideUntilQuery && !trimmedQuery ? [] : filteredFriends;

  return (
    <div className="flex flex-col gap-2">
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1">
          {friends.filter((f) => selected.has(f.other.id)).map((f) => (
            <button key={f.other.id} type="button" onClick={() => onToggle(f.other.id)} className={`${theme === 'dark' ? 'bg-slate-800 text-gray-200' : 'bg-gray-100 text-gray-700'} text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
              <span>{f.other.name}</span>
              <span className={`ml-1 px-1 rounded cursor-pointer ${theme === 'dark' ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-red-100 hover:text-red-600'} transition-colors`}>×</span>
            </button>
          ))}
        </div>
      )}

      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`} />

      <ul className={`flex flex-col gap-1 max-h-64 overflow-y-auto rounded-md p-1 border ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-100 bg-white'}`}>
        {hideUntilQuery && !trimmedQuery && (
          <li className={`px-2 py-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Start typing to search friends.</li>
        )}
        {trimmedQuery && visibleFriends.length === 0 && (
          <li className={`px-2 py-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No matching friends.</li>
        )}
        {visibleFriends.map((f) => {
          const checked = selected.has(f.other.id);
          return (
            <li key={f.other.id}>
              <button type="button" onClick={() => onToggle(f.other.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${theme === 'dark' ? checked ? 'bg-blue-500/15 hover:bg-blue-500/20' : 'hover:bg-slate-800' : checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <Avatar user={{ avatarColor: f.other.avatar_color, avatarUrl: f.other.avatar_url, initials: f.other.initials }} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{f.other.name}</p>
                  <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{f.other.username}</p>
                  {renderExtra?.(f)}
                </div>
                <input type="checkbox" checked={checked} onChange={() => {}} className="pointer-events-none" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
