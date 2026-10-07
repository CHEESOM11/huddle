# PR — copy/paste below the divider

**Title**

```
Add Vercel/Render production deployment config
```

---

**Description**

```markdown
## What

Wires the deployed Vercel frontend to the Render backend so the production
site actually talks to the API instead of `localhost`.

- **`vercel.json`** — SPA rewrite so React Router deep links (`/workspace`,
  `/login`, `/reset-password`, etc.) don't 404 on Vercel.
- **`client/.env.production`** — sets `VITE_API_BASE_URL=https://huddle-9fmz.onrender.com`
  so the production build points at Render for **both** REST calls and socket
  connections (it's the single source of truth in `client/src/api/client.js`
  and `client/src/lib/socket.js`).
- **`.gitignore`** — un-ignores `client/.env.production` (no secrets, just the
  Render URL) while keeping every other `.env*` file ignored.

## Why

Previously the production build inlined `VITE_API_BASE_URL=http://localhost:4000`
(from the tracked `client/.env`), so the deployed frontend called `localhost`
from the browser — which is why the Vercel ↔ Render connection appeared broken.
Baking the Render URL into the production build fixes that without requiring
per-account environment variables.

## Note for the deployer (account owner)

These are repo-level, so they apply to whoever builds the branch. Still required
**outside the repo**, in the account dashboards:

- **Render → Environment:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `PASSWORD_RESET_REDIRECT_URL=https://huddle-ochre-one.vercel.app/reset-password`,
  `GOOGLE_AUTH_REDIRECT_URL=https://huddle-ochre-one.vercel.app` (Render sets `PORT`).
- **Supabase → Authentication → URL Configuration:** add
  `https://huddle-ochre-one.vercel.app` as an allowed Site/redirect URL.

## Known follow-up (not in this PR)

Backend CORS is still `*` — works for the cross-origin calls but should be
pinned to `https://huddle-ochre-one.vercel.app` before production hardening.
See `docs/remaining-work.md` for the full list.
```
