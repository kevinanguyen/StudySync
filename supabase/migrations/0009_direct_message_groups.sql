-- Add an `is_direct` flag to groups so we can reuse the group/member/message
-- infrastructure for 1:1 direct messages. DM conversations are just 2-member
-- groups with is_direct=true. The UI filters them out of the main Groups list
-- and shows them in a dedicated DM section instead.
alter table public.groups add column is_direct boolean not null default false;

-- Partial index to keep DM-group lookups fast.
create index idx_groups_is_direct on public.groups (is_direct) where is_direct;
