# Pending: backend items the frontend is waiting on

Three things are blocked on backend/Supabase work. The frontend for all three is
already written and committed.

## 1. Create channel is broken (urgent)

`POST /api/channels` now returns:

```
new row violates row-level security policy for table "channels"
```

Delete works, create doesn't — the `channels` **INSERT** policy is missing. The
backend code already sends `created_by: auth.uid()` on insert, so only the policy
is needed:

```sql
create policy "channels_insert" on public.channels
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "channel_members_insert" on public.channel_members
  for insert to authenticated
  with check (user_id = auth.uid());
```

## 2. Invite links (Chisom)

Frontend is done and committed: the email-based invite is replaced by a shareable
`/join/:code` flow. Still needed from the backend — the full spec is in
[`backend-channel-invite-link.md`](backend-channel-invite-link.md):

- `invites` table + RLS
- `POST /api/channels/:channelId/invite` → `{ code }` (no more `email` body)
- `GET /api/invites/:code` (public) → `{ channel: { id, name } }`
- `POST /api/invites/:code/accept` → `{ channel }` (redeems with the invitee's own token)

## 3. Reactions need the `message_reactions` table

Typing indicators work already (pure sockets, no DB). Reactions throw until this
table exists. The backend reads/writes `id`, `message_id`, `user_id`, `emoji`.

Suggested schema:

```sql
create table public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
```

Enable RLS and add policies using the same channel-membership pattern as `messages`
(SELECT for channel members, INSERT/DELETE for `user_id = auth.uid()`).
