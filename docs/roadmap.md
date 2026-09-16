# Huddle Roadmap

Last updated: 2026-09-11

## Status snapshot

**Done / live**
- Auth: sign in/up, email confirmation, forgot password, onboarding, profile setup
- Channels: list, create, delete, join, client-side search
- Messaging: real-time send, typing indicators, reactions
- Invite links (frontend committed; backend pending)
- Basic client-side notifications (bell + "added to channel")

**Blocked on backend right now** → see [`backend-frontend-pending.md`](backend-frontend-pending.md)
- Create-channel RLS INSERT policy
- `message_reactions` table (reactions)
- Invite-link endpoints + `invites` table

---

## Backlog by priority

Legend: **FE** = frontend-only · **BE** = needs backend · **Both**

### Phase 1 — unblock + small backend endpoints
| Feature | Needs | Notes |
|---|---|---|
| Fix create-channel RLS | BE | `channels_insert` + `channel_members_insert` policies |
| `message_reactions` table | BE | unblocks reactions |
| Invite links | BE | `invites` table + 3 endpoints (spec exists) |
| Message edit & delete | Both | `PATCH`/`DELETE /api/messages/:id` + `message_updated`/`message_deleted` socket events |
| Channel member list + count | Both | `GET /api/channels/:id/members`; add `member_count` to list |
| Message search | Both | `GET /api/search?q=` full-text (Supabase FTS) |
| Presence (online/offline) | Both | socket `presence_update` on connect/disconnect |

### Phase 2 — core gaps
| Feature | Needs | Notes |
|---|---|---|
| Direct messages | Both | biggest gap; new `dms`/`conversations` module |
| Threads / replies | Both | `parent_id` on messages |
| @mentions | Both | FE autocomplete + backend ping |
| Message hover toolbar | Both | react/copy are FE; edit/delete need BE |
| Emoji picker (full) | FE | categories, recent, skin tones |
| Markdown + code blocks | FE | bold/italic/code/``` fences |

### Phase 3 — polish / "bonus points"
| Feature | Needs | Notes |
|---|---|---|
| `Ctrl/Cmd+K` command palette | FE | fuzzy search channels + quick actions |
| Dark mode | FE | theme tokens already exist |
| Notifications upgrade | Both | unread badge, All/Mentions tabs, reaction/mention notifications |
| Discord-style member panel | Both | member list + presence dots |
| User profiles / avatars | Both | view + upload/edit |
| Roles & permissions | Both | `role` on `channel_members`; owner/admin/member |
| File/image uploads | Both | Supabase Storage bucket |
| Unread badges + "new messages" divider | FE | socket events already available |
| User popover/profile card | FE | hover name → avatar/name/role/Message |
| Toasts + skeleton loaders | FE | polish |

---


