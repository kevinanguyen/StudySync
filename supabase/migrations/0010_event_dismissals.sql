-- Lets a user "hide" a shared event from their own calendar without
-- affecting the event itself or anyone else's view. The dismissal is
-- per-user; the row in `events` is untouched.
create table public.event_dismissals (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id)   on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index idx_event_dismissals_user on public.event_dismissals (user_id);

alter table public.event_dismissals enable row level security;

-- A user can only see, create, and delete their own dismissals.
create policy "event_dismissals_select_own"
  on public.event_dismissals for select to authenticated
  using (user_id = auth.uid());

create policy "event_dismissals_insert_own"
  on public.event_dismissals for insert to authenticated
  with check (user_id = auth.uid());

create policy "event_dismissals_delete_own"
  on public.event_dismissals for delete to authenticated
  using (user_id = auth.uid());
