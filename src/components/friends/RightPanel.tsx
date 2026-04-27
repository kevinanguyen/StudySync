import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import AddFriendModal from './AddFriendModal';
import FriendRequestsPanel from './FriendRequestsPanel';
import FriendProfileModal from './FriendProfileModal';
import CreateGroupModal from '../groups/CreateGroupModal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useDMs } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import { statusConfig } from '@/lib/status';
import { useUIStore } from '@/store/uiStore';
import { useLayoutStore } from '@/store/layoutStore';
import { FriendRowSkeleton } from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import Tooltip from '../shared/Tooltip';
import type { FriendshipWithProfile, Profile } from '@/services/friends.service';

export default function RightPanel() {
  const [search, setSearch] = useState('');
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const navigate = useNavigate();
  const { accepted, incoming, loading, remove: removeFriend } = useFriends();
  const { groups, loading: groupsLoading, create: createGroup } = useGroups();
  const { conversations: dms, loading: dmsLoading } = useDMs();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const [unfriendTarget, setUnfriendTarget] = useState<FriendshipWithProfile | null>(null);
  const [profileTarget, setProfileTarget] = useState<Profile | null>(null);
  const theme = useUIStore((s) => s.theme);
  const collapsed = useLayoutStore((s) => s.rightSidebarCollapsed);
  const toggleRightSidebar = useLayoutStore((s) => s.toggleRightSidebar);

  async function handleConfirmUnfriend() {
    if (!unfriendTarget) return;
    const name = unfriendTarget.other.name;
    try {
      await removeFriend(unfriendTarget.other.id);
      showToast({ level: 'info', message: `Unfriended ${name}` });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to unfriend' });
    } finally {
      setUnfriendTarget(null);
    }
  }

  const lowerSearch = search.toLowerCase();
  const filteredFriends = accepted.filter((f) =>
    f.other.name.toLowerCase().includes(lowerSearch) || f.other.username.toLowerCase().includes(lowerSearch)
  );

  const FRIEND_LIMIT = 4;
  const displayedFriends = showMoreFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_LIMIT);

  // Shared modals — rendered in both render paths so collapsed-rail clicks
  // (avatar → FriendProfileModal, + → AddFriendModal) work identically.
  const modals = (
    <>
      <AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <FriendRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} onCreate={createGroup} />
      <FriendProfileModal
        open={!!profileTarget}
        profile={profileTarget}
        onClose={() => setProfileTarget(null)}
        onUnfriend={profileTarget ? () => {
          const match = accepted.find((f) => f.other.id === profileTarget.id);
          setProfileTarget(null);
          if (match) setUnfriendTarget(match);
        } : undefined}
      />
      <ConfirmDialog
        open={!!unfriendTarget}
        title="Unfriend this person?"
        message={unfriendTarget ? `You'll no longer see ${unfriendTarget.other.name}'s shared study blocks. You can send a new friend request anytime.` : ''}
        confirmLabel="Unfriend"
        destructive
        onConfirm={handleConfirmUnfriend}
        onCancel={() => setUnfriendTarget(null)}
      />
    </>
  );

  if (collapsed) {
    return (
      <aside
        className={`flex flex-col items-center ${theme === 'dark' ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200'}`}
        style={{ width: '48px', minWidth: '48px' }}
      >
        {/* Top action row: expand toggle + add friend + pending indicator */}
        <div className="flex flex-col items-center gap-1.5 pt-2 pb-2 w-full flex-shrink-0">
          <Tooltip label="Expand friends panel" side="left">
            <button
              type="button"
              onClick={toggleRightSidebar}
              aria-label="Expand friends panel"
              className={`w-[22px] h-[22px] rounded flex items-center justify-center transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip label="Add friend" side="left">
            <button
              type="button"
              onClick={() => setAddFriendOpen(true)}
              aria-label="Add friend"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold leading-none transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-800 text-gray-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              +
            </button>
          </Tooltip>
          {incoming.length > 0 && (
            <Tooltip label={`${incoming.length} pending friend request${incoming.length === 1 ? '' : 's'}`} side="left">
              <button
                type="button"
                onClick={() => setRequestsOpen(true)}
                aria-label={`${incoming.length} pending friend requests`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold leading-none text-white bg-[#3B5BDB] hover:bg-[#3451c7] transition-colors"
              >
                !
              </button>
            </Tooltip>
          )}
        </div>

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-2 py-1">
          {/* Friend avatars */}
          {loading && accepted.length === 0 && (
            <>
              <div className={`w-8 h-8 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
              <div className={`w-8 h-8 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
            </>
          )}
          {accepted.map((f) => {
            const cfg = statusConfig[f.other.status];
            return (
              <Tooltip key={f.other.id} label={f.other.name} side="left">
                <button
                  type="button"
                  onClick={() => setProfileTarget(f.other)}
                  aria-label={`View ${f.other.name}'s profile`}
                  className="relative flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/50 focus:ring-offset-1 transition-transform hover:scale-110"
                >
                  <Avatar user={{ avatarColor: f.other.avatar_color, avatarUrl: f.other.avatar_url, initials: f.other.initials }} size="sm" />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}
                    style={{ backgroundColor: cfg.color }}
                  />
                </button>
              </Tooltip>
            );
          })}

          {/* Separator between friends and DMs (or groups, if no DMs) */}
          {(accepted.length > 0 || dms.length > 0 || groups.length > 0) && (
            <div className={`w-6 h-px my-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}

          {/* DM avatars */}
          {dms.map(({ group, other }) => {
            const cfg = statusConfig[other.status];
            return (
              <Tooltip key={group.id} label={other.name} side="left">
                <button
                  type="button"
                  onClick={() => navigate(`/dms/${other.id}`)}
                  aria-label={`Open DM with ${other.name}`}
                  className="relative flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/50 focus:ring-offset-1 transition-transform hover:scale-110"
                >
                  <Avatar user={{ avatarColor: other.avatar_color, avatarUrl: other.avatar_url, initials: other.initials }} size="sm" />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}
                    style={{ backgroundColor: cfg.color }}
                  />
                </button>
              </Tooltip>
            );
          })}

          {/* Separator between DMs and groups (only if DMs exist AND something follows) */}
          {dms.length > 0 && groups.length > 0 && (
            <div className={`w-6 h-px my-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}

          {/* Group initials */}
          {groupsLoading && groups.length === 0 && (
            <div className={`w-8 h-8 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
          )}
          {groups.map((g) => (
            <Tooltip key={g.id} label={g.name} side="left">
              <button
                type="button"
                onClick={() => navigate(`/groups/${g.id}`)}
                aria-label={`Open ${g.name}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/50 focus:ring-offset-1"
                style={{ backgroundColor: g.avatar_color }}
              >
                {g.initials}
              </button>
            </Tooltip>
          ))}

          {/* Create group button at the bottom of the scroll area */}
          <Tooltip label="Create group" side="left">
            <button
              type="button"
              onClick={() => setCreateGroupOpen(true)}
              aria-label="Create group"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold leading-none flex-shrink-0 transition-colors mt-1 ${
                theme === 'dark'
                  ? 'bg-slate-800 text-gray-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              +
            </button>
          </Tooltip>
        </div>

        {modals}
      </aside>
    );
  }

  return (
    <aside
      className={`flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200'}`}
      style={{ width: '240px', minWidth: '240px' }}
    >
      {/* Collapse toggle — top-left of the panel (mirrored from CoursesSidebar). */}
      <div className="flex justify-start px-2 pt-2 flex-shrink-0">
        <button
          type="button"
          onClick={toggleRightSidebar}
          aria-label="Collapse friends panel"
          className={`flex items-center gap-1 px-2 h-[22px] rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          Collapse
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {/* Search */}
      <div className="px-3 pt-1 pb-2 flex-shrink-0">
  <div className={`${theme === 'dark' ? 'flex items-center gap-1.5 border border-slate-700 rounded px-2 py-1.5 bg-slate-800 focus-within:ring-1 focus-within:ring-blue-300' : 'flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus-within:ring-1 focus-within:ring-blue-300'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${theme === 'dark' ? 'bg-transparent text-xs text-gray-200 placeholder:text-gray-300 focus:outline-none flex-1 min-w-0' : 'bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none flex-1 min-w-0'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* FRIENDS */}
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
              <span className={`${theme === 'dark' ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest' : 'text-[10px] font-bold text-gray-500 uppercase tracking-widest'}`}>Friends</span>
              <button
                type="button"
                onClick={() => setAddFriendOpen(true)}
                aria-label="Add friend"
                className={`${theme === 'dark' ? 'w-4 h-4 rounded-full bg-slate-800 text-gray-300 text-[11px] font-bold flex items-center justify-center hover:bg-slate-700 transition-colors leading-none border border-slate-700' : 'w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200'}`}
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
              <button className={`${theme === 'dark' ? 'text-[10px] text-[#9AB0FF] font-semibold hover:underline' : 'text-[10px] text-[#3B5BDB] font-semibold hover:underline'}`} onClick={() => setShowMoreFriends((v) => !v)}>
                {showMoreFriends ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            )}
          </div>

          {loading && accepted.length === 0 && (
            <div className="flex flex-col gap-0.5">
              <FriendRowSkeleton />
              <FriendRowSkeleton />
              <FriendRowSkeleton />
            </div>
          )}
          {!loading && accepted.length === 0 && (
            <EmptyState
              compact
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72M18 18.72v-.72A9.094 9.094 0 0014.259 15.52 3 3 0 0118 18v.72zm0 0a9.094 9.094 0 01-3.741-.479M6 18.72a9.094 9.094 0 01-3.741-.479 3 3 0 014.682-2.72M6 18.72v-.72A9.094 9.094 0 019.741 15.52 3 3 0 016 18v.72zm0 0a9.094 9.094 0 003.741-.479m0 0a3 3 0 014.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No friends yet"
              description="Find classmates to see when you're free together."
              action={{ label: '+ Add friend', onClick: () => setAddFriendOpen(true) }}
            />
          )}

          <div className="flex flex-col gap-0.5">
            {displayedFriends.map((f) => {
              const cfg = statusConfig[f.other.status];
              return (
                <div key={f.other.id} className={`group relative flex items-center rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <button
                    type="button"
                    onClick={() => setProfileTarget(f.other)}
                    aria-label={`View ${f.other.name}'s profile`}
                    className={`flex items-center gap-2 px-1.5 py-1.5 flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 rounded-md ${theme === 'dark' ? 'text-gray-100' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar user={{ avatarColor: f.other.avatar_color, avatarUrl: f.other.avatar_url, initials: f.other.initials }} size="sm" />
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-100 leading-tight truncate' : 'text-xs font-semibold text-gray-800 leading-tight truncate'}`}>{f.other.name}</p>
                      <p className="text-[10px] truncate" style={{ color: cfg.color }}>
                        {f.other.status_text ?? cfg.label}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUnfriendTarget(f); }}
                    aria-label={`Unfriend ${f.other.name}`}
                    className={`${theme === 'dark' ? 'opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 px-1 py-1.5' : 'opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 px-1 py-1.5'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* DIRECT MESSAGES */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className={`${theme === 'dark' ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest' : 'text-[10px] font-bold text-gray-500 uppercase tracking-widest'}`}>Direct Messages</span>
            </div>
          </div>

          {dmsLoading && dms.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!dmsLoading && dms.length === 0 && (
            <EmptyState
              compact
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              title="No DMs yet"
              description="Click Message on a friend's profile to start a DM."
            />
          )}

          <div className="flex flex-col gap-0.5">
            {dms.map(({ group, other }) => {
              const cfg = statusConfig[other.status];
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => navigate(`/dms/${other.id}`)}
                  aria-label={`Open DM with ${other.name}`}
                  className={`flex items-center gap-2 px-1.5 py-1.5 rounded-md transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar user={{ avatarColor: other.avatar_color, avatarUrl: other.avatar_url, initials: other.initials }} size="sm" />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-100 leading-tight truncate' : 'text-xs font-semibold text-gray-800 leading-tight truncate'}`}>{other.name}</p>
                    <p className="text-[10px] truncate" style={{ color: cfg.color }}>
                      {other.status_text ?? cfg.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* GROUPS */}
        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className={`${theme === 'dark' ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest' : 'text-[10px] font-bold text-gray-500 uppercase tracking-widest'}`}>Groups</span>
              <button
                type="button"
                onClick={() => setCreateGroupOpen(true)}
                aria-label="Create group"
                className={`${theme === 'dark' ? 'w-4 h-4 rounded-full bg-slate-800 text-gray-300 text-[11px] font-bold flex items-center justify-center hover:bg-slate-700 transition-colors leading-none border border-slate-700' : 'w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200'}`}
              >
                +
              </button>
            </div>
          </div>

          {groupsLoading && groups.length === 0 && <p className="text-[11px] text-gray-400">Loading…</p>}
          {!groupsLoading && groups.length === 0 && (
            <EmptyState
              compact
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No groups yet"
              description="Create a group to plan sessions and chat."
              action={{ label: '+ New group', onClick: () => setCreateGroupOpen(true) }}
            />
          )}

          <div className="flex flex-col gap-0.5">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => navigate(`/groups/${g.id}`)}
                className={`flex items-center gap-2 px-1.5 py-1.5 rounded-md transition-colors cursor-pointer text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: g.avatar_color }}
                >
                  {g.initials}
                </div>
                <div className="min-w-0">
                  <p className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-100 leading-tight truncate' : 'text-xs font-semibold text-gray-800 leading-tight truncate'}`}>{g.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modals}
    </aside>
  );
}
