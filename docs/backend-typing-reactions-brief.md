# Typing + reactions — send-ready note (for Stephen)

> Send this note **together with** `docs/backend-typing-reactions.md`, which has the
> full technical spec (exact payload shapes + SQL). This note is the short cover.

---

Hey Stephen — the frontend now has a **typing indicator** ("X is typing…") and **emoji
reactions** on messages. They're calling socket events the backend doesn't send yet, so
nothing shows until the gateway is updated.

Full spec is in `docs/backend-typing-reactions.md` (pull latest from `preview`). In
short, three things:

1. **Add `name` to the `authenticated` event** — it currently only sends `{ userId }`.
   The typing indicator needs a display name (from `user_metadata.name` / `full_name` /
   email).
2. **Relay typing** — add `typing` / `stop_typing` handlers that broadcast `user_typing`
   / `user_stopped_typing` to the channel room. No DB work, just pass-through.
3. **Reactions** — add a `message_reactions` table (SQL is in the doc), a
   `toggle_reaction` gateway handler, and include `reactions` on message history +
   `new_message`.

The doc has the exact payload shapes the frontend expects. Can you take this one?
