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

Set `VITE_API_BASE_URL` (in `frontend/.env.local` or root `.env`) to point to your backend, for example:

```env
VITE_API_BASE_URL=https://game-collection-backend.sy-dev.workers.dev
```

All game API requests are built from this value via `frontend/src/api.js`.

## Backend integration handoff

Use `FRONTEND_BACKEND_CONTEXT.md` as the source of truth for backend API expectations (endpoints, payloads, and client behavior).
