# Channel creation blocked by RLS (missing INSERT policies)

> **Status: ❌ still failing as of 2026-09-12.**
> The fix below has not landed in the database yet.

## Symptom

```
POST /api/channels  →  400
"new row violates row-level security policy for table \"channels\""
```

The frontend shows this when a user tries to create a channel from the workspace
sidebar (`+` button).

## Root cause

The `channels` and `channel_members` tables have **Row Level Security (RLS)**
enabled but are **missing their INSERT policies**. The backend code is correct —
it inserts `created_by = auth.uid()` and then adds the creator to
`channel_members` — but with no INSERT policy, Postgres rejects the insert.

## What's already been verified (do not re-investigate)

- Backend `channels.service.ts` correctly inserts `created_by: user.id` (the
  authenticated user's uuid). ✅
- `channels.created_by` is a `uuid` column (confirmed against live data). ✅
- The `current_user_channels()` helper and the SELECT policies are **already
  present** — that was the separate "infinite recursion" fix and it's done. ✅
- The **only** missing piece is the two INSERT policies below.

## Fix — run in the Supabase SQL Editor

```sql
drop policy if exists "channels_insert_own" on public.channels;
create policy "channels_insert_own" on public.channels
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "channel_members_insert_self" on public.channel_members;
create policy "channel_members_insert_self" on public.channel_members
  for insert
  to authenticated
  with check (user_id = auth.uid());
```

The `drop policy if exists` lines make this idempotent — safe to run repeatedly.

## Verify (must return 2 rows)

```sql
select tablename, policyname, cmd, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('channels', 'channel_members')
  and cmd = 'INSERT';
```

Expected:

| tablename        | policyname                    | cmd    |
|------------------|-------------------------------|--------|
| channels         | channels_insert_own           | INSERT |
| channel_members  | channel_members_insert_self   | INSERT |

## Project

The backend points to:

```
https://rcrasdxdggxkfdcjkamy.supabase.co
```

Make sure the SQL editor is on **this** project (project ref
`rcrasdxdggxkfdcjkamy`). Running the SQL in a different Supabase project will
not fix this backend.

## How to re-test

1. Create a confirmed user (service role, `email_confirm: true`).
2. `POST /api/auth/login` to get an access token.
3. `POST /api/channels` with `{ "name": "test-…" }` and `Authorization: Bearer <token>`.

Expected: `201` with the created channel — no RLS error.

---

See also: `docs/supabase-rls-policies.sql` (full script, including the SELECT
policies and the `current_user_channels()` helper).
