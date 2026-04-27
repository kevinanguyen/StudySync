import { useState, useEffect } from 'react';
import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { searchProfiles, type Profile } from '@/services/friends.service';
import { useAuthStore } from '@/store/authStore';
import { useFriends } from '@/hooks/useFriends';
import { useUIStore } from '@/store/uiStore';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddFriendModal({ open, onClose }: AddFriendModalProps) {
  const currentUserId = useAuthStore((s) => s.session?.user.id ?? null);
  const { all, sendRequest } = useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setErr(null); }
  }, [open]);

  useEffect(() => {
    if (!currentUserId || !query.trim()) { setResults([]); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const rows = await searchProfiles(query, currentUserId, 10);
        setResults(rows);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, currentUserId]);

  const existingIds = new Set(all.map((f) => f.other.id));

  async function handleSend(otherId: string) {
    setSending(otherId);
    setErr(null);
    try {
      await sendRequest(otherId);
      showToast({ level: 'success', message: 'Friend request sent' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send request';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSending(null);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a friend">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Search by username or school email</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@alice123 or alice@email.com"
            autoFocus
            className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
          />
        </label>

        {searching && <p className={`text-xs ${theme === 'dark' ? 'text-gray-100' : 'text-gray-400'}`}>Searching…</p>}

        {!searching && query.trim() && results.length === 0 && (
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-100' : 'text-gray-500'}`}>No users found. Try their full username or school email.</p>
        )}

        <ul className="flex flex-col gap-2">
          {results.map((p) => {
            const already = existingIds.has(p.id);
            return (
              <li key={p.id} className={`flex items-center gap-3 rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-slate-700 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
                <Avatar user={{ avatarColor: p.avatar_color, avatarUrl: p.avatar_url, initials: p.initials, status: p.status }} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{p.name}</p>
                  <p className={`text-[11px] truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-500'}`}>@{p.username}</p>
                </div>
                {already ? (
                  <span className={`text-xs italic ${theme === 'dark' ? 'text-gray-100' : 'text-gray-500'}`}>Already connected</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend(p.id)}
                    disabled={sending === p.id}
                    className="text-xs font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-2.5 py-1 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {sending === p.id ? 'Sending…' : 'Send request'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {err}
          </div>
        )}
      </div>
    </Drawer>
  );
}
