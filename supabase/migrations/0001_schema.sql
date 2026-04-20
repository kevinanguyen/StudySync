-- StudySync schema — migration 0001

-- ENUMS
create type user_status as enum ('available', 'studying', 'busy');
create type event_visibility as enum ('private', 'friends', 'group');
create type participant_status as enum ('pending', 'accepted', 'declined', 'maybe');
create type friendship_status as enum ('pending', 'accepted');
create type group_role as enum ('owner', 'admin', 'member');

-- PROFILES (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  school_email text not null,
  major text,
  grad_year int,
  avatar_color text not null default '#6B7280',
  initials text not null,
  status user_status not null default 'available',
  status_text text,
  created_at timestamptz not null default now()
);

-- COURSES (globally shared, unique by code)
create table courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  default_color text not null default '#3B5BDB',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ENROLLMENTS (per-user metadata for a course)
create table enrollments (
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  color text,
  instructor text,
  joined_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- CLASS MEETINGS (per-user recurring schedule)
create table class_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  course_id uuid references courses(id) on delete set null,
  avatar_color text not null default '#6366F1',
  initials text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- GROUP MEMBERS
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- EVENTS (study sessions)
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_id uuid references courses(id) on delete set null,
  owner_id uuid not null references profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  description text,
  visibility event_visibility not null default 'private',
  group_id uuid references groups(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- EVENT PARTICIPANTS
create table event_participants (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status participant_status not null default 'pending',
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (event_id, user_id)
);

-- FRIENDSHIPS (user_id < friend_id is enforced in service layer)
create table friendships (
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  requested_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id < friend_id)
);

-- MESSAGES (group chat)
create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- INDEXES
create index idx_events_owner_start on events (owner_id, start_at);
create index idx_events_range on events (start_at, end_at);
create index idx_event_participants_user on event_participants (user_id, status);
create index idx_messages_group_time on messages (group_id, created_at desc);
create index idx_enrollments_user on enrollments (user_id);
create index idx_enrollments_course on enrollments (course_id);
create index idx_class_meetings_user_dow on class_meetings (user_id, day_of_week);
create index idx_friendships_user_status on friendships (user_id, status);
create index idx_friendships_friend_status on friendships (friend_id, status);

-- PROFILE AUTO-CREATION TRIGGER
-- When a new auth.users row is created (on signup), create a matching profiles row.
-- The extra fields (name, username, initials) come from user_metadata passed at signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, username, school_email, initials, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email,
    coalesce(new.raw_user_meta_data->>'initials', upper(substr(coalesce(new.raw_user_meta_data->>'name', new.email), 1, 2))),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#3B5BDB')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
