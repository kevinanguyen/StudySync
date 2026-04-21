-- Enable Postgres Changes broadcasting on the friendships table so friend
-- request senders and receivers can receive INSERT/UPDATE/DELETE events
-- without polling or needing to refresh the page.
alter publication supabase_realtime add table public.friendships;
