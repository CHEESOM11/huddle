-- ============================================================================
-- HUDDLE — ONE-TIME DATABASE FIX (channels create / list / delete + messaging)
-- ============================================================================
-- Run this WHOLE file in the Supabase SQL Editor.
--   Project: rcrasdxdggxkfdcjkamy
--   URL:     https://rcrasdxdggxkfdcjkamy.supabase.co
--
-- Idempotent — safe to run more than once. It:
--   1. enables RLS on every table,
--   2. reinstalls the recursion-safe membership helper,
--   3. DELETES every existing policy on these tables (clears wrong roles / stale
--      definitions) and recreates them all as `to authenticated`,
--   4. adds ON DELETE CASCADE so deleting a channel removes its members,
--      messages, invites and reactions.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Turn on Row Level Security for every table (no-op if already on).
-- ---------------------------------------------------------------------------
alter table public.channels          enable row level security;
alter table public.channel_members   enable row level security;
alter table public.messages          enable row level security;
alter table public.invites           enable row level security;
alter table public.message_reactions enable row level security;
alter table public.profiles          enable row level security;


-- ---------------------------------------------------------------------------
-- 2. Recursion-safe helper. `security definer` runs as the table owner
--    (postgres) so it reads channel_members WITHOUT re-entering RLS — this is
--    what permanently fixes the "infinite recursion" error.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 3. Wipe every existing policy on these tables, so nothing stale survives.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('channels','channel_members','messages','invites',
                        'message_reactions','profiles')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 4. channels — who can see / create / rename / delete a channel.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 5. channel_members — membership (join / leave / see members).
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 6. messages — read/write messages in channels you belong to.
-- ---------------------------------------------------------------------------
create policy "messages_select" on public.messages
  for select to authenticated
  using (channel_id in (select public.current_user_channels()));

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (user_id = auth.uid()
              and channel_id in (select public.current_user_channels()));

create policy "messages_update" on public.messages
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_delete" on public.messages
  for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 7. invites — create / see invite links for your channels.
-- ---------------------------------------------------------------------------
create policy "invites_select" on public.invites
  for select to authenticated
  using (created_by = auth.uid()
         or channel_id in (select public.current_user_channels()));

create policy "invites_insert" on public.invites
  for insert to authenticated
  with check (created_by = auth.uid()
              and channel_id in (select public.current_user_channels()));

create policy "invites_delete" on public.invites
  for delete to authenticated
  using (created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- 8. message_reactions — react to messages in channels you belong to.
-- ---------------------------------------------------------------------------
create policy "message_reactions_select" on public.message_reactions
  for select to authenticated
  using (message_id in (
    select id from public.messages
    where channel_id in (select public.current_user_channels())
  ));

create policy "message_reactions_insert" on public.message_reactions
  for insert to authenticated
  with check (user_id = auth.uid()
              and message_id in (
                select id from public.messages
                where channel_id in (select public.current_user_channels())
              ));

create policy "message_reactions_delete" on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 9. profiles — everyone can read, each user writes their own.
-- ---------------------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- ---------------------------------------------------------------------------
-- 10. FK cascades — so deleting a channel removes its members, messages,
--     invites and reactions (fixes the delete-channel flow).
-- ---------------------------------------------------------------------------
do $$
declare c text;
begin
  c := null;
  select conname into c from pg_constraint
   where conrelid = 'public.channel_members'::regclass
     and contype = 'f' and confrelid = 'public.channels'::regclass limit 1;
  if c is not null then
    execute format('alter table public.channel_members drop constraint %I', c);
  end if;
  execute 'alter table public.channel_members add constraint channel_members_channel_id_fkey foreign key (channel_id) references public.channels(id) on delete cascade';

  c := null;
  select conname into c from pg_constraint
   where conrelid = 'public.messages'::regclass
     and contype = 'f' and confrelid = 'public.channels'::regclass limit 1;
  if c is not null then
    execute format('alter table public.messages drop constraint %I', c);
  end if;
  execute 'alter table public.messages add constraint messages_channel_id_fkey foreign key (channel_id) references public.channels(id) on delete cascade';

  c := null;
  select conname into c from pg_constraint
   where conrelid = 'public.invites'::regclass
     and contype = 'f' and confrelid = 'public.channels'::regclass limit 1;
  if c is not null then
    execute format('alter table public.invites drop constraint %I', c);
  end if;
  execute 'alter table public.invites add constraint invites_channel_id_fkey foreign key (channel_id) references public.channels(id) on delete cascade';

  c := null;
  select conname into c from pg_constraint
   where conrelid = 'public.message_reactions'::regclass
     and contype = 'f' and confrelid = 'public.messages'::regclass limit 1;
  if c is not null then
    execute format('alter table public.message_reactions drop constraint %I', c);
  end if;
  execute 'alter table public.message_reactions add constraint message_reactions_message_id_fkey foreign key (message_id) references public.messages(id) on delete cascade';
end $$;


-- ---------------------------------------------------------------------------
-- 11. Verify — after running, confirm every policy shows roles = {authenticated}.
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
