-- ============================================================================
-- Huddle — Supabase RLS policies
-- ============================================================================
-- Fixes channel creation, which currently fails with:
--   POST /api/channels -> 400 "new row violates row-level security policy
--   for table \"channels\""
--
-- Root cause: the `channels` table has RLS enabled but no INSERT policy, so
-- the authenticated user's insert is rejected. The backend code is correct
-- (it inserts `created_by = user.id`, then adds the creator to
-- `channel_members`).
--
-- Verified working (no change needed):
--   channels        SELECT, DELETE
--   channel_members SELECT
--   messages        INSERT, SELECT, UPDATE, DELETE
--   invites         INSERT
--
-- Run this in the Supabase SQL editor. The `drop policy if exists` lines make
-- the script idempotent, so it is safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Inspect existing policies first (optional, for review).
-- ----------------------------------------------------------------------------
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('channels', 'channel_members', 'messages', 'invites')
order by tablename, policyname;


-- ----------------------------------------------------------------------------
-- REQUIRED — fixes channel creation (POST /api/channels).
-- ----------------------------------------------------------------------------

-- 1) Let an authenticated user create a channel they own.
drop policy if exists "channels_insert_own" on public.channels;
create policy "channels_insert_own" on public.channels
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- 2) createChannel also inserts the creator into channel_members as a second
--    step, so channel_members needs an INSERT policy too (otherwise the
--    request fails right after #1).
drop policy if exists "channel_members_insert_self" on public.channel_members;
create policy "channel_members_insert_self" on public.channel_members
  for insert
  to authenticated
  with check (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- OPTIONAL — recursion-safe SELECT policies.
-- ----------------------------------------------------------------------------
-- Use these if the "infinite recursion detected in policy for relation
-- \"channel_members\"" error returns. The `security definer` helper resolves
-- the caller's channel ids without re-entering RLS, which breaks the cycle.

-- Helper function.
create or replace function public.current_user_channels()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select channel_id from public.channel_members where user_id = auth.uid()
$$;

-- Members can see the channels they belong to.
drop policy if exists "channels_select_member" on public.channels;
create policy "channels_select_member" on public.channels
  for select
  to authenticated
  using (id in (select public.current_user_channels()));

-- Members can see other members of their channels.
drop policy if exists "channel_members_select_member" on public.channel_members;
create policy "channel_members_select_member" on public.channel_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or channel_id in (select public.current_user_channels())
  );
