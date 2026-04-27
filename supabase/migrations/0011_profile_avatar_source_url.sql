-- Stores the URL of the user's original (uncropped) uploaded avatar image
-- so that re-opening the avatar editor can pre-load it and let the user
-- re-position the crop without having to re-upload from disk.
-- `avatar_url` continues to point at the cropped/displayed 512×512 version.
alter table public.profiles add column if not exists avatar_source_url text;
