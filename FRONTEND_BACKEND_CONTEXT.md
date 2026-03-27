# Frontend Backend Context (Handoff)

This document is meant to be copied into the backend repository so backend-focused agents understand how this frontend calls the API.

## Frontend stack and runtime assumptions

- Framework: React + Vite.
- API helper file: `frontend/src/api.js`.
- All calls use `apiUrl(path)`, where:
  - `API_BASE = import.meta.env.VITE_API_BASE_URL || ''`
  - Final URL is `${API_BASE}${path}`.
- If `VITE_API_BASE_URL` is unset, frontend assumes same-origin `/api/...`.
- Connection test page uses direct `fetch(apiUrl('/api/games/test/ping'))`.

## Global API expectations

- JSON responses for success and errors.
- Typical error body shape used by UI: `{ "error": "message" }`.
- Many pages poll room state repeatedly (`GET .../rooms/:roomId?playerId=...`) and depend on stable shape.
- CORS must allow browser frontend origin.

## Health/test endpoints used by frontend

- `GET /api/health` -> `{ ok: true }` (ops/verification).
- `GET /api/games/test/ping` -> `{ ok: true, message: "pong", timestamp: ISOString }`.

## Sudoku endpoints (used by `frontend/src/games/sudoku/SudokuGame.jsx`)

- `POST /api/games/sudoku/save`
  - body: `{ grid: number[9][9], given: boolean[9][9] }`
  - success: `{ ok: true }`
- `GET /api/games/sudoku/load`
  - success: `{ grid, given }`
  - not found currently tolerated by UI (simply no load).

## Imposter game endpoints

- `POST /api/games/imposter/join` `{ roomId, playerName }`
- `GET /api/games/imposter/rooms`
- `POST /api/games/imposter/rooms/:roomId/leave` `{ playerId }`
- `GET /api/games/imposter/rooms/:roomId?playerId=...`
- `POST /api/games/imposter/rooms/:roomId/vote` `{ playerId, votedForPlayerId }`
- `POST /api/games/imposter/rooms/:roomId/ready` `{ playerId }`
- `POST /api/games/imposter/rooms/:roomId/cancel-ready` `{ playerId }`

Client state fields commonly consumed include:
- `state`, `players`, `playersNeeded`, `readyPlayers`
- round-related: `countdownEndTime`, `wordPhaseEndTime`, `myWord`, `isImposter`, `votes`, `hasVoted`
- result-related: `result`, `votedOutPlayerId`, `imposterPlayerId`, `winnerCounts`

## Kittens game endpoints

- `POST /api/games/kittens/join` `{ roomId, playerName }`
- `GET /api/games/kittens/rooms`
- `POST /api/games/kittens/rooms/:roomId/leave` `{ playerId }`
- `GET /api/games/kittens/rooms/:roomId?playerId=...`
- `POST /api/games/kittens/rooms/:roomId/ready` `{ playerId }`
- `POST /api/games/kittens/rooms/:roomId/cancel-ready` `{ playerId }`
- `POST /api/games/kittens/rooms/:roomId/restart` `{ playerId }`
- `POST /api/games/kittens/rooms/:roomId/draw` `{ playerId }`
- `POST /api/games/kittens/rooms/:roomId/play` `{ playerId, cardId, targetPlayerId?, pairCardId? }`
- `POST /api/games/kittens/rooms/:roomId/favor-give` `{ playerId, cardId }`

Client state fields commonly consumed include:
- `state`, `players`, `playersNeeded`, `readyPlayers`, `roundPlayers`
- playing: `currentPlayerId`, `myHand`, `handCounts`, `drawsRemaining`, `lastAction`, `playedCardsHistory`, `pendingFavor`, `pendingFavorWaiting`, `turnDirection`, `drawFromBottom`, `lastExplosion`
- result: `winner`, `winnerCounts`, `restartRequested`

## Big Two endpoints

- `POST /api/games/bigtwo/join` `{ roomId, playerName }`
- `GET /api/games/bigtwo/rooms`
- `POST /api/games/bigtwo/rooms/:roomId/leave` `{ playerId }`
- `GET /api/games/bigtwo/rooms/:roomId?playerId=...`
- `POST /api/games/bigtwo/rooms/:roomId/play` `{ playerId, cardIds }`
- `POST /api/games/bigtwo/rooms/:roomId/pass` `{ playerId }`
- `POST /api/games/bigtwo/rooms/:roomId/ready` `{ playerId }`
- `POST /api/games/bigtwo/rooms/:roomId/cancel-ready` `{ playerId }`

Client state fields commonly consumed include:
- `state`, `players`, `playersNeeded`, `readyPlayers`
- `myHand`, `handCounts`, `currentPlayerId`, `table`, `tablePlayerId`, `tableComboType`
- `playedCardsHistory`, `winner`, `winnerCounts`

## Texas Hold'em endpoints

- `POST /api/games/texas/join` `{ roomId, playerName }`
- `GET /api/games/texas/rooms`
- `POST /api/games/texas/rooms/:roomId/leave` `{ playerId }`
- `GET /api/games/texas/rooms/:roomId?playerId=...`
- `POST /api/games/texas/rooms/:roomId/add-bot` `{ playerId }`
- `POST /api/games/texas/rooms/:roomId/remove-bot` `{ playerId, botId }`
- `POST /api/games/texas/rooms/:roomId/start` `{ playerId }`
- `POST /api/games/texas/rooms/:roomId/fold` `{ playerId }`
- `POST /api/games/texas/rooms/:roomId/check` `{ playerId }`
- `POST /api/games/texas/rooms/:roomId/call` `{ playerId }`
- `POST /api/games/texas/rooms/:roomId/raise` `{ playerId, amount }`
- `POST /api/games/texas/rooms/:roomId/ready-next` `{ playerId }`

Client state fields commonly consumed include:
- lobby: `players`, `seatOrder`, `chips`, `bustCount`, `tableSize`, `leaderboard`
- playing: `communityCards`, `pot`, `roundBet`, `currentPlayerId`, `phase`, `folded`, `currentBet`, `myHoleCards`, `holeCardsRevealed`, `dealerIndex`
- between rounds: `readyPlayers`, `winnerThisRound`

## Frontend resilience behavior

- Some pages use direct `fetch`; others use `apiFetch` helper.
- `apiFetch` parses text then JSON; if parse fails, UI still handles gracefully.
- UI usually surfaces `error` from JSON or falls back to `HTTP <status>`.

## Minimum compatibility checklist for backend

- Support all routes above with JSON request/response.
- Keep response field names stable for room state payloads.
- Ensure CORS works with local dev origin (`http://localhost:5173`) and deployed frontend origin.
- Keep `/api/games/test/ping` simple and fast for diagnostics.
