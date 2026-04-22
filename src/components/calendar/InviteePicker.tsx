import { useEffect, useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { supabase } from '@/lib/supabase';
import { getAvailableFriends, type FriendAvailability } from '@/lib/availability';
import { expandClassMeetings } from '@/lib/time';
import { useUIStore } from '@/store/uiStore';
import type { EventRow, ExpandedClassMeeting } from '@/types/domain';
import type { Tables } from '@/types/db';
import type { FriendshipWithProfile } from '@/services/friends.service';

interface InviteePickerProps {
  friends: FriendshipWithProfile[];
  range: { start: Date; end: Date } | null;
  selected: Set<string>;
  onToggle: (userId: string) => void;
}

export default function InviteePicker({ friends, range, selected, onToggle }: InviteePickerProps) {
  const [availability, setAvailability] = useState<FriendAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (!range || friends.length === 0) { setAvailability([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const ids = friends.map((f) => f.other.id);
      const dayStart = new Date(range.start); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(range.end); dayEnd.setHours(23, 59, 59, 999);

      const [eventsRes, meetingsRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .in('owner_id', ids)
          .gte('start_at', dayStart.toISOString())
          .lte('end_at', dayEnd.toISOString()),
        supabase
          .from('class_meetings')
          .select('*')
          .in('user_id', ids),
      ]);
      if (cancelled) return;

      const eventsByUser: Record<string, EventRow[]> = {};
      for (const row of eventsRes.data ?? []) {
        (eventsByUser[row.owner_id] ||= []).push(row as EventRow);
      }

      const weekStart = new Date(range.start);
      weekStart.setHours(0, 0, 0, 0);
      const day = weekStart.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + offset);
      const meetingsByUser: Record<string, ExpandedClassMeeting[]> = {};
      for (const m of meetingsRes.data ?? []) {
        const row = m as Tables<'class_meetings'>;
        const expanded = expandClassMeetings([row], weekStart);
        (meetingsByUser[row.user_id] ||= []).push(...expanded);
      }

      const result = getAvailableFriends(
        range,
        friends.map((f) => ({ id: f.other.id })),
        eventsByUser,
        meetingsByUser
      );
      if (!cancelled) {
        setAvailability(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [friends, range]);

  if (friends.length === 0) {
    return (
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Add friends first to invite them.
      </p>
    );
  }

  const availByUser: Record<string, FriendAvailability> = {};
  for (const a of availability) availByUser[a.user_id] = a;

  return (
    <ul className={`flex flex-col gap-1 max-h-64 overflow-y-auto rounded-md p-1 border ${
        theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-100 bg-white'
      }`}
    >
      {friends.map((f) => {
        const checked = selected.has(f.other.id);
        const avail = availByUser[f.other.id];
        const hasConflict = avail && !avail.available;
        return (
          <li key={f.other.id}>
            <button
              type="button"
              onClick={() => onToggle(f.other.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                theme === 'dark'
                  ? checked
                    ? 'bg-blue-500/15 hover:bg-blue-500/20'
                    : 'hover:bg-slate-800'
                  : checked
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
              }`}
            >
              <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  {f.other.name}
                </p>
                {range && (loading ? (
                  <p className="text-[10px] text-gray-400">Checking…</p>
                ) : hasConflict ? (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <span aria-hidden>●</span>
                    <span>Busy — {avail.conflicts[0].title}</span>
                  </p>
                ) : avail ? (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <span aria-hidden>✓</span>
                    <span>Available</span>
                  </p>
                ) : null)}
              </div>
              <input type="checkbox" checked={checked} onChange={() => {}} className="pointer-events-none" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}