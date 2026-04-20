-- Fix infinite recursion in enrollments SELECT policy by extracting the
-- self-referential subquery into a SECURITY DEFINER function that bypasses RLS.
--
-- Problem: The original enrollments SELECT policy queried `enrollments` in an
-- EXISTS subquery ("friend also enrolled in this course"), which re-triggers
-- the policy and causes Postgres error 42P17 ("infinite recursion detected").
-- Same pattern in class_meetings and events policies.
--
-- Fix: SECURITY DEFINER functions run with elevated privileges and bypass RLS,
-- breaking the recursion cycle.

create or replace function public.is_enrolled_in(p_course_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = p_user_id and course_id = p_course_id
  );
$$;

create or replace function public.are_accepted_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((user_id = p_user_a and friend_id = p_user_b)
        or (user_id = p_user_b and friend_id = p_user_a))
  );
$$;

-- Drop and recreate the enrollments SELECT policy using the helper
drop policy if exists "enrollments_select_own_or_friend_in_same_course" on enrollments;
create policy "enrollments_select_own_or_friend_in_same_course"
  on enrollments for select to authenticated using (
    user_id = auth.uid()
    or (
      is_enrolled_in(enrollments.course_id)
      and are_accepted_friends(auth.uid(), enrollments.user_id)
    )
  );

-- Same pattern for class_meetings
drop policy if exists "class_meetings_select_own_or_friend_in_same_course" on class_meetings;
create policy "class_meetings_select_own_or_friend_in_same_course"
  on class_meetings for select to authenticated using (
    user_id = auth.uid()
    or (
      is_enrolled_in(class_meetings.course_id)
      and are_accepted_friends(auth.uid(), class_meetings.user_id)
    )
  );

-- Same fix for events (it also exists-subqueries enrollments and friendships)
drop policy if exists "events_select_visible" on events;
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
      and is_enrolled_in(events.course_id)
      and are_accepted_friends(auth.uid(), events.owner_id)
    )
  );
