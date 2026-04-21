-- Enable realtime broadcasts on group_members so members are added/removed
-- live on every client without requiring a page refresh.
alter publication supabase_realtime add table public.group_members;

-- For DELETE events, Postgres only includes the primary key columns by
-- default in the logical replication stream. That's not enough for Supabase
-- Realtime to evaluate RLS (it needs to know who the row "belonged to" to
-- decide which subscribed clients should receive the event). Setting
-- REPLICA IDENTITY FULL includes all columns of the old row on DELETE, so
-- RLS-filtered DELETE notifications work reliably.
--
-- Storage impact is negligible for these tables (few columns, low write volume).
alter table public.friendships replica identity full;
alter table public.group_members replica identity full;
