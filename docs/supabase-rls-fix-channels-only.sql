-- ============================================================================
-- HUDDLE — CHANNEL-ONLY RLS FIX (create / list / rename / delete channel)
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--   Project: rcrasdxdggxkfdcjkamy
--   URL:     https://rcrasdxdggxkfdcjkamy.supabase.co
--
-- This ONLY touches `channels` and `channel_members`. It does NOT touch
-- messages, invites, message_reactions, profiles, or anything in `auth`.
-- Idempotent — safe to run more than once.
-- ============================================================================

-- 1. Enable RLS on the two channel tables (no-op if already on).
alter table public.channels        enable row level security;
alter table public.channel_members enable row level security;

-- 2. Recursion-safe helper — fixes the "infinite recursion" error on channel
--    list. `security definer` runs as the table owner (postgres) so it reads
--    channel_members WITHOUT re-entering RLS.
create or replace function public.current_user_channels()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select channel_id from public.channel_members where user_id = auth.uid()
$$;

revoke all on function public.current_user_channels() from public;
grant  execute on function public.current_user_channels() to authenticated;

-- 3. Wipe the existing policies on these two tables only (clears any wrong
--    `roles` value or stale definition that was blocking INSERT).
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('channels','channel_members')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4. channels — see / create / rename / delete.
create policy "channels_select" on public.channels
  for select to authenticated
  using (id in (select public.current_user_channels())
         or created_by = auth.uid());

create policy "channels_insert" on public.channels
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "channels_update" on public.channels
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "channels_delete" on public.channels
  for delete to authenticated
  using (created_by = auth.uid());

-- 5. channel_members — membership (join / leave / see members).
create policy "channel_members_select" on public.channel_members
  for select to authenticated
  using (user_id = auth.uid()
         or channel_id in (select public.current_user_channels()));

create policy "channel_members_insert" on public.channel_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "channel_members_delete" on public.channel_members
  for delete to authenticated
  using (user_id = auth.uid());

-- 6. Verify — every policy should show roles = {authenticated}.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('channels','channel_members')
order by tablename, cmd, policyname;
