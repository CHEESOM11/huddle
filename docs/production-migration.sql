-- ============================================================================
-- HUDDLE — PRODUCTION MIGRATION
-- ============================================================================
-- Single source of truth for the schema needed by the merged backend
-- (David's file-uploads/invite + Stephen's search / presence / DMs / threads /
--  roles & permissions).
--
-- Run this WHOLE file in the Supabase SQL Editor.
--   Project: rcrasdxdggxkfdcjkamy
--   URL:     https://rcrasdxdggxkfdcjkamy.supabase.co
--
-- Idempotent — safe to run more than once. It:
--   1. adds missing columns (threads, search, topic, profile email/avatar),
--   2. defaults channel_members.role to 'member',
--   3. creates the direct-messaging tables + a `create_conversation` RPC + RLS,
--   4. syncs a `profiles` row on every signup (and backfills existing users),
--   5. adds the messages->profiles FK so search can embed the author,
--   6. fixes RLS so owners/admins can rename channels and remove members.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------

-- Threads: a reply points at its parent message.
alter table public.messages
  add column if not exists parent_id uuid
  references public.messages(id) on delete cascade;

-- Message search: generated tsvector + GIN index.
alter table public.messages
  add column if not exists search tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists messages_search_idx
  on public.messages using gin (search);

-- Channel topic (rename/topic feature).
alter table public.channels
  add column if not exists topic text;

-- Profiles: display name / email / avatar for search + DM member lists.
alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists avatar_url text;

-- New members default to 'member' (invite-join, etc.).
alter table public.channel_members
  alter column role set default 'member';


-- ---------------------------------------------------------------------------
-- 2. Roles & permissions helpers + RLS fixes
-- ---------------------------------------------------------------------------

-- Caller's role in a given channel (security definer => no RLS recursion).
create or replace function public.current_user_channel_role(channel_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.channel_members
  where channel_id = $1 and user_id = auth.uid()
$$;

revoke all on function public.current_user_channel_role(uuid) from public;
grant  execute on function public.current_user_channel_role(uuid) to authenticated;

-- Allow owner/admin (not just creator) to rename a channel / set topic.
drop policy if exists "channels_update" on public.channels;
create policy "channels_update" on public.channels
  for update to authenticated
  using (
    created_by = auth.uid()
    or public.current_user_channel_role(id) in ('owner', 'admin')
  )
  with check (
    created_by = auth.uid()
    or public.current_user_channel_role(id) in ('owner', 'admin')
  );

-- Allow a user to leave themselves, or an owner/admin to kick another member.
drop policy if exists "channel_members_delete" on public.channel_members;
create policy "channel_members_delete" on public.channel_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_channel_role(channel_id) in ('owner', 'admin')
  );


-- ---------------------------------------------------------------------------
-- 3. Direct messages
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now()
);

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages      enable row level security;

-- Recursion-safe helper: conversations the caller belongs to.
create or replace function public.current_user_conversations()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select conversation_id from public.conversation_members where user_id = auth.uid()
$$;

revoke all on function public.current_user_conversations() from public;
grant  execute on function public.current_user_conversations() to authenticated;

-- Find-or-create a conversation for an arbitrary set of members (1:1 or group).
-- Runs as the table owner so it can insert all member rows atomically; it still
-- always forces the authenticated caller into the membership set.
create or replace function public.create_conversation(user_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  ids  uuid[];
  conv uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select array(select distinct x from unnest(user_ids || array[me]) as t(x))
    into ids;

  if coalesce(array_length(ids, 1), 0) < 2 then
    raise exception 'A conversation must contain another user';
  end if;

  if exists (
    select 1 from unnest(ids) as t(uid)
    where not exists (select 1 from auth.users where id = uid)
  ) then
    raise exception 'One or more users could not be found';
  end if;

  select cm.conversation_id into conv
  from public.conversation_members cm
  group by cm.conversation_id
  having array_agg(cm.user_id order by cm.user_id) = (
    select array_agg(x order by x) from unnest(ids) as t(x)
  )
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_members (conversation_id, user_id)
    select conv, x from unnest(ids) as t(x);
  end if;

  return conv;
end;
$$;

revoke all on function public.create_conversation(uuid[]) from public;
grant  execute on function public.create_conversation(uuid[]) to authenticated;

-- RLS: conversations + members are created only via create_conversation();
-- no direct INSERT policy on those tables.
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (id in (select public.current_user_conversations()));

drop policy if exists "conversation_members_select" on public.conversation_members;
create policy "conversation_members_select" on public.conversation_members
  for select to authenticated
  using (conversation_id in (select public.current_user_conversations()));

drop policy if exists "direct_messages_select" on public.direct_messages;
create policy "direct_messages_select" on public.direct_messages
  for select to authenticated
  using (conversation_id in (select public.current_user_conversations()));

drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert" on public.direct_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and conversation_id in (select public.current_user_conversations())
  );


-- ---------------------------------------------------------------------------
-- 4. Profiles: auto-populate on signup + backfill existing users
--    (needed so search authors and DM member names resolve).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New User'
    ),
    new.email
  )
  on conflict (id) do update
    set name  = excluded.name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, name, email)
select
  id,
  coalesce(
    nullif(raw_user_meta_data->>'name', ''),
    nullif(raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'New User'
  ),
  email
from auth.users
on conflict (id) do update
  set name  = excluded.name,
      email = excluded.email;


-- ---------------------------------------------------------------------------
-- 5. messages -> profiles FK
--    Lets PostgREST embed `profiles` from `messages` (message search authors).
-- ---------------------------------------------------------------------------

do $$
declare c text;
begin
  c := null;
  select conname into c from pg_constraint
   where conrelid = 'public.messages'::regclass
     and contype = 'f' and confrelid = 'public.profiles'::regclass limit 1;
  if c is null then
    alter table public.messages
      add constraint messages_user_id_fkey
      foreign key (user_id) references public.profiles(id);
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 6. Verify
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('channels','channel_members','messages','profiles',
                    'conversations','conversation_members','direct_messages')
order by tablename, cmd, policyname;
