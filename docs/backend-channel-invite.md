# Backend: Invite-to-channel endpoint

The frontend now has an "Invite" flow that calls:

`POST /api/channels/:channelId/invite`

Please implement this endpoint. It adds a user to a channel by their email.

## Request

- Header: `Authorization: Bearer <inviter's access token>`
- Body: `{ "email": "user@example.com" }`

## Behavior

1. Validate the inviter's token (same `supabase.auth.getUser(token)` pattern already
   used in `ChannelsService`).
2. Verify the channel exists.
3. Verify the inviter is a member of that channel — otherwise 403.
4. Look up the invitee by email and get their `user.id`.
   - 404 "No user found with that email." if not found.
5. If the invitee is already a member — 409.
6. Insert a `channel_members` row (`channel_id`, `user_id = invitee.id`).
7. Return `{ message: "User invited successfully.", channel }`.

## Requirements

### 1. Service-role key (required)

Add `SUPABASE_SERVICE_ROLE_KEY` to `server/.env` (Supabase dashboard → Settings →
API → service_role key), and create a second Supabase client that uses it
(e.g. `server/src/config/supabaseAdmin.ts`).

You **must** use the service-role client for the insert. The existing
`channel_members_insert` RLS policy only allows a user to insert their *own* row
(`with check (user_id = auth.uid())`), so the inviter's own token cannot add
someone else — the service-role key bypasses RLS.

(Alternative: a `security definer` Postgres function, but the service-role client
is simpler.)

### 2. Email → user lookup

Use `supabase.auth.admin.listUsers()` and match by email (note: it is paginated,
default 50/page — fine for now). Or, if/when a `profiles` table exists, query it
by email instead.

## Code sketch

```ts
// server/src/config/supabaseAdmin.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
```

```ts
// channels.controller.ts
@Post(':channelId/invite')
async inviteUser(
  @Param('channelId') channelId: string,
  @Body('email') email: string,
  @Headers('authorization') authorization: string,
) {
  const accessToken = authorization?.replace('Bearer ', '');
  return this.channelsService.inviteUser(channelId, email, accessToken);
}
```

```ts
// channels.service.ts
import { supabaseAdmin } from '../config/supabaseAdmin';

async inviteUser(channelId: string, email: string, accessToken: string) {
  if (!channelId) throw new BadRequestException('Channel ID is required.');
  if (!email || !email.trim()) throw new BadRequestException('Email is required.');
  if (!accessToken) throw new UnauthorizedException('Authorization token is required.');

  const supabase = this.getAuthenticatedClient(accessToken);

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) throw new UnauthorizedException('Invalid or expired token.');

  const { data: channel, error: channelError } = await supabase
    .from('channels').select('id, name, created_by, created_at')
    .eq('id', channelId).single();
  if (channelError || !channel) throw new NotFoundException('Channel not found.');

  const { data: membership, error: membershipError } = await supabase
    .from('channel_members').select('channel_id, user_id')
    .eq('channel_id', channelId).eq('user_id', user.id).maybeSingle();
  if (membershipError) throw new BadRequestException(membershipError.message);
  if (!membership) throw new ForbiddenException('You must be a member of this channel to invite others.');

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new BadRequestException(listError.message);
  const invitee = users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (!invitee) throw new NotFoundException('No user found with that email.');

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('channel_members').select('channel_id, user_id')
    .eq('channel_id', channelId).eq('user_id', invitee.id).maybeSingle();
  if (existingError) throw new BadRequestException(existingError.message);
  if (existing) throw new ConflictException('User is already a member of this channel.');

  const { error: insertError } = await supabaseAdmin
    .from('channel_members').insert({ channel_id: channelId, user_id: invitee.id });
  if (insertError) throw new BadRequestException(insertError.message);

  return { message: 'User invited successfully.', channel };
}
```

## Notes

- Import `ForbiddenException` from `@nestjs/common` (not currently imported in
  `channels.service.ts`).
- The invited user will see the channel after reloading — the frontend fetches the
  channel list on load. Realtime "you've been added" is a separate future
  enhancement.

---

## Realtime "you've been added" (recommended, already wired on the frontend)

The frontend now listens for a socket event called `added_to_channel`. When it
arrives, it refetches the channel list and shows a notification — so the invited
user sees the new channel immediately, no reload needed.

To make this work, emit the event to the invitee after the `channel_members` insert
succeeds:

1. **Join every socket to a per-user room** in `MessagesGateway.handleConnection`
   (the user id is already read there from the token):

   ```ts
   client.join(`user:${user.id}`);
   ```

2. **Emit from the invite flow.** The invite lives in `ChannelsService`, which does
   not have the gateway's `server`. Inject the gateway into the channels module (or
   share the Socket.IO adapter) so the service can broadcast:

   ```ts
   this.messagesGateway.server
     .to(`user:${invitee.id}`)
     .emit('added_to_channel', { channel: { id: channelId, name: channel.name } });
   ```

   Payload shape the frontend expects: `{ channel: { id, name } }` (only `name` is
   actually rendered; `id` is available for future use).

If wiring the gateway into `ChannelsService` is inconvenient, this is purely an
enhancement — the core invite flow above already works without it (the invitee just
sees the channel after a reload).
