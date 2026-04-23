import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Avatar from '@/components/shared/Avatar';
import { useUIStore } from '@/store/uiStore';
import { useMessages } from '@/hooks/useMessages';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

type Profile = Tables<'profiles'>;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface GroupChatProps {
  groupId: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const currentUserId = useAuthStore((s) => s.session?.user.id ?? null);
  const { messages, loading, send } = useMessages(groupId);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const missing = messages.map((m) => m.author_id).filter((id) => !(id in profiles));
    const unique = Array.from(new Set(missing));
    if (unique.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('*').in('id', unique);
      if (cancelled || !data) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data) next[p.id] = p;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [messages, profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await send(body);
      setBody('');
    } catch {
      // simple: show nothing; in Plan 4 we add toasts
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = (e.target as HTMLTextAreaElement).closest('form');
      form?.requestSubmit();
    }
  }

  return (
<div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
<div ref={scrollRef} className={`flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 ${ theme === 'dark' ? 'bg-slate-900' : 'bg-white' }`} >
        {loading && (
          <p className={`text-center text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
            Loading messages…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p className={`text-center text-sm italic my-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((m) => {
          const author = profiles[m.author_id];
          const mine = m.author_id === currentUserId;
          return (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar user={{ avatarColor: author?.avatar_color, avatarUrl: author?.avatar_url, initials: author?.initials ?? '?' }} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      mine
                        ? 'text-[#3B5BDB]'
                        : theme === 'dark'
                          ? 'text-gray-100'
                          : 'text-gray-800'
                    }`}
                  >
                    {author?.name ?? 'Unknown'}
                  </span>
                  <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {formatTime(m.created_at)}
                  </span>
                </div>
                <p className={`text-sm whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSend}
        className={`${theme === 'dark' ? 'border-t border-slate-700' : 'border-t border-gray-200'} px-4 py-3 flex gap-2 flex-shrink-0`}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className={`${
            theme === 'dark'
              ? 'flex-1 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-none bg-slate-800 text-gray-100 placeholder:text-gray-300'
              : 'flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-none'
          }`}
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
