# Game Collection Frontend

Single deployment target: **Cloudflare Pages** (this app) + **Cloudflare Worker** (API repo). No other hosting config is maintained in-tree.

## Structure

- **frontend/** — React + Vite + Bootstrap; games under `frontend/src/games/<name>/`.
- **functions/** — Pages Functions: `functions/api/[[path]].js` proxies `/api/*` → Worker (`BACKEND_URL`).

## Local development

```bash
npm run install:all
npm run dev
```

- App: `http://localhost:5173`
- Use `frontend/.env.local` with `VITE_API_BASE_URL=` (empty) so `/api` is proxied to the Worker (see `frontend/vite.config.js`).

## Deploy on Cloudflare Pages

1. **Create a Pages project** → Connect this Git repository.
2. **Build settings**
   - Build command: `npm run install:all && npm run build:frontend`
   - Build output directory: `frontend/dist`
3. **Environment variables** (Production; repeat for Preview if needed)

   | Variable | Purpose |
   |----------|---------|
   | `BACKEND_URL` | Worker origin, e.g. `https://game-collection-backend.sy-dev.workers.dev` (no trailing slash) |
   | `VITE_API_BASE_URL` | Empty string, or your Pages URL `https://<project>.pages.dev`, so the client calls same-origin `/api/...` |

4. Save and deploy. After deploy, check `https://<project>.pages.dev/api/health` → `{"ok":true}`.

Optional: `wrangler.toml` at repo root documents `pages_build_output_dir` for Wrangler / dashboard alignment. Rename `name` to match your Pages project if you use CLI.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run install:all` | Install root + frontend dependencies |
| `npm run dev` | Vite dev server |
| `npm run build` / `npm run build:frontend` | Production build → `frontend/dist` |
| `npm run preview` | Preview Vite build locally |

## Direct Worker URL (no Pages proxy)

If you point the browser straight at the Worker (not recommended for all networks):

```env
VITE_API_BASE_URL=https://<your-worker>.<subdomain>.workers.dev
```

## API contract for backend work

See `FRONTEND_BACKEND_CONTEXT.md` for routes, payloads, and client behavior.
