import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;

export class GroupsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'GroupsServiceError';
  }
}

const GROUP_COLORS = ['#6366F1', '#14B8A6', '#84CC16', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'];

function randomGroupColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

export function initialsFromGroupName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface GroupInput {
  name: string;
  owner_id: string;
  description?: string | null;
  course_id?: string | null;
  avatar_color?: string;
}

export function validateGroupInput(input: GroupInput): string | null {
  const trimmed = input.name.trim();
  if (!trimmed) return 'Group name is required.';
  if (trimmed.length > 60) return 'Group name must be at most 60 characters.';
  return null;
}

/** Create a group AND add the owner as the first member with role='owner'. */
export async function createGroup(input: GroupInput, initialMemberIds: string[] = []): Promise<Group> {
  const err = validateGroupInput(input);
  if (err) throw new GroupsServiceError(err);

  const trimmed = input.name.trim();
  const { data: created, error: insertErr } = await supabase
    .from('groups')
    .insert({
      name: trimmed,
      description: input.description ?? null,
      course_id: input.course_id ?? null,
      avatar_color: input.avatar_color ?? randomGroupColor(),
      initials: initialsFromGroupName(trimmed),
      owner_id: input.owner_id,
    })
    .select()
    .single();
  if (insertErr) throw new GroupsServiceError(insertErr.message, insertErr);

  const memberRows = [
    { group_id: created.id, user_id: input.owner_id, role: 'owner' as const },
    ...initialMemberIds.filter((id) => id !== input.owner_id).map((id) => ({
      group_id: created.id,
      user_id: id,
      role: 'member' as const,
    })),
  ];
  const { error: memberErr } = await supabase.from('group_members').insert(memberRows);
  if (memberErr) throw new GroupsServiceError(memberErr.message, memberErr);

  return created;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw new GroupsServiceError(error.message, error);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
  if (error) throw new GroupsServiceError(error.message, error);
  return data;
}

/** List groups the current user is a member of. */
export async function listMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);
  if (error) throw new GroupsServiceError(error.message, error);
  return (data ?? []).map((row) => row.groups as unknown as Group);
}

export interface GroupMemberWithProfile {
  member: GroupMember;
  profile: Tables<'profiles'>;
}

export async function listGroupMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(*)')
    .eq('group_id', groupId);
  if (error) throw new GroupsServiceError(error.message, error);
  return (data ?? []).map((row) => ({
    member: {
      group_id: row.group_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
    },
    profile: row.profiles as unknown as Tables<'profiles'>,
  }));
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' });
  if (error) throw new GroupsServiceError(error.message, error);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) throw new GroupsServiceError(error.message, error);
}
