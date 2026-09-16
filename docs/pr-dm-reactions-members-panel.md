# PR — copy-paste below the divider

**Title**

```
feat: DM reactions & sender names, thread-only replies, members panel, mobile fixes
```

---

**Description**

```markdown
## Summary

Round of chat polish across DMs, threads, and the channel header:

- DMs now show **reactions and sender names** (they already existed for channels).
- Channel **thread replies no longer clutter the main feed** — they live in the thread
  panel, Slack-style.
- A new **members panel** slides in from the channel header.
- **Mobile/touch** viewport and hover-action fixes.

## What's included

### DM reactions + sender names (`server/src/dms/dms.service.ts`)

`getMessages` now hydrates each DM with its aggregated reactions (from
`direct_message_reactions`) and the sender's profile name — matching what channel
messages already receive.

### Thread-only replies (`server/src/messages/messages.service.ts`)

Channel replies (`parent_id` set) are filtered out of the main message list so they
only appear inside the thread panel. `reply_count` is still computed from the full set,
so the "N replies" indicator stays correct even though the replies themselves are
excluded.

### Members panel (`client/src/pages/EmptyWorkSpace.jsx`)

The member-count pill in the channel header is now a button that toggles a right-hand
`MembersPanel`. Members are sorted by role (owner → admin → member) then name, with the
current user tagged "(you)".

### Mobile/touch fixes (`client/src/pages/EmptyWorkSpace.jsx`)

- Avatar profile popover dismisses on outside tap (no `mouse-leave` on touch).
- Message hover actions are shown by default on coarse pointers.
- `h-screen` → `h-dvh` so the workspace fits dynamic mobile viewports.

## ⚠️ Dependency (Supabase SQL)

DM reactions require the `direct_message_reactions` table. If it isn't already applied,
run `docs/direct-message-files-reactions.sql` in the Supabase SQL editor first — until
then DM reactions simply won't exist, but nothing breaks.

## How to test

1. Open a DM — senders show names, and existing messages show reaction chips.
2. Reply in a channel thread — the reply appears in the thread panel, not the main feed;
   the parent's "N replies" counter increments.
3. Click the member-count pill — the members panel opens with members sorted by role.
4. On a phone/DevTools mobile emulation, tap the avatar → profile opens, tap outside →
   it closes; the workspace fills the viewport without the URL bar overlap.
```
