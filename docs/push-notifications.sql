-- Web push notifications: storage + server-side lookup.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It creates a table to store each user's browser Push subscription and a
-- security-definer function the backend uses to fetch a channel's members'
-- subscriptions WITHOUT a service-role/admin key.
--
-- The server never uses the service-role key: it acts as the signed-in user.
-- The function below is the one exception to RLS — it runs as its owner so it
-- can read `push_subscriptions` across users, but it only returns subscriptions
-- for members of a channel the CALLER already belongs to (the `exists` guard).

-- 1. The subscriptions table. `user_id` defaults to the authenticated user, so
--    the client only ever sends the `subscription` payload itself.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, subscription)
);

-- 2. Row Level Security: a user manages only their own subscriptions.
alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions"
  on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Server-side lookup: subscriptions of every member of a channel, excluding
--    one user (the sender/joiner), restricted to channels the caller belongs to.
create or replace function public.channel_member_push_subscriptions(
  p_channel_id uuid,
  p_exclude_user_id uuid
)
returns table (subscription jsonb)
language sql
security definer
stable
set search_path = public
as $$
  select ps.subscription
  from public.channel_members cm
  join public.push_subscriptions ps on ps.user_id = cm.user_id
  where cm.channel_id = p_channel_id
    and cm.user_id is distinct from p_exclude_user_id
    and exists (
      select 1
      from public.channel_members me
      where me.channel_id = p_channel_id
        and me.user_id = auth.uid()
    );
$$;

-- 4. Only signed-in users may call the function.
revoke all on function public.channel_member_push_subscriptions(uuid, uuid) from public;
grant execute on function public.channel_member_push_subscriptions(uuid, uuid) to authenticated;
