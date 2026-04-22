import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/store/uiStore';
import type { EventRow } from '@/types/domain';

interface UpcomingSessionsCardProps {
  groupId: string;
}

export default function UpcomingSessionsCard({ groupId }: UpcomingSessionsCardProps) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('group_id', groupId)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(10);

      if (!cancelled) {
        setEvents((data ?? []) as EventRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  return (
    <div
      className={`rounded-xl border p-4 ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-gray-200'
      }`}
    >
      <h3
        className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        Upcoming sessions
      </h3>

      {loading && (
        <p className="text-xs text-gray-400">Loading…</p>
      )}

      {!loading && events.length === 0 && (
        <p
          className={`text-xs italic ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          No upcoming sessions scheduled for this group.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {events.map((e) => {
          const start = new Date(e.start_at);
          const end = new Date(e.end_at);
          return (
            <li
              key={e.id}
              className={`flex flex-col border rounded-md px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}
              >
                {e.title}
              </p>

              <p
                className={`text-[11px] ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {start.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                ·{' '}
                {start.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                –{' '}
                {end.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>

              {e.location && (
                <p
                  className={`text-[11px] ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  📍 {e.location}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}