# Backend: typing indicators + message reactions

The frontend now implements typing indicators, emoji reactions, and the related
animations. It expects the following socket events and message shape. This needs
two small additions to `MessagesGateway` and one new table.

## 1. Include the user's display name in `authenticated`

Currently `handleConnection` emits only `{ userId: user.id }`. Add a `name` so the
frontend can show "X is typing…":

```ts
const name =
  user.user_metadata?.name ??
  user.user_metadata?.full_name ??
  user.email ??
  'Someone';

client.data.userId = user.id;
client.data.name = name;

client.emit('authenticated', { userId: user.id, name });
```

## 2. Typing relay (no persistence)

Add two handlers to `MessagesGateway`:

```ts
@SubscribeMessage('typing')
async typing(
  @MessageBody() body: { channelId: string },
  @ConnectedSocket() client: Socket,
) {
  const channelId = body?.channelId;
  const room = this.getRoomName(channelId);

  if (channelId && client.rooms.has(room)) {
    // broadcast to everyone else in the room (not the sender)
    client.to(room).emit('user_typing', {
      userId: client.data.userId,
      name: client.data.name,
    });
  }
}

@SubscribeMessage('stop_typing')
async stopTyping(
  @MessageBody() body: { channelId: string },
  @ConnectedSocket() client: Socket,
) {
  const channelId = body?.channelId;
  const room = this.getRoomName(channelId);

  if (channelId && client.rooms.has(room)) {
    client.to(room).emit('user_stopped_typing', {
      userId: client.data.userId,
    });
  }
}
```

The frontend auto-expires typing after ~3.5s, so `stop_typing` is a nicety but
recommended — it clears a stale "is typing" when a tab closes or the user clears the
composer.

## 3. Message reactions

### Table

```sql
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;
```

RLS policies (non-recursive):

```sql
-- anyone who can see the message can see its reactions
create policy "reactions_select" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      join public.channel_members cm on cm.channel_id = m.channel_id
      where m.id = message_id and cm.user_id = auth.uid()
    )
  );

-- a user can only add/remove their own reaction
create policy "reactions_insert" on public.message_reactions
  for insert with check (user_id = auth.uid());

create policy "reactions_delete" on public.message_reactions
  for delete using (user_id = auth.uid());
```

If `channel_members` RLS recursion is still an issue, reuse the
`current_user_channels()` helper from `docs/backend-channel-rls-issue.md` inside the
SELECT policy instead of the `join`.

### Service: toggle + fetch reactions

Add to `MessagesService`:

```ts
async getReactions(messageIds: string[], accessToken: string) {
  const supabase = this.getAuthenticatedClient(accessToken);

  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, emoji, user_id')
    .in('message_id', messageIds);

  if (error) throw new BadRequestException(error.message);

  // group into { emoji, count, users } per message id
  const map = new Map<string, { emoji: string; count: number; users: string[] }[]>();

  for (const row of data ?? []) {
    const list = map.get(row.message_id) ?? [];
    let entry = list.find((r) => r.emoji === row.emoji);
    if (!entry) {
      entry = { emoji: row.emoji, count: 0, users: [] };
      list.push(entry);
    }
    entry.count += 1;
    entry.users.push(row.user_id);
    map.set(row.message_id, list);
  }

  return map;
}

async toggleReaction(
  messageId: string,
  emoji: string,
  userId: string,
  accessToken: string,
) {
  const supabase = this.getAuthenticatedClient(accessToken);

  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
  } else {
    await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
  }
}
```

### Gateway: `toggle_reaction`

```ts
@SubscribeMessage('toggle_reaction')
async toggleReaction(
  @MessageBody() body: { channelId: string; messageId: string; emoji: string },
  @ConnectedSocket() client: Socket,
) {
  try {
    const { channelId, messageId, emoji } = body ?? {};
    const accessToken = client.data.accessToken;
    const userId = client.data.userId;

    if (!accessToken || !userId) {
      return { event: 'error', message: 'Socket authentication required.' };
    }
    if (!channelId || !messageId || !emoji) {
      return { event: 'error', message: 'channelId, messageId, and emoji are required.' };
    }

    await this.messagesService.verifyChannelMembership(channelId, userId, accessToken);

    await this.messagesService.toggleReaction(messageId, emoji, userId, accessToken);

    const reactionsMap = await this.messagesService.getReactions([messageId], accessToken);
    const reactions = reactionsMap.get(messageId) ?? [];

    this.server
      .to(this.getRoomName(channelId))
      .emit('reaction_updated', { messageId, reactions });

    return { event: 'reaction_toggled', messageId, reactions };
  } catch (error) {
    return {
      event: 'error',
      message: error instanceof Error ? error.message : 'Unable to toggle reaction.',
    };
  }
}
```

### Include reactions in message history

In `getMessages`, attach reactions to each message before returning:

```ts
const messageIds = (messages ?? []).map((m) => m.id);
const reactionsMap = await this.getReactions(messageIds, accessToken);

return (messages ?? []).map((m) => ({
  ...m,
  reactions: reactionsMap.get(m.id) ?? [],
}));
```

Also, when broadcasting `new_message`, include an empty `reactions` array so the
frontend always has the field:

```ts
this.server.to(room).emit('new_message', { ...message, reactions: [] });
```

## Payload shapes the frontend expects

- `authenticated`: `{ userId, name }`
- `user_typing`: `{ userId, name }`
- `user_stopped_typing`: `{ userId }`
- `reaction_updated`: `{ messageId, reactions: [{ emoji, count, users: string[] }] }`
- message: `{ id, channel_id, user_id, content, created_at, reactions: [...] }`

The frontend derives "did I react?" by checking
`reactions[].users.includes(currentUserId)` — so `users` must contain the raw user
ids of everyone who reacted.
