import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Message = Tables<'messages'>;

export class MessagesServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MessagesServiceError';
  }
}

/** List recent messages for a group (oldest first, most recent N items). */
export async function listRecentMessages(groupId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new MessagesServiceError(error.message, error);
  return (data ?? []).reverse();
}

/** Post a new message to a group. */
export async function sendMessage(groupId: string, authorId: string, body: string): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) throw new MessagesServiceError('Message cannot be empty.');
  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, author_id: authorId, body: trimmed })
    .select()
    .single();
  if (error) throw new MessagesServiceError(error.message, error);
  return data;
}
