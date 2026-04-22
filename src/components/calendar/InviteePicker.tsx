import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAvailableFriends, type FriendAvailability } from '@/lib/availability';
import { expandClassMeetings } from '@/lib/time';
import FriendMultiSelect from '@/components/shared/FriendMultiSelect';
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

  useEffect(() => {
    if (!range || friends.length === 0) { setAvailability([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const ids = friends.map((f) => f.other.id);
      const dayStart = new Date(range.start); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(range.end); dayEnd.setHours(23, 59, 59, 999);

      const [eventsRes, meetingsRes] = await Promise.all([
        supabase.from('events').select('*').in('owner_id', ids).gte('start_at', dayStart.toISOString()).lte('end_at', dayEnd.toISOString()),
        supabase.from('class_meetings').select('*').in('user_id', ids),
      ]);
      if (cancelled) return;

      const eventsByUser: Record<string, EventRow[]> = {};
      for (const row of eventsRes.data ?? []) (eventsByUser[row.owner_id] ||= []).push(row as EventRow);

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

      const result = getAvailableFriends(range, friends.map((f) => ({ id: f.other.id })), eventsByUser, meetingsByUser);
      if (!cancelled) { setAvailability(result); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [friends, range]);

  const availByUser: Record<string, FriendAvailability> = {};
  for (const a of availability) availByUser[a.user_id] = a;

  return (
    <FriendMultiSelect
      friends={friends}
      selected={selected}
      onToggle={onToggle}
      renderExtra={(f) => {
        const avail = availByUser[f.other.id];
        const hasConflict = avail && !avail.available;
        if (!range) return null;
        if (loading) return <p className="text-[10px] text-gray-400">Checking…</p>;
        if (hasConflict) return <p className="text-[10px] text-red-600 flex items-center gap-1"><span aria-hidden>●</span><span>Busy — {avail.conflicts[0].title}</span></p>;
        if (avail) return <p className="text-[10px] text-emerald-600 flex items-center gap-1"><span aria-hidden>✓</span><span>Available</span></p>;
        return null;
      }}
    />
  );
}