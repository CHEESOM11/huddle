# Remaining Work

Last updated: 2026-09-12

Inventory of what's still missing or unpolished after the backend/frontend
integration. Supersedes `docs/roadmap.md`, whose Phase 1–2 backlog is now
largely shipped (DMs, threads, search, reactions, invite links, file uploads,
roles column, member list/count are all done). Grouped by type, roughly in
priority order.

## A. Feature gaps (visible to users)

- **Presence (online/offline)** — no server presence module and no online/away
  dots in the UI. Typing indicators work, but "who's online" doesn't.
- **Unread badges / "new messages" dividers** — no per-channel or per-DM unread
  counts; you can't tell a channel has new messages without opening it.
- **Member panel** — `members` / `memberCount` are fetched into state but never
  rendered (no right-hand member list with roles/presence).
- **Roles & permissions enforcement** — the `role` column exists and the owner
  can delete a channel, but there's no promote/demote, no rename-channel
  (owner/admin only), and no kick/leave-member endpoints or UI.
- **@mentions** + mention/reaction notifications — nothing.
- **Image avatars / profile editing** — `avatar_url` is returned by the API but
  the UI draws color-initial circles only; no avatar upload or name/bio edit.
- **Markdown & code blocks** — messages render as plain text (no bold/italic/
  ``` fences).
- **Full emoji picker** — only the 6 hardcoded reaction emojis; no categories /
  recent / skin tones.
- **DM file uploads** — file/image upload works in channels; DM send is
  text-only.
- **Polish** — dark mode, `Ctrl/Cmd+K` command palette, toasts/skeleton loaders.

## B. Production-readiness gaps

- **No migrations / DB not reproducible** — the RLS policies, tables
  (`message_reactions`, `invites`, `conversations`, `conversation_members`,
  `direct_messages`, `profiles`) and the `create_conversation` RPC live only in
  the Supabase dashboard. `docs/*.sql` are scratch notes, not a migration
  system — a fresh Supabase project would break the app.
- **CORS is `*`** (socket gateway `origin: '*'` and `app.enableCors()`). Fine for
  dev; should be pinned to the production frontend origin.
- **Auth redirect env vars point at localhost** — `GOOGLE_AUTH_REDIRECT_URL`,
  `PASSWORD_RESET_REDIRECT_URL`.
- **No deploy config or CI** — no Dockerfile, `render.yaml`, `vercel.json`, or
  GitHub Actions workflow.
- **Zero tests** — no `*.spec.*` / `*.test.*` on backend or frontend.

## C. Hygiene

- **This session's work is uncommitted** on `david-fe-work` (perf fixes, realtime
  replies, DMs, profile popover, logout button, root `.gitignore`).
- **`client/.env` is tracked in git** (contains the public anon key + a
  `localhost` API URL — not a secret, but should be untracked).
- **`client/.env` carries unused `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`**
  — the client never imports `@supabase/supabase-js`; auth goes through the
  NestJS backend, so only `VITE_API_BASE_URL` matters for the frontend build.

## Evidence

- Presence: `grep presence server/src` → no matches.
- Tests: `find . -name "*.spec.*" -o -name "*.test.*"` → none.
- Avatars: `Avatar` renders initials via `initialsFor()`; the only `<img>` in
  `EmptyWorkSpace.jsx` is for file attachments.
- Client auth: no `@supabase/supabase-js` import anywhere under `client/src`.
