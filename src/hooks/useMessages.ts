import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listRecentMessages, sendMessage, type Message } from '@/services/messages.service';
import { useAuthStore } from '@/store/authStore';

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  send: (body: string) => Promise<void>;
}

export function useMessages(groupId: string): UseMessagesResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    subscribedRef.current = false;
    setLoading(true);
    setError(null);
    setMessages([]);

    listRecentMessages(groupId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load messages'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Unique topic per mount. Prevents supabase-js from returning an
    // already-subscribed channel across React StrictMode remounts or quick
    // group navigations, which would throw "cannot add postgres_changes
    // callbacks after subscribe()" on the next `.on()`.
    const topic = `messages:${groupId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const newRow = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [...prev, newRow];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const send = useCallback(async (body: string) => {
    if (!userId) throw new Error('Not authenticated');
    const sent = await sendMessage(groupId, userId, body);
    setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
  }, [groupId, userId]);

  return { messages, loading, error, send };
}
