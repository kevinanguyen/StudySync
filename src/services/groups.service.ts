import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;
export type Profile = Tables<'profiles'>;

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

/** List groups the current user is a member of. Excludes 1:1 direct-message groups. */
export async function listMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);
  if (error) throw new GroupsServiceError(error.message, error);
  return (data ?? [])
    .map((row) => row.groups as unknown as Group)
    .filter((g): g is Group => !!g && !g.is_direct);
}

/**
 * Find an existing 1:1 direct-message group between two users, or create one.
 *
 * A DM group is a `groups` row with `is_direct = true` and exactly two
 * `group_members`: the two users. UI derives the display name / avatar from
 * the other member's profile, so the group's own `name` stays empty.
 */
export async function findOrCreateDirectMessageGroup(
  currentUserId: string,
  otherUserId: string,
  otherUserInitials?: string,
): Promise<Group> {
  if (currentUserId === otherUserId) {
    throw new GroupsServiceError('Cannot create a direct message with yourself.');
  }

  // Step 1: pull every DM group the current user belongs to.
  const { data: myDMRows, error: myDMErr } = await supabase
    .from('group_members')
    .select('group_id, groups!inner(id, is_direct)')
    .eq('user_id', currentUserId)
    .eq('groups.is_direct', true);
  if (myDMErr) throw new GroupsServiceError(myDMErr.message, myDMErr);

  const myDMGroupIds = (myDMRows ?? []).map((r) => r.group_id);

  if (myDMGroupIds.length > 0) {
    // Step 2: among those, find a group that also has the other user as a member.
    const { data: otherMemberships, error: otherErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', otherUserId)
      .in('group_id', myDMGroupIds);
    if (otherErr) throw new GroupsServiceError(otherErr.message, otherErr);

    const sharedIds = (otherMemberships ?? []).map((r) => r.group_id);
    if (sharedIds.length > 0) {
      // Step 3: pick any one and confirm it has exactly 2 members (guards against
      // a malformed historical group with >2 members that somehow flipped is_direct).
      for (const gid of sharedIds) {
        const { data: members, error: memErr } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', gid);
        if (memErr) throw new GroupsServiceError(memErr.message, memErr);
        if ((members ?? []).length === 2) {
          const { data: group, error: gErr } = await supabase
            .from('groups')
            .select('*')
            .eq('id', gid)
            .maybeSingle();
          if (gErr) throw new GroupsServiceError(gErr.message, gErr);
          if (group) return group;
        }
      }
    }
  }

  // No existing DM — create one. Insert the group, then its two member rows.
  const initials = (otherUserInitials && otherUserInitials.trim())
    ? otherUserInitials.trim().slice(0, 2).toUpperCase()
    : 'DM';
  const { data: created, error: insertErr } = await supabase
    .from('groups')
    .insert({
      name: '',
      description: null,
      course_id: null,
      avatar_color: randomGroupColor(),
      initials,
      owner_id: currentUserId,
      is_direct: true,
    })
    .select()
    .single();
  if (insertErr) throw new GroupsServiceError(insertErr.message, insertErr);

  const { error: memberErr } = await supabase.from('group_members').insert([
    { group_id: created.id, user_id: currentUserId, role: 'owner' as const },
    { group_id: created.id, user_id: otherUserId, role: 'member' as const },
  ]);
  if (memberErr) throw new GroupsServiceError(memberErr.message, memberErr);

  return created;
}

/**
 * List all 1:1 DM groups the current user is in, each paired with the
 * OTHER member's profile so the UI can render "DM with <name>" directly.
 */
export async function listMyDirectMessageGroups(
  userId: string,
): Promise<Array<{ group: Group; other: Profile }>> {
  // Pull DM groups I'm in, plus every member (and their profile) of those groups.
  // A single join is cheaper than N follow-up queries; we process client-side.
  const { data, error } = await supabase
    .from('group_members')
    .select('groups!inner(*, group_members(user_id, profiles(*)))')
    .eq('user_id', userId)
    .eq('groups.is_direct', true);
  if (error) throw new GroupsServiceError(error.message, error);

  type RowShape = {
    groups: (Group & {
      group_members: Array<{ user_id: string; profiles: Profile | null }>;
    }) | null;
  };

  const rows = (data ?? []) as unknown as RowShape[];
  const result: Array<{ group: Group; other: Profile }> = [];
  for (const row of rows) {
    const g = row.groups;
    if (!g) continue;
    const otherMember = g.group_members.find((m) => m.user_id !== userId);
    if (!otherMember || !otherMember.profiles) continue;
    // Strip the nested join from the group object we return.
    const { group_members: _gm, ...bareGroup } = g;
    void _gm;
    result.push({ group: bareGroup as Group, other: otherMember.profiles });
  }
  return result;
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
