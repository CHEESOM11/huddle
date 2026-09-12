# Backend channel issues — two remaining fixes

The frontend is done and working. Two backend/database items remain before
channels are fully functional end-to-end.

---

## 1. Create channel fails — "new row violates row-level security policy for table channels"

The channel list loads fine now, but creating a channel is rejected by RLS
because there is **no `INSERT` policy** on `channels`. The backend inserts
`created_by = auth.uid()` (the user's id), so add these two policies in the
Supabase SQL Editor:

```sql
create policy "channels_insert" on public.channels
for insert to authenticated with check (created_by = auth.uid());

create policy "channel_members_insert" on public.channel_members
for insert to authenticated with check (user_id = auth.uid());
```

Confirm they exist after running:
```sql
select tablename, policyname, cmd, with_check
from pg_policies
where schemaname = 'public' and tablename in ('channels','channel_members')
  and cmd = 'INSERT';
```

---

## 2. Delete channel not working — missing DELETE endpoint + policy

The frontend calls `DELETE /api/channels/:channelId`, but the server has **no
delete route** (only `POST /`, `GET /`, `POST /:id/join`). Two changes needed:

### a) Backend (NestJS)

In `server/src/channels/channels.controller.ts`, add `Delete` to the
`@nestjs/common` import and add:

```ts
@Delete(":channelId")
async deleteChannel(
  @Param("channelId") channelId: string,
  @Headers("authorization") authorization: string,
) {
  const accessToken = authorization?.replace("Bearer ", "");
  return this.channelsService.deleteChannel(channelId, accessToken);
}
```

In `server/src/channels/channels.service.ts`, add this method (and import
`ForbiddenException` from `@nestjs/common`):

```ts
async deleteChannel(channelId: string, accessToken: string) {
  if (!channelId) {
    throw new BadRequestException("Channel ID is required.");
  }
  if (!accessToken) {
    throw new UnauthorizedException("Authorization token is required.");
  }

  const supabase = this.getAuthenticatedClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new UnauthorizedException("Invalid or expired authorization token.");
  }

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("id, created_by")
    .eq("id", channelId)
    .single();

  if (channelError || !channel) {
    throw new NotFoundException("Channel not found.");
  }

  if (channel.created_by !== user.id) {
    throw new ForbiddenException("You can only delete channels you created.");
  }

  const { error: deleteError } = await supabase
    .from("channels")
    .delete()
    .eq("id", channelId);

  if (deleteError) {
    throw new BadRequestException(deleteError.message);
  }

  return { message: "Channel deleted successfully." };
}
```

### b) RLS DELETE policy

```sql
create policy "channels_delete" on public.channels
for delete to authenticated
using (created_by = auth.uid());
```

### c) Cascade the memberships

The `channel_members` rows pointing at the deleted channel must also go. Either:

- set the `channel_members.channel_id` foreign key to `on delete cascade`, or
- delete the memberships in the service before deleting the channel.

Otherwise the delete fails with a foreign-key constraint error.

---

## Note

The delete code above only lets the channel **creator** delete. The frontend
currently shows a Delete button for every channel in the list; if you want the
button hidden for channels the user didn't create, that's a small frontend
change (gate on `channel.createdBy`) — just ask.
