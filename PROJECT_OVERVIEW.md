

---

## What is Huddle?

**Huddle is a real-time team communication platform** — channels, direct messages,
threaded conversations, search, and file sharing — in the spirit of Slack or
Discord, but built from scratch by our team.

In one sentence: *a shared workspace where a team talks in organized topics, holds
private conversations, and finds anything that was ever said — with security
enforced all the way down to the database.*

---

## The problem it solves

Teams talk in an endless single chat, lose important messages, and can't
separate topics. Enterprise chat tools exist but are expensive, heavy, and
closed. Huddle gives a team:

- **Structure** — conversations live in channels by topic, not one noisy thread.
- **Privacy** — direct messages for one-on-one (and group) talks.
- **Memory** — every message is searchable, so nothing is lost.
- **Speed** — messages appear instantly, no refresh.

---

## What it does (shipped features)

**Accounts & access**
- Email/password sign-up with email verification
- Password reset (forgot → reset flow)
- Google sign-in (OAuth)

**Channels**
- Create, rename, and delete channels
- Member list and member count
- Roles — **owner / admin / member**
- Invite links to join a channel

**Messaging**
- Send messages in real time (no page refresh)
- **Threaded replies** — reply to a specific message, in real time
- **Emoji reactions** on messages

**Direct messages**
- Private one-to-one conversations in real time
- A "new message" picker to find and message any teammate
- Hover a profile → "Message" to start a DM instantly

**Search**
- Full-text search across your message history, scoped to channels you belong to

**Files**
- Upload and share files in a channel
- Secure, expiring download links (signed URLs)

---

## How it works (architecture)

Three clean layers:

```
 ┌──────────────────┐      REST + WebSocket       ┌──────────────────────────┐
 │     Browser      │ ─────────────────────────► │   Backend (NestJS API)   │
 │   React app      │                            │   • REST endpoints       │
 │   (on Vercel)    │ ◄───────────────────────── │   • Socket.IO realtime   │
 └──────────────────┘                            └────────────┬─────────────┘
                                                              │  acts as the
                                                              │  signed-in user
                                                              ▼
                                                  ┌──────────────────────────┐
                                                  │        Supabase          │
                                                  │  Postgres · Auth · Files │
                                                  │  (row-level security)    │
                                                  └──────────────────────────┘
```

1. **Frontend** — a React single-page app. It talks only to our API, never
   directly to the database.
2. **Backend** — a NestJS server that exposes REST endpoints *and* live
   WebSocket channels. It verifies every request and forwards it to Supabase
   **as the signed-in user** (never as an all-powerful admin).
3. **Data layer** — Supabase: the Postgres database, user authentication, and
   file storage. Every table has **Row Level Security (RLS)**, so the database
   itself refuses to return or write anything the user isn't allowed to touch.

**Realtime** works through WebSocket "rooms": a message sent in a channel is
pushed instantly to everyone in that channel's room. Same for replies and
direct messages.

---

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, Tailwind CSS, React Router |
| Backend    | NestJS (Node.js/TypeScript), Socket.IO |
| Database   | PostgreSQL (via Supabase), Row Level Security |
| Auth       | Supabase Auth (email + OAuth) |
| Files      | Supabase Storage |
| Search     | PostgreSQL full-text search (indexed) |
| Deployment | Frontend on **Vercel**, backend on **Render** |

---

## Why it's built well (talking points for senior staff)

- **Security is the foundation, not an afterthought.** Authorization is enforced
  at the database layer with Row Level Security on every table. The app never
  uses an admin/service-role key — it always acts as the signed-in user. Even a
  bug in the API can't leak data the user shouldn't see, because the database
  would refuse it.
- **Real-time by design.** Messages, replies, and reactions travel over
  WebSockets and appear instantly — the core promise of a chat product, done
  properly rather than with polling.
- **Performance was measured and fixed.** Early on, loading message/member lists
  fired one database request *per user* (N+1), making sends feel slow. That was
  replaced with a single batched query, cutting a send from multiple round trips
  down to a minimal path. Search is backed by a database full-text index, not a
  slow scan.
- **Clean separation of concerns.** Frontend, API, and data are independent
  layers with a single defined contract between them — easy to test, deploy, and
  grow.
- **It's actually deployed and live** across Vercel + Render + Supabase, not a
  local-only prototype.

---

## Current status

**Live today:** everything in the feature list above. The app is deployed
(frontend on Vercel, backend on Render, data on Supabase) and functional
end-to-end: sign up → verify email → create/join channels → chat in real time →
search history → share files.

**In progress / next up:**
- Presence — see who's online
- Unread badges and "new messages" markers
- @mentions and notifications
- Profile pictures and profile editing
- Markdown formatting in messages
- A fuller emoji picker
- Polish: dark mode, command palette, loading skeletons

---

## How to demo it (60 seconds)

1. **Sign up** (or sign in) — note the email verification flow.
2. **Create a channel**, then **invite** a second account via the invite link.
3. **Send a message** — highlight that it appears instantly with no refresh.
4. **Reply in a thread** and add a **reaction**.
5. **Start a direct message** by hovering a teammate's profile → "Message".
6. **Search** for a word and show the results, each tagged with its channel.
7. **Upload a file** and open it through the secure download link.

**Three one-liners to fall back on:**
1. "It's a from-scratch team chat app — channels, DMs, threads, search, files."
2. "Authorization lives in the database, so no bug in our code can leak data."
3. "Messages are real-time over WebSockets, and it's deployed and live right now."
