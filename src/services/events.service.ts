import { supabase } from '@/lib/supabase';
import type { EventRow, EventVisibility } from '@/types/domain';
import type { Tables } from '@/types/db';

export class EventsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EventsServiceError';
  }
}

export interface EventInput {
  title: string;
  start_at: string;       // ISO
  end_at: string;
  owner_id: string;
  course_id?: string | null;
  location?: string | null;
  description?: string | null;
  visibility: EventVisibility;
  group_id?: string | null;
}

/** Returns null if valid, or a human-readable error message. Pure function. */
export function validateEventInput(input: EventInput): string | null {
  if (!input.title || !input.title.trim()) return 'Title is required.';
  const start = new Date(input.start_at);
  const end = new Date(input.end_at);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid start or end time.';
  if (end <= start) return 'End time must be after start time.';
  if (input.visibility === 'group' && !input.group_id) return 'Group visibility requires a group_id.';
  return null;
}

/** List events visible to the current user within [weekStart, weekEnd). RLS handles access control. */
export async function listEventsInRange(weekStart: Date, weekEnd: Date): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_at', weekStart.toISOString())
    .lt('start_at', weekEnd.toISOString())
    .order('start_at', { ascending: true });
  if (error) throw new EventsServiceError(error.message, error);
  return data ?? [];
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  const err = validateEventInput(input);
  if (err) throw new EventsServiceError(err);
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      start_at: input.start_at,
      end_at: input.end_at,
      owner_id: input.owner_id,
      course_id: input.course_id ?? null,
      location: input.location ?? null,
      description: input.description ?? null,
      visibility: input.visibility,
      group_id: input.group_id ?? null,
    })
    .select()
    .single();
  if (error) throw new EventsServiceError(error.message, error);
  return data;
}

export async function updateEvent(id: string, patch: Partial<Omit<EventInput, 'owner_id'>>): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new EventsServiceError(error.message, error);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new EventsServiceError(error.message, error);
}

export type EventParticipantRow = Tables<'event_participants'>;

export interface ParticipantWithProfile {
  participant: EventParticipantRow;
  profile: Tables<'profiles'>;
}

/** Invite a user to an event (creator action). Creates a pending participation row. */
export async function inviteParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status: 'pending',
  });
  if (error) throw new EventsServiceError(error.message, error);
}

/** Remove a participant (creator action or self-leave). */
export async function removeParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new EventsServiceError(error.message, error);
}

/** Respond to an invite (self action). Sets responded_at. */
export async function respondToInvite(
  eventId: string,
  userId: string,
  response: 'accepted' | 'declined' | 'maybe'
): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new EventsServiceError(error.message, error);
}

/** List participants for an event (creator view). Joined with profile. */
export async function listParticipants(eventId: string): Promise<ParticipantWithProfile[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select('*, profiles(*)')
    .eq('event_id', eventId);
  if (error) throw new EventsServiceError(error.message, error);
  return (data ?? []).map((row) => ({
    participant: {
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status,
      invited_at: row.invited_at,
      responded_at: row.responded_at,
    },
    profile: row.profiles as unknown as Tables<'profiles'>,
  }));
}

/** Self-join: add current user to an event as accepted (used by collision-join-suggestion). */
export async function selfJoinEvent(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status: 'accepted',
    responded_at: new Date().toISOString(),
  });
  if (error) throw new EventsServiceError(error.message, error);
}
