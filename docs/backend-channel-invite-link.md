# Backend: invite links (shareable link → join channel)

Replace the current "invite by email" flow with a **shareable invite link**. Instead of
typing an email, a member generates a link like `…/join/<code>` and shares it. Anyone
who opens it signs up/signs in with their real email, then redeems the link and is
added to the channel.

The frontend will call two endpoints and render a `/join/:code` page.

## Why this removes the service-role dependency

The old flow needed `supabaseAdmin` because the **inviter** was inserting someone
*else's* `channel_members` row (blocked by RLS). With invite links, the **invitee adds
themselves**, so the existing `channel_members` INSERT policy
(`with check (user_id = auth.uid())`) allows it. No service-role client needed.

## 1. Database — `invites` table

```sql
create table if not exists public.invites (
  code        text primary key,          -- short URL-safe code (see below)
  channel_id  uuid not null references public.channels(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,               -- optional; null = never expires
  uses        int not null default 0,
  max_uses    int                        -- optional; null = unlimited
);

alter table public.invites enable row level security;

-- Anyone logged in can read an invite they have the code for. The code IS the
-- secret — it's the authorization — so this is safe and avoids the
-- channel_members RLS recursion.
create policy "invites_select" on public.invites
  for select to authenticated using (true);

-- A member can create their own invite (backend still verifies membership).
create policy "invites_insert" on public.invites
  for insert to authenticated with check (created_by = auth.uid());

-- The creator can revoke their invite.
create policy "invites_delete" on public.invites
  for delete to authenticated using (created_by = auth.uid());
```

## 2. Backend endpoints

### 2a. Create invite — `POST /api/channels/:channelId/invite`

Header: `Authorization: Bearer <member's token>`. No body.

Behavior:
1. Validate token (`supabase.auth.getUser`).
2. Verify channel exists (404 otherwise).
3. Verify the inviter is a member of the channel (403 otherwise).
4. Generate a code — `randomBytes(8).toString('base64url')` (11 chars, URL-safe).
5. Insert into `invites` (`code`, `channel_id`, `created_by`).
6. Return `{ code }` (the frontend builds the full `…/join/<code>` URL itself).

```ts
import { randomBytes } from 'crypto';

async createInvite(channelId: string, accessToken: string) {
  // …validate token, channel exists, membership (same as current inviteUser)…

  const code = randomBytes(8).toString('base64url');

  const { error } = await supabase
    .from('invites')
    .insert({ code, channel_id: channelId, created_by: user.id });

  if (error) throw new BadRequestException(error.message);

  return { code };
}
```

> Replaces the existing `inviteUser(channelId, email, …)` — the `POST …/invite`
> endpoint should no longer take an `email`.

### 2b. Get invite info — `GET /api/invites/:code` (public, optional but recommended)

No auth. Lets the `/join/:code` page show "You've been invited to join #general"
*before* the user logs in. The code is the secret, so exposing the channel name is
fine.

```ts
async getInvite(code: string) {
  const { data, error } = await supabase
    .from('invites')
    .select('code, channel_id, expires_at, channels ( id, name )')
    .eq('code', code)
    .single();

  if (error || !data) throw new NotFoundException('Invite not found or expired.');
  if (data.expires_at && new Date(data.expires_at) < new Date())
    throw new GoneException('This invite link has expired.'); // or BadRequest

  return { channel: data.channels };
}
```

### 2c. Accept invite — `POST /api/invites/:code/accept`

Header: `Authorization: Bearer <invitee's token>`. No body.

Behavior:
1. Validate the invitee's token.
2. Look up the invite by code (404 if missing; reject if expired).
3. If the invitee is already a member → 409 (frontend just redirects to the channel).
4. Insert `channel_members` (`channel_id`, `user_id = invitee.id`) using the
   **authenticated client** (their own token) — allowed by the existing
   `channel_members` INSERT policy.
5. Optionally bump `uses` / enforce `max_uses`.
6. Return `{ channel }`.

```ts
async acceptInvite(code: string, accessToken: string) {
  const supabase = this.getAuthenticatedClient(accessToken);
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) throw new UnauthorizedException('Invalid or expired token.');

  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('channel_id, expires_at')
    .eq('code', code)
    .single();
  if (inviteError || !invite) throw new NotFoundException('Invite not found.');
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    throw new BadRequestException('This invite link has expired.');

  const { data: existing } = await supabase
    .from('channel_members')
    .select('channel_id, user_id')
    .eq('channel_id', invite.channel_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) throw new ConflictException('You are already a member of this channel.');

  const { error: insertError } = await supabase
    .from('channel_members')
    .insert({ channel_id: invite.channel_id, user_id: user.id });
  if (insertError) throw new BadRequestException(insertError.message);

  const { data: channel } = await supabase
    .from('channels')
    .select('id, name, created_by, created_at')
    .eq('id', invite.channel_id)
    .single();

  return { channel };
}
```

## 3. Realtime "you've been added" (optional, already wired on the frontend)

Emit `added_to_channel` to the invitee after the accept succeeds — same as the
existing invite doc: join each socket to `user:<id>` in `handleConnection`, then
broadcast to `user:${invitee.id}` with `{ channel: { id, name } }`.

## Payload shapes

- `POST /api/channels/:channelId/invite` → `{ code }`
- `GET /api/invites/:code` → `{ channel: { id, name } }`
- `POST /api/invites/:code/accept` → `{ channel: { id, name, created_by, created_at } }`

## Notes

- `GoneException` may not exist in your NestJS version — use `BadRequestException`
  with a clear message if so.
- Frontend builds the link as `${window.location.origin}/join/${code}`.
- Reuse the `current_user_channels()` / membership checks already in `ChannelsService`.
