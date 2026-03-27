# Game Collection Frontend

Frontend-only repo for the game collection website.

## Structure

- **frontend/** — React + Vite + Bootstrap app.
- Game UIs live in `frontend/src/games/<game-name>/`.

## Quick start

```bash
npm run install:all
npm run dev
```

- Frontend local URL: `http://localhost:5173`

## Scripts

| Command | Description |
|--------|-------------|
| `npm run install:all` | Install root + frontend dependencies |
| `npm run dev` | Run frontend (Vite) |
| `npm run build` | Build frontend |
| `npm run preview` | Preview built frontend |

## Backend API configuration

All API calls go through `frontend/src/api.js` (`apiUrl(path)`).  
`API_BASE = import.meta.env.VITE_API_BASE_URL || ''`.

### Cloudflare Pages (recommended): same-origin `/api` via proxy

Deploy this repo to **Cloudflare Pages** with:

- **Build command:** `npm run install:all && npm run build:frontend`
- **Build output directory:** `frontend/dist`
- **Functions:** this repo includes `functions/api/[[path]].js`, which proxies `/api/*` to your Worker.

In Pages → **Settings → Environment variables**:

| Name | Example |
|------|--------|
| `BACKEND_URL` | `https://game-collection-backend.sy-dev.workers.dev` (no trailing slash) |
| `VITE_API_BASE_URL` | leave **empty** or set to your Pages URL, e.g. `https://<project>.pages.dev` |

Redeploy after changing env vars so Vite bakes `VITE_API_BASE_URL` into the client bundle.

Verify: `https://<project>.pages.dev/api/health` → `{"ok":true}`.

### Local dev (same-origin `/api`)

Use `frontend/.env.local` with **empty** API base so the app calls `/api/...` on the Vite dev server; `vite.config.js` proxies `/api` to the Worker (override with `VITE_DEV_PROXY_API_TARGET` if needed).

```env
VITE_API_BASE_URL=
```

### Direct Worker URL (no proxy)

If you must call the Worker hostname from the browser (not recommended for users on restrictive DNS):

```env
VITE_API_BASE_URL=https://game-collection-backend.sy-dev.workers.dev
```

## Backend integration handoff

Use `FRONTEND_BACKEND_CONTEXT.md` as the source of truth for backend API expectations (endpoints, payloads, and client behavior).
