-- Direct-message files + reactions (+ edit/delete RLS)
-- ---------------------------------------------------------------------------
-- The DM service (server/src/dms/dms.service.ts) already writes and reads
-- `direct_messages.file_path / file_name / file_type / file_size / parent_id`
-- and `direct_message_reactions`, but the base schema in
-- `production-migration.sql` never added them. Until this migration is run,
-- every DM send fails ("Could not find the column ...") because the INSERT
-- references columns the table doesn't have, and the message-history SELECT
-- references file columns that don't exist. This is why "direct message" and
-- "file upload in direct message" were ineffective.
--
-- Depends on `public.current_user_conversations()` from production-migration.sql.
-- Run once in the Supabase SQL editor (Dashboard → SQL).
-- ---------------------------------------------------------------------------

-- 1. File metadata + nullable parent_id the service writes (mirrors messages).
alter table public.direct_messages
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_type text,
  add column if not exists file_size bigint,
  add column if not exists parent_id uuid;

-- 2. Reactions, keyed to direct_messages.id (parallel to message_reactions).
create table if not exists public.direct_message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.direct_message_reactions enable row level security;

-- Read reactions on messages in conversations you belong to.
drop policy if exists "direct_message_reactions_select" on public.direct_message_reactions;
create policy "direct_message_reactions_select" on public.direct_message_reactions
  for select to authenticated
  using (message_id in (
    select id from public.direct_messages
    where conversation_id in (select public.current_user_conversations())
  ));

-- Add only your own reaction, and only in a conversation you belong to.
drop policy if exists "direct_message_reactions_insert" on public.direct_message_reactions;
create policy "direct_message_reactions_insert" on public.direct_message_reactions
  for insert to authenticated
  with check (user_id = auth.uid()
              and message_id in (
                select id from public.direct_messages
                where conversation_id in (select public.current_user_conversations())
              ));

-- Remove only your own reaction.
drop policy if exists "direct_message_reactions_delete" on public.direct_message_reactions;
create policy "direct_message_reactions_delete" on public.direct_message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- 3. Edit / delete your own direct messages. The base migration only added
--    select + insert policies, so DM edit/delete were silently blocked by RLS.
drop policy if exists "direct_messages_update" on public.direct_messages;
create policy "direct_messages_update" on public.direct_messages
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "direct_messages_delete" on public.direct_messages;
create policy "direct_messages_delete" on public.direct_messages
  for delete to authenticated
  using (user_id = auth.uid());
