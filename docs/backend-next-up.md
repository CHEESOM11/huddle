# Backend: full assignment (prioritized)

Covers every backend item on the roadmap — both the "missing" features and the "bonus"
items — with how to accomplish each. Work top-down.

---

## 1. Unblockers

### a. Create-channel RLS fix
`POST /api/channels` fails with `new row violates row-level security policy for table
"channels"`. The code already sends `created_by: auth.uid()`, so only the policies are
missing:

```sql
create policy "channels_insert" on public.channels
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "channel_members_insert" on public.channel_members
  for insert to authenticated
  with check (user_id = auth.uid());
```

### b. `message_reactions` table
Reactions throw until this exists:

```sql
create table public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
```

RLS: SELECT for channel members (reuse the same membership predicate `messages` uses),
INSERT/DELETE with `user_id = auth.uid()`. The `unique` constraint is required — the
service does a `maybeSingle()` on `(message_id, user_id, emoji)` to toggle.

### c. Invite links
`invites` table + 3 endpoints. Full spec in
[`backend-channel-invite-link.md`](backend-channel-invite-link.md).

---

## 2. Small endpoints (unblock the next frontend batch)

### d. Message edit & delete
- `PATCH /api/messages/:messageId` body `{ content }` → updated message.
- `DELETE /api/messages/:messageId`.
- Author check: only allow when `user_id = auth.uid()` (403 otherwise).
- Emit `message_updated` / `message_deleted` to the channel room so all clients sync.
  Payload for delete can be `{ messageId }`.

### e. Channel members + count
- `GET /api/channels/:channelId/members` →
  `{ members: [{ id, name, email, avatar_url, role }] }`.
- Add `member_count` to the channel list payload (or expose `GET /api/channels/:id/member-count`).
  The FE shows "👥 12" next to the channel name.

### f. Message search
- `GET /api/search?q=...` → full-text over `messages`, scoped to channels the caller
  belongs to.
- Add a generated `tsvector` column + GIN index:
  ```sql
  alter table messages
    add column search tsvector
    generated always as (to_tsvector('english', content)) stored;
  create index messages_search_idx on messages using gin(search);
  ```
- Return `{ messages: [{ ...message, channel, author }] }` with the matched channel + a
  snippet.

### g. Presence
- Join each socket to `user:<id>` on connect (see the invite spec's realtime note).
- On connect emit `presence_update { userId, status: 'online' }` to the channel rooms the
  user is in; on disconnect emit `status: 'offline'`. (Track joined rooms per socket, or
  broadcast to `channel:*` after verifying membership.)

---

## 3. Core features

### h. Direct messages
New module. Schema:
```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
```
Endpoints:
- `POST /api/dms` body `{ userIds: string[] }` → find-or-create conversation → `{ conversation }`
- `GET /api/dms` → conversations with members + last message
- `GET /api/dms/:id/messages`
- `POST /api/dms/:id/messages`

Socket: reuse the existing messaging flow but with room `dm:<conversationId>` instead of
`channel:<channelId>` (join on open, emit `new_message`, `user_typing`, `reaction_updated`).

### i. Threads
- Add nullable `parent_id uuid references messages(id) on delete cascade` to `messages`.
- `GET /api/messages/:messageId/replies`, `POST /api/messages/:messageId/replies`.
- Reuse reactions/typing per-thread by scoping the room to the thread or filtering by
  `parent_id` in the client.

### j. Roles & permissions
- Add `role text not null default 'member'` (`owner`/`admin`/`member`) to `channel_members`.
- Enforce in `PATCH /api/channels/:id` (rename/topic) and new `DELETE /api/channels/:id/members/:userId`
  (kick). Only owner/admin can rename/kick; a member can leave themselves.
- Return `role` in the members endpoint (e).

### k. File uploads
- Supabase Storage bucket `attachments`; `POST /api/channels/:id/attachments` (multipart)
  uploads and returns a signed URL.
- Message payload gains `attachments[]` (url, name, mime, size). Add an `attachments`
  table or a jsonb column on `messages`.

---

## 4. Bonus features (backend half)

### l. @mentions + notification pings
- `send_message` accepts optional `mentions: string[]` (user ids) — or parse `@name` from
  content server-side.
- After saving, emit `mention` to each mentioned user's `user:<id>` room:
  `{ channel: { id, name }, message, mentionedBy: { id, name } }`.
- Also emit a `reaction_notification` when someone reacts to a message: the FE can derive
  this from `reaction_updated` (it carries `users[]`), but a dedicated `reaction_notified`
  event to `user:<messageAuthorId>` makes it reliable.
- Optional: a `message_mentions` table for a persistent "Mentions" tab.

### m. User profiles & avatars
- Add a `profiles` table (or sync from `auth.users` metadata):
  ```sql
  create table public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    bio text,
    avatar_url text,
    updated_at timestamptz not null default now()
  );
  ```
- `PATCH /api/users/me` body `{ name, bio, avatar_url }` → upsert profile.
- `POST /api/users/me/avatar` (multipart) → upload to Storage bucket `avatars`, set
  `avatar_url`, return the signed URL.
- Return `name` + `avatar_url` in members (e), message authors, and reaction data so the
  FE can render avatars and the member list.

### n. Notification preferences
- `notification_settings` table (user_id PK; booleans for mention/reaction/DM/email/push).
- `GET /api/users/me/notifications` and `PATCH /api/users/me/notifications`.

---

## Shared conventions
- Keep the message shape consistent:
  `{ id, channel_id, user_id, content, created_at, reactions[] }` (add `parent_id`,
  `attachments[]` as they land).
- Reuse `verifyChannelMembership` / `getAuthenticatedClient` helpers.
- All socket broadcasts go to the relevant room (`channel:<id>`, `dm:<id>`, or `user:<id>`);
  ack callbacks return `{ event: 'error', message }` on failure.
