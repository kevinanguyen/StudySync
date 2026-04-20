-- Additional SECURITY DEFINER helpers to break remaining RLS recursion cycles
-- discovered after 0003:
--   events ↔ event_participants
--   group_members (self-reference)
--   events → group_members

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id
      and user_id = p_user_id
      and status in ('pending', 'accepted', 'maybe')
  );
$$;

create or replace function public.is_event_owner(p_event_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_group_admin_or_owner(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  ) or public.is_group_owner(p_group_id, p_user_id);
$$;

-- ============================================================
-- EVENTS (replace again, now using the new helpers)
-- ============================================================
drop policy if exists "events_select_visible" on events;
create policy "events_select_visible"
  on events for select to authenticated using (
    owner_id = auth.uid()
    or is_event_participant(events.id)
    or (events.group_id is not null and is_group_member(events.group_id))
    or (
      events.course_id is not null
      and events.visibility = 'friends'
      and is_enrolled_in(events.course_id)
      and are_accepted_friends(auth.uid(), events.owner_id)
    )
  );

-- ============================================================
-- EVENT PARTICIPANTS
-- ============================================================
drop policy if exists "event_participants_select_own_or_owner" on event_participants;
create policy "event_participants_select_own_or_owner"
  on event_participants for select to authenticated using (
    user_id = auth.uid()
    or is_event_owner(event_participants.event_id)
  );

drop policy if exists "event_participants_insert_by_owner" on event_participants;
create policy "event_participants_insert_by_owner"
  on event_participants for insert to authenticated with check (
    is_event_owner(event_participants.event_id)
    or user_id = auth.uid()
  );

drop policy if exists "event_participants_update_own_or_owner" on event_participants;
create policy "event_participants_update_own_or_owner"
  on event_participants for update to authenticated using (
    user_id = auth.uid()
    or is_event_owner(event_participants.event_id)
  );

drop policy if exists "event_participants_delete_own_or_owner" on event_participants;
create policy "event_participants_delete_own_or_owner"
  on event_participants for delete to authenticated using (
    user_id = auth.uid()
    or is_event_owner(event_participants.event_id)
  );

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
drop policy if exists "group_members_select_if_member" on group_members;
create policy "group_members_select_if_member"
  on group_members for select to authenticated using (
    is_group_member(group_members.group_id)
    or is_group_owner(group_members.group_id)
  );

drop policy if exists "group_members_insert_owner_or_admin" on group_members;
create policy "group_members_insert_owner_or_admin"
  on group_members for insert to authenticated with check (
    is_group_admin_or_owner(group_members.group_id)
    or user_id = auth.uid()
  );

drop policy if exists "group_members_delete_owner_or_admin_or_self" on group_members;
create policy "group_members_delete_owner_or_admin_or_self"
  on group_members for delete to authenticated using (
    user_id = auth.uid()
    or is_group_admin_or_owner(group_members.group_id)
  );

-- ============================================================
-- MESSAGES
-- ============================================================
drop policy if exists "messages_select_if_group_member" on messages;
create policy "messages_select_if_group_member"
  on messages for select to authenticated using (
    is_group_member(messages.group_id)
  );

drop policy if exists "messages_insert_if_group_member" on messages;
create policy "messages_insert_if_group_member"
  on messages for insert to authenticated with check (
    author_id = auth.uid() and is_group_member(messages.group_id)
  );
