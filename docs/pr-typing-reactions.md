# PR → preview — copy-paste title & description

## Title

```
feat(messaging): typing indicators, emoji reactions, animations, and delete gate
```

## Description

```markdown
## Summary

Adds real-time typing indicators and emoji reactions to workspace messaging, plus
message/reaction/typing animations and a creator-only channel delete gate. Includes
backend handoff docs.

## What's included

- **Typing indicator** — "X is typing…" shows in a channel while another member types,
  with animated dots. Auto-clears after ~3s.
- **Emoji reactions** — hover a message to open a quick picker; reactions render as
  chips with counts, and tapping your own chip removes it. Six emojis (👍 ❤️ 😂 🎉 😮 😢).
- **Animations** — message-in, reaction-pop, and typing-dot animations, all respecting
  `prefers-reduced-motion`.
- **Channel delete gate** — the Delete button only appears for the channel creator
  (frontend-side guard).
- **Docs** — backend handoff specs under `docs/`.

## ⚠️ Dependencies (backend not live yet)

- **Typing + reactions** need socket events that aren't implemented yet. The frontend is
  ready and will "light up" once the gateway adds the `typing` / `stop_typing` relay,
  `name` in `authenticated`, and the `message_reactions` table + `toggle_reaction`
  handler (spec in `docs/backend-typing-reactions.md`). Until then these features are
  dormant and harmless.
- **Channel delete** needs the Supabase RLS DELETE policy + FK cascade
  (`docs/backend-channel-delete-sql.md`). The backend endpoint exists, but the delete
  won't succeed until that SQL is run.

> Note: the `chore(server)` commit is a sync of the backend from `preview` — those
> changes already exist on the base branch, so it should merge as a no-op.

## How to test

1. Open a channel and type in the composer — other members see the typing indicator.
2. Hover a message → 🙂 → pick an emoji → see it pop in. Click it again to remove.
3. As the creator, open Settings and confirm the Delete button shows; as a non-creator,
   confirm it's hidden.
```
