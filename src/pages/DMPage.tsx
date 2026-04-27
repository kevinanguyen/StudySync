import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import GroupChat from '@/components/groups/GroupChat';
import FriendProfileModal from '@/components/friends/FriendProfileModal';
import { supabase } from '@/lib/supabase';
import { findOrCreateDirectMessageGroup, type Group, type Profile } from '@/services/groups.service';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { statusConfig } from '@/lib/status';

export default function DMPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const theme = useUIStore((s) => s.theme);
  const showToast = useUIStore((s) => s.showToast);
  const { accepted, loading: friendsLoading } = useFriends();

  const [group, setGroup] = useState<Group | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!friendId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!userId) return;
    // Hold off until friendships have loaded so we can verify the target is
    // actually a friend before creating a DM group.
    if (friendsLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setGroup(null);
    setOther(null);

    (async () => {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', friendId)
          .maybeSingle();
        if (cancelled) return;
        if (profileErr) {
          setError(profileErr.message);
          return;
        }
        if (!profile) {
          setNotFound(true);
          return;
        }
        setOther(profile);

        const isFriend = accepted.some((f) => f.other.id === friendId);
        if (!isFriend) {
          setError('You can only DM friends.');
          return;
        }

        const g = await findOrCreateDirectMessageGroup(userId, friendId, profile.initials);
        if (cancelled) return;
        setGroup(g);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load conversation';
        setError(msg);
        showToast({ level: 'error', message: msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [friendId, userId, friendsLoading, accepted, navigate, showToast]);

  if (!friendId || notFound) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className={`${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'} font-semibold`}>User not found</p>
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

  if (loading || friendsLoading) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <Header />
        <div className={`flex-1 flex items-center justify-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading conversation…
        </div>
      </div>
    );
  }

  if (error || !group || !other) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <p className={`${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'} font-semibold`}>
              {error ?? 'Could not open conversation.'}
            </p>
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

  const cfg = statusConfig[other.status];

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Header />
      <div className="flex flex-1 min-h-0">
        <aside
          className={`flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`}
          style={{ width: '260px', minWidth: '260px' }}
        >
          <div className={`px-4 py-3 flex-shrink-0 ${theme === 'dark' ? 'border-b border-slate-700' : 'border-b border-gray-100'}`}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs text-[#3B5BDB] font-semibold hover:underline mb-3 flex items-center gap-1"
            >
              ← Back to dashboard
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                style={{ backgroundColor: other.avatar_color }}
              >
                {other.initials}
              </div>
              <div className="min-w-0">
                <h1 className={`text-base font-bold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  {other.name}
                </h1>
                <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  @{other.username}
                </p>
              </div>
            </div>

            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-1 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              {other.status_text && (
                <>
                  <span className={`w-px h-3 ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  <span className={`text-[11px] truncate max-w-[140px] ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {other.status_text}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={`w-full text-xs font-semibold rounded py-1.5 transition-colors border ${theme === 'dark' ? 'text-[#93A5FF] border-slate-700 hover:bg-slate-800' : 'text-[#3B5BDB] border-gray-200 hover:bg-gray-50'}`}
            >
              View profile
            </button>
          </div>
        </aside>

        <main className={`flex flex-col flex-1 min-w-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          <GroupChat groupId={group.id} />
        </main>
      </div>

      <FriendProfileModal
        open={profileOpen}
        profile={other}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
