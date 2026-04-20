-- StudySync RLS policies — migration 0002

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table courses enable row level security;
alter table enrollments enable row level security;
alter table class_meetings enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table friendships enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================
-- Any authenticated user can read profiles (needed for friend search, participant display).
-- Users can only insert/update their own profile.
create policy "profiles_select_all_authenticated"
  on profiles for select to authenticated using (true);

create policy "profiles_insert_own"
  on profiles for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own"
  on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- =========================================================
-- COURSES
-- =========================================================
-- Globally discoverable — any authenticated user can read and insert.
-- No update/delete policies in MVP (courses are immutable once created).
create policy "courses_select_all"
  on courses for select to authenticated using (true);

create policy "courses_insert_any"
  on courses for insert to authenticated with check (created_by = auth.uid());

-- =========================================================
-- ENROLLMENTS
-- =========================================================
-- User manages their own enrollments; friends sharing a course can see who else is enrolled.
create policy "enrollments_select_own_or_friend_in_same_course"
  on enrollments for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from enrollments e2
      where e2.user_id = auth.uid() and e2.course_id = enrollments.course_id
    ) and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.user_id = auth.uid() and f.friend_id = enrollments.user_id)
          or (f.friend_id = auth.uid() and f.user_id = enrollments.user_id))
    )
  );

create policy "enrollments_insert_own"
  on enrollments for insert to authenticated with check (user_id = auth.uid());

create policy "enrollments_update_own"
  on enrollments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "enrollments_delete_own"
  on enrollments for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- CLASS MEETINGS
-- =========================================================
-- Owner can read; friends enrolled in the same course can read (for availability checks).
create policy "class_meetings_select_own_or_friend_in_same_course"
  on class_meetings for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from enrollments e
        where e.user_id = auth.uid() and e.course_id = class_meetings.course_id
      )
      and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.user_id = auth.uid() and f.friend_id = class_meetings.user_id)
            or (f.friend_id = auth.uid() and f.user_id = class_meetings.user_id))
      )
    )
  );

create policy "class_meetings_insert_own"
  on class_meetings for insert to authenticated with check (user_id = auth.uid());

create policy "class_meetings_update_own"
  on class_meetings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "class_meetings_delete_own"
  on class_meetings for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- EVENTS
-- =========================================================
-- Complex SELECT: owner OR participant OR group member OR friend-in-same-course with visibility=friends.
create policy "events_select_visible"
  on events for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from event_participants p
      where p.event_id = events.id
        and p.user_id = auth.uid()
        and p.status in ('pending', 'accepted', 'maybe')
    )
    or (
      events.group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = events.group_id and gm.user_id = auth.uid()
      )
    )
    or (
      events.course_id is not null
      and events.visibility = 'friends'
      and exists (
        select 1 from enrollments e
        where e.user_id = auth.uid() and e.course_id = events.course_id
      )
      and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.user_id = auth.uid() and f.friend_id = events.owner_id)
            or (f.friend_id = auth.uid() and f.user_id = events.owner_id))
      )
    )
  );

create policy "events_insert_own"
  on events for insert to authenticated with check (owner_id = auth.uid());

create policy "events_update_own"
  on events for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "events_delete_own"
  on events for delete to authenticated using (owner_id = auth.uid());

-- =========================================================
-- EVENT PARTICIPANTS
-- =========================================================
-- Readable by event owner and the participant themselves.
-- Event owner can insert/update/delete. Participant can update their own status.
create policy "event_participants_select_own_or_owner"
  on event_participants for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

create policy "event_participants_insert_by_owner"
  on event_participants for insert to authenticated with check (
    exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-join (used by collision join-suggestion)
  );

create policy "event_participants_update_own_or_owner"
  on event_participants for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

create policy "event_participants_delete_own_or_owner"
  on event_participants for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

-- =========================================================
-- FRIENDSHIPS
-- =========================================================
create policy "friendships_select_own"
  on friendships for select to authenticated using (auth.uid() in (user_id, friend_id));

create policy "friendships_insert_own"
  on friendships for insert to authenticated with check (
    auth.uid() in (user_id, friend_id) and requested_by = auth.uid()
  );

create policy "friendships_update_own"
  on friendships for update to authenticated using (auth.uid() in (user_id, friend_id));

create policy "friendships_delete_own"
  on friendships for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- =========================================================
-- GROUPS
-- =========================================================
create policy "groups_select_all"
  on groups for select to authenticated using (true);

create policy "groups_insert_any"
  on groups for insert to authenticated with check (owner_id = auth.uid());

create policy "groups_update_owner"
  on groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "groups_delete_owner"
  on groups for delete to authenticated using (owner_id = auth.uid());

-- =========================================================
-- GROUP MEMBERS
-- =========================================================
create policy "group_members_select_if_member"
  on group_members for select to authenticated using (
    exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
    or exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
  );

create policy "group_members_insert_owner_or_admin"
  on group_members for insert to authenticated with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
    or exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-join (for group creator adding themselves)
  );

create policy "group_members_delete_owner_or_admin_or_self"
  on group_members for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
  );

-- =========================================================
-- MESSAGES
-- =========================================================
create policy "messages_select_if_group_member"
  on messages for select to authenticated using (
    exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "messages_insert_if_group_member"
  on messages for insert to authenticated with check (
    author_id = auth.uid() and exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "messages_delete_own"
  on messages for delete to authenticated using (author_id = auth.uid());
