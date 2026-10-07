# PR — copy-paste below the divider

**Title**

```
fix: resolve "couldn't reach server" CORS failure and duplicate messages
```

---

**Description**

```markdown
## Summary

Two bug fixes that were blocking real use of the app:

1. **"Couldn't reach the server"** — the backend was up and returning JSON, but the
   browser blocked every request because CORS was silently disabled.
2. **Messages sending twice** — the optimistic placeholder was being swapped for the
   real message by FIFO guess, so when the socket broadcast and ack landed out of order
   the same message rendered twice.

## What's included

### CORS fallback (`server/src/main.ts`, `server/.env.example`)

`app.enableCors({ origin: process.env.CLIENT_URL })` with `CLIENT_URL` unset passed
`origin: undefined`, which the `cors` package treats as "no CORS" — it copies the
explicit `undefined` over its `*` default, making `origin` falsy, so **no**
`Access-Control-Allow-*` headers were ever set. That is what surfaced as "Couldn't
reach the server" from the Vite client (:5173) calling the API (:4000).

Fix: default to `*` when `CLIENT_URL` is unset, and document `CLIENT_URL` in
`.env.example`. Auth uses `Authorization` headers (no cookies), so `*` is safe.

### Duplicate-message fix (`messages.gateway.ts`, `dms.gateway.ts`, `EmptyWorkSpace.jsx`)

The client renders a `temp-*` placeholder on send and swaps it for the real row on
ack/broadcast. The old swap took the oldest pending placeholder
(`pendingChannelSendsRef.current.values().next()`), which mis-matches under
out-of-order ack vs. `new_message`/`new_dm` broadcast — so the message rendered twice
(the DB was never double-inserted; this was purely a client reconciliation race).

Fix: the gateway now echoes the sender's `clientId` (their placeholder id) back on both
the broadcast and the ack, and the client swaps the exact `temp-*` row it matches.
Reconciliation is now idempotent regardless of ack/broadcast ordering.

## How to test

1. **Server reachable** — with `CLIENT_URL` unset in `server/.env`, restart the backend
   and confirm the client loads channels/messages without the "Couldn't reach the
   server" retry screen. A `curl -i` on an API route should show
   `Access-Control-Allow-Origin: *`.
2. **Single send** — send several channel messages and DMs quickly; each should appear
   exactly once, with no flicker or duplicate rows after reload.
