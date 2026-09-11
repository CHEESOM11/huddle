# Delete channel — DB setup (for whoever has Supabase access)

## What's going on

The delete-channel feature is already coded on both sides:

- **Frontend** — the Delete button only shows for the channel creator.
- **Backend** — `deleteChannel()` in `server/src/channels/channels.service.ts` checks the
  requester is the creator, then runs the delete.

So the app code is done. What's left is **one-time Supabase setup**. The actual delete
happens in the database, and Supabase has two guards that will block it unless we
configure them. This is not a code change — it's a SQL change in the dashboard.

## Why deleting fails right now

When someone deletes a channel, Supabase effectively runs:

```sql
delete from channels where id = '<channel_id>';
```

Two things can stop it:

1. **Row-Level Security (RLS)** — `channels` has RLS enabled, but there's no policy
   saying "the creator may delete their own channel". Without it, Supabase blocks the
   delete with something like **"violates row-level security policy"**.

2. **Foreign keys** — `channel_members.channel_id` and `messages.channel_id` point at
   `channels.id`. If those foreign keys don't have `on delete cascade`, deleting a
   channel that already has members or messages fails with a
   **"foreign key constraint violation"**.

## What to do

Open the Supabase dashboard → **SQL Editor** → paste the block below → **Run**.

```sql
-- 1. Allow a user to delete a channel they created
create policy "channels_delete" on public.channels
  for delete to authenticated
  using (created_by = auth.uid());

-- 2. Make deletes cascade so members and messages go with the channel.
--    If the constraint names below don't match your DB, find the real ones with:
--      select conrelid::regclass as table, conname, confrelid::regclass as ref
--      from pg_constraint
--      where contype = 'f'
--        and conrelid in ('public.channel_members'::regclass, 'public.messages'::regclass);
alter table public.channel_members
  drop constraint if exists channel_members_channel_id_fkey;

alter table public.channel_members
  add constraint channel_members_channel_id_fkey
  foreign key (channel_id) references public.channels(id) on delete cascade;

alter table public.messages
  drop constraint if exists messages_channel_id_fkey;

alter table public.messages
  add constraint messages_channel_id_fkey
  foreign key (channel_id) references public.channels(id) on delete cascade;
```

## How to check it worked

1. Create a channel.
2. Send a message in it (and/or invite someone).
3. Delete the channel as the **creator** — it should delete cleanly, along with its
   messages and memberships.

As a **non-creator**, the Delete button shouldn't appear at all, and a direct delete
call would be rejected by the backend with "You can only delete channels you created."
