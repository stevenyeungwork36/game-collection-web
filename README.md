# Game Collection Web

A full-stack game collection site with a card-style game selector, per-game folders, and a lightweight backend with SQLite.

## Structure

- **frontend/** — React + Vite + Bootstrap. Home page shows game cards; each game lives in `frontend/src/games/<game-name>/`.
- **backend/** — Express server with REST API, WebSocket support for real-time, and SQLite for simple persistent data (saves, scores).
- **Database** — SQLite in `backend/data/` (single file, no separate DB server; suitable for single-repo deploy).

## Quick start

```bash
npm run install:all
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001  

## Scripts

| Command | Description |
|--------|-------------|
| `npm run install:all` | Install root, frontend, and backend deps |
| `npm run dev` | Run frontend + backend in development |
| `npm run dev:frontend` | Run only frontend (Vite) |
| `npm run dev:backend` | Run only backend (Express) |
| `npm run build` | Build frontend and backend |
| `npm start` | Run production backend (serve frontend build if configured) |

## Adding a new game

1. Create `frontend/src/games/<game-name>/` with your game components and a `config.js` (title, description, path, icon).
2. Register the game in `frontend/src/games/gameRegistry.js`.
3. Optionally add backend routes and DB tables in `backend/` for saves/scores.

## Environment variables

Copy `.env.template` to `.env` and set values as needed. See `.env.template` for all supported variables (e.g. `PORT`, `NODE_ENV`, `VITE_API_BASE_URL` for frontend when deployed separately). Do not commit `.env`.

## Health check

The backend exposes **GET /api/health**, which returns `{ "ok": true }`. Use this path for Render (or similar) health checks.

## Tech stack

- **Frontend:** React 18, Vite, React Router, Bootstrap 5  
- **Backend:** Node.js, Express, CORS, optional WebSocket  
- **DB:** SQLite (better-sqlite3) in `backend/data/`
