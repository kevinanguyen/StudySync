-- Enable Postgres logical replication for the messages table so Supabase Realtime
-- can broadcast INSERT/UPDATE/DELETE events. RLS still applies per-subscriber.

alter publication supabase_realtime add table public.messages;
