# Backend work — messaging issues

This doc lists the parts of the messaging fixes that must be implemented on the
**backend** (NestJS + Supabase). The frontend is already wired to consume these;
until they land, the corresponding UI features are inert (reactions/edit/delete/
files in DMs, and the "N replies" indicator).

The frontend changes are in `client/src/pages/EmptyWorkSpace.jsx` and
`client/src/api/dms.js`. Reference the existing channel-side code for each
pattern — the channel messaging feature set is the template the DM side should
mirror.

---

## 1. Direct messages: reactions, editing, deleting, and file attachments

Channels already support all of these (`server/src/messages/`). Direct messages
do not — `direct_messages` has only `id, conversation_id, user_id, content,
created_at`, and `DmsGateway` only handles `join_dm` / `leave_dm` / `send_dm`.

### 1a. Schema (Supabase SQL editor)

Add file columns to `direct_messages` (mirror `messages`):

```sql
alter table public.direct_messages
  add column file_path text,
  add column file_name text,
  add column file_type text,
  add column file_size bigint;
```

Reactions for channel messages live in `message_reactions` (keyed to
`messages.id`). DM messages live in a different table, so add a parallel table:

```sql
create table public.direct_message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.direct_message_reactions enable row level security;

-- A user can only create/delete their own reactions, and only on messages in a
-- conversation they belong to.
create policy "direct_message_reactions_all"
  on public.direct_message_reactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

(If you prefer to keep the "must be a conversation member" guard server-side,
leave the policy as `user_id = auth.uid()` and enforce membership in the
service — same as channels do via `verifyMembership`.)

### 1b. `server/src/dms/dms.service.ts`

- Extend `getMessages` and the `getConversation` "last message" select to include
  the new columns:

  ```ts
  'id, conversation_id, user_id, content, file_path, file_name, file_type, file_size, created_at',
  ```

- Enrich messages with reactions + `sender_name` the same way
  `MessagesService.getMessages` does (it uses `getProfileNames` from
  `src/config/profiles` and a reactions map). Add a
  `getReactions(messageIds, accessToken)` helper that queries
  `direct_message_reactions`, grouped into `{ emoji, count, users }`.

- Extend `sendMessage` to accept optional file fields and allow an empty
  `content` when a file is present:

  ```ts
  async sendMessage(
    conversationId, content, accessToken,
    filePath?, fileName?, fileType?, fileSize?,
  ) {
    if (!content?.trim() && !filePath) {
      throw new BadRequestException('Message content cannot be empty.');
    }
    // ...verifyMembership...
    const { data: message, error } = await client
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: content?.trim() ?? '',
        file_path: filePath ?? null,
        file_name: fileName ?? null,
        file_type: fileType ?? null,
        file_size: fileSize ?? null,
      })
      .select('id, conversation_id, user_id, content, file_path, file_name, file_type, file_size, created_at')
      .single();
    // ...
  }
  ```

- Add `editMessage` and `deleteMessage`, both enforcing "only your own message"
  (mirror `MessagesService.editMessage` / `deleteMessage` — verify the message's
  `user_id === user.id` before writing).

- Add `toggleReaction(messageId, emoji, userId, accessToken)` — upsert into
  `direct_message_reactions` if not present, delete if present (mirror
  `MessagesService.toggleReaction`).

### 1c. `server/src/dms/dms.gateway.ts`

Add these `@SubscribeMessage` handlers (mirror `MessagesGateway`), each verifying
`client.rooms.has(this.getRoomName(conversationId))`:

- `dm_toggle_reaction` — body `{ conversationId, messageId, emoji }`; toggles,
  then broadcasts `dm_reaction_updated { messageId, reactions }` to
  `dm:<conversationId>` and returns the reactions in the ack.
- `dm_edit_message` — body `{ conversationId, messageId, content }`; broadcasts
  `dm_message_edited { ...message }`.
- `dm_delete_message` — body `{ conversationId, messageId }`; broadcasts
  `dm_message_deleted { messageId, conversationId }`.

Also extend the existing `send_dm` handler to accept file fields and broadcast
them:

```ts
@SubscribeMessage('send_dm')
async sendDm(
  @MessageBody() body: {
    conversationId: string;
    content: string;
    filePath?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  },
  @ConnectedSocket() client: Socket,
) {
  // validate: (!content?.trim() && !body.filePath) => error
  const message = await this.dmsService.sendMessage(
    conversationId,
    content,
    accessToken,
    body?.filePath,
    body?.fileName,
    body?.fileType,
    body?.fileSize,
  );
  const payload = { ...message, sender_name: client.data.name ?? null, reactions: [] };
  this.server.to(this.getRoomName(conversationId)).emit('new_dm', payload);
  return { event: 'dm_sent', data: payload };
}
```

### 1d. DM file upload + signed URL (mirror the channel endpoints)

Add to the DMs controller two endpoints that mirror
`channels.controller.ts` (`POST :channelId/upload` and `GET :channelId/file`):

- `POST /api/dms/:conversationId/upload` — `@UseInterceptors(FileInterceptor("file"))`,
  delegates to `StorageService`. The storage service currently verifies
  `channel_members` membership and scopes the path to `${channelId}/`. Add a DM
  variant that verifies `conversation_members` membership and scopes to
  `${conversationId}/`. (`client/src/api/dms.js` already calls
  `/api/dms/:id/upload` and `/api/dms/:id/file?path=...`.)
- `GET /api/dms/:conversationId/file?path=...` — signed URL, with the same
  path-prefix / membership guards as `StorageService.getSignedUrl`.

> **Important:** keep the same security posture as the channel endpoints — verify
> conversation membership before upload/sign, and require the stored path to
> start with `${conversationId}/` to prevent cross-conversation file access.

---

## 2. Unread counts while viewing another channel

The frontend now solves this by **joining every channel/DM room** the user
belongs to (see `joinAllRooms()` in `EmptyWorkSpace.jsx`) and counting messages
that arrive for non-active rooms. That works with no backend change. Two
optional backend improvements to make it cleaner/more efficient:

### 2a. (Recommended) Add `channelId` to typing events

Because the client is now subscribed to every room, `user_typing` /
`user_stopped_typing` events from other channels leak in. The client currently
filters them against the active channel's member list, which is a heuristic.

Add the room's channel id to the payloads in `MessagesGateway`:

```ts
// typing()
client.to(room).emit('user_typing', { channelId, userId: client.data.userId, name: client.data.name });
// stop_typing()
client.to(room).emit('user_stopped_typing', { channelId, userId: client.data.userId });
```

Then the client can drop any event whose `channelId` isn't the active channel.
The frontend's `handleUserTyping` already tolerates the extra field.

### 2b. (Optional, more efficient) Per-user room

Instead of the client joining every channel room, emit new messages to a
per-user room as well:

```ts
// In MessagesGateway.sendMessage, after the channel room broadcast:
this.server.to(`user:${userIdOfEachMember}`) ... // or
this.server.to(`user:${...}`).emit('new_message', { ...message, reactions: [] });
```

This requires tracking each socket's `user:<id>` room on `handleConnection`
(`client.join('user:' + user.id)`) and emitting to it in `send_message`,
`send_reply`, `edit_message`, `delete_message`, and `toggle_reaction`. The
frontend unread logic is already room-agnostic (it keys off `channel_id`), so it
keeps working either way. **OS/web-push notifications are already implemented
and need no change** — `NotificationsService.sendToChannel` targets stored
subscriptions directly, not socket rooms.

---

## 3. Thread replies indicator ("N replies")

`MessagesService.getMessages` does not return a reply count, so the UI can't show
"2 replies" on a message. Add a `reply_count` field to every message returned by
`getMessages`.

Simplest approach — one extra query after the messages are fetched:

```ts
// After fetching `messages` (which already includes replies too, since they
// share the `messages` table with a `parent_id`), build the counts:
const replyCounts = new Map<string, number>();
for (const m of messages ?? []) {
  if (m.parent_id) {
    replyCounts.set(m.parent_id, (replyCounts.get(m.parent_id) ?? 0) + 1);
  }
}

// ...then in the final map():
return enriched.map((message) => ({
  ...message,
  sender_name: senderNames.get(message.user_id) ?? null,
  reply_count: replyCounts.get(message.id) ?? 0,
}));
```

Note: the current `getMessages` select already returns `parent_id` and fetches
**all** messages in the channel, so the reply count can be derived in-memory
with no extra round-trip. If you later add pagination, switch to a grouped
count query (`select parent_id, count(*) … in ('parent_id', messageIds)` or an
RPC).

The frontend already renders the indicator when `reply_count > 0` and increments
it locally when `reply_created` arrives, so once `getMessages` returns the field
the feature is complete.

---

## Summary of event contract (frontend ↔ backend)

| Client emits | Backend broadcasts | Purpose |
|---|---|---|
| `send_dm { conversationId, content, filePath?, fileName?, fileType?, fileSize? }` | `new_dm` | send DM (text or file) |
| `dm_toggle_reaction { conversationId, messageId, emoji }` | `dm_reaction_updated { messageId, reactions }` | react to a DM |
| `dm_edit_message { conversationId, messageId, content }` | `dm_message_edited { ...message }` | edit a DM |
| `dm_delete_message { conversationId, messageId }` | `dm_message_deleted { messageId, conversationId }` | delete a DM |

The `reactions` array shape is `[{ emoji, count, users: string[] }]` everywhere
(the same shape `MessagesService.getReactions` returns for channels).
