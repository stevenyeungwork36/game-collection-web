import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { getDb } from './db/db.js'
import * as imposter from './games/imposter.js'
import * as kittens from './games/kittens.js'
import * as bigtwo from './games/bigtwo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// Logging: request for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const ts = new Date().toISOString()
    console.log(`[${ts}] ${req.method} ${req.path}`)
  }
  next()
})

app.use(cors({ origin: true }))
app.use(express.json())

// Serve frontend build when deployed as single app (after npm run build)
const frontendDist = join(__dirname, '../../frontend/dist')
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
}

// Health check (for Render, load balancers, etc.). Path: GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// One-person test game: ping (for deploy testing)
app.get('/api/games/test/ping', (req, res) => {
  res.json({ ok: true, message: 'pong', timestamp: new Date().toISOString() })
})

// Game-specific routes
app.post('/api/games/sudoku/save', (req, res) => {
  try {
    const db = getDb()
    const { grid, given } = req.body || {}
    if (!Array.isArray(grid) || !Array.isArray(given)) {
      return res.status(400).json({ error: 'Invalid payload' })
    }
    const state = JSON.stringify({ grid, given })
    db.run(
      `INSERT INTO game_saves (game_id, state, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(game_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
      ['sudoku', state]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('[ERROR] POST /api/games/sudoku/save', err)
    res.status(500).json({ error: 'Save failed' })
  }
})

app.get('/api/games/sudoku/load', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT state FROM game_saves WHERE game_id = ?').get('sudoku')
    if (!row) return res.status(404).json({ error: 'No save found' })
    const data = JSON.parse(row.state)
    res.json(data)
  } catch (err) {
    console.error('[ERROR] GET /api/games/sudoku/load', err)
    res.status(500).json({ error: 'Load failed' })
  }
})

// Imposter game
app.post('/api/games/imposter/join', (req, res) => {
  try {
    const { roomId, playerName } = req.body || {}
    if (!roomId || !playerName || String(playerName).trim() === '') {
      return res.status(400).json({ error: 'roomId and playerName required' })
    }
    const result = imposter.joinRoom(String(roomId).trim(), String(playerName).trim())
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/imposter/join', err)
    res.status(500).json({ error: 'Join failed' })
  }
})

app.get('/api/games/imposter/rooms', (req, res) => {
  try {
    const rooms = imposter.listRooms()
    res.json(rooms)
  } catch (err) {
    console.error('[ERROR] GET /api/games/imposter/rooms', err)
    res.status(500).json({ error: 'Failed to list rooms' })
  }
})

app.post('/api/games/imposter/rooms/:roomId/leave', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = imposter.leaveRoom(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/imposter/rooms/:roomId/leave', err)
    res.status(500).json({ error: 'Leave failed' })
  }
})

app.get('/api/games/imposter/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params
    const playerId = req.query.playerId
    if (!playerId) {
      return res.status(400).json({ error: 'playerId query required' })
    }
    const state = imposter.getRoomState(roomId, playerId)
    if (!state) {
      return res.status(404).json({ error: 'Room not found' })
    }
    res.json(state)
  } catch (err) {
    console.error('[ERROR] GET /api/games/imposter/rooms/:roomId', err)
    res.status(500).json({ error: 'Failed to get room' })
  }
})

app.post('/api/games/imposter/rooms/:roomId/vote', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId, votedForPlayerId } = req.body || {}
    if (!playerId || !votedForPlayerId) {
      return res.status(400).json({ error: 'playerId and votedForPlayerId required' })
    }
    const result = imposter.vote(roomId, playerId, votedForPlayerId)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Vote failed' })
  }
})

app.post('/api/games/imposter/rooms/:roomId/ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const setResult = imposter.setReady(roomId, playerId)
    if (setResult.success) return res.json(setResult)
    if (setResult.error === 'Not in waiting') {
      const result = imposter.ready(roomId, playerId)
      if (!result.success) return res.status(400).json({ error: result.error })
      return res.json(result)
    }
    return res.status(400).json({ error: setResult.error })
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Ready failed' })
  }
})

app.post('/api/games/imposter/rooms/:roomId/cancel-ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = imposter.cancelReady(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Cancel ready failed' })
  }
})

// Exploding Kittens game
app.post('/api/games/kittens/join', (req, res) => {
  try {
    const { roomId, playerName } = req.body || {}
    if (!roomId || !playerName || String(playerName).trim() === '') {
      return res.status(400).json({ error: 'roomId and playerName required' })
    }
    const result = kittens.joinRoom(String(roomId).trim(), String(playerName).trim())
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Join failed' })
  }
})

app.get('/api/games/kittens/rooms', (req, res) => {
  try {
    const rooms = kittens.listRooms()
    res.json(rooms)
  } catch (err) {
    console.error('[ERROR] GET /api/games/kittens/rooms', err)
    res.status(500).json({ error: 'Failed to list rooms' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/leave', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.leaveRoom(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/kittens/rooms/:roomId/leave', err)
    res.status(500).json({ error: 'Leave failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.setReady(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/kittens/rooms/:roomId/ready', err)
    res.status(500).json({ error: 'Ready failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/cancel-ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.cancelReady(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/kittens/rooms/:roomId/cancel-ready', err)
    res.status(500).json({ error: 'Cancel ready failed' })
  }
})

app.get('/api/games/kittens/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params
    const playerId = req.query.playerId
    if (!playerId) return res.status(400).json({ error: 'playerId query required' })
    const state = kittens.getRoomState(roomId, playerId)
    if (!state) return res.status(404).json({ error: 'Room not found' })
    res.json(state)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Failed to get room' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/play', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId, cardId, targetPlayerId, pairCardId } = req.body || {}
    if (!playerId || !cardId) return res.status(400).json({ error: 'playerId and cardId required' })
    const result = kittens.playCard(roomId, playerId, cardId, { targetPlayerId, pairCardId })
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Play failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/favor-give', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId, cardId } = req.body || {}
    if (!playerId || !cardId) return res.status(400).json({ error: 'playerId and cardId required' })
    const result = kittens.favorGive(roomId, playerId, cardId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Favor give failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/draw', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.drawCard(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Draw failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.ready(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Ready failed' })
  }
})

app.post('/api/games/kittens/rooms/:roomId/restart', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = kittens.requestRestart(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Restart failed' })
  }
})

// Big Two game
app.post('/api/games/bigtwo/join', (req, res) => {
  try {
    const { roomId, playerName } = req.body || {}
    if (!roomId || !playerName || String(playerName).trim() === '') {
      return res.status(400).json({ error: 'roomId and playerName required' })
    }
    const result = bigtwo.joinRoom(String(roomId).trim(), String(playerName).trim())
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Join failed' })
  }
})

app.get('/api/games/bigtwo/rooms', (req, res) => {
  try {
    const rooms = bigtwo.listRooms()
    res.json(rooms)
  } catch (err) {
    console.error('[ERROR] GET /api/games/bigtwo/rooms', err)
    res.status(500).json({ error: 'Failed to list rooms' })
  }
})

app.post('/api/games/bigtwo/rooms/:roomId/leave', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = bigtwo.leaveRoom(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR] POST /api/games/bigtwo/rooms/:roomId/leave', err)
    res.status(500).json({ error: 'Leave failed' })
  }
})

app.get('/api/games/bigtwo/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params
    const playerId = req.query.playerId
    if (!playerId) return res.status(400).json({ error: 'playerId query required' })
    const state = bigtwo.getRoomState(roomId, playerId)
    if (!state) return res.status(404).json({ error: 'Room not found' })
    res.json(state)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Failed to get room' })
  }
})

app.post('/api/games/bigtwo/rooms/:roomId/play', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId, cardIds } = req.body || {}
    if (!playerId || !Array.isArray(cardIds)) return res.status(400).json({ error: 'playerId and cardIds required' })
    const result = bigtwo.playCards(roomId, playerId, cardIds)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Play failed' })
  }
})

app.post('/api/games/bigtwo/rooms/:roomId/pass', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = bigtwo.pass(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Pass failed' })
  }
})

app.post('/api/games/bigtwo/rooms/:roomId/ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const setResult = bigtwo.setReady(roomId, playerId)
    if (setResult.success) return res.json(setResult)
    if (setResult.error === 'Not in waiting') {
      const result = bigtwo.ready(roomId, playerId)
      if (!result.success) return res.status(400).json({ error: result.error })
      return res.json(result)
    }
    return res.status(400).json({ error: setResult.error })
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Ready failed' })
  }
})

app.post('/api/games/bigtwo/rooms/:roomId/cancel-ready', (req, res) => {
  try {
    const { roomId } = req.params
    const { playerId } = req.body || {}
    if (!playerId) return res.status(400).json({ error: 'playerId required' })
    const result = bigtwo.cancelReady(roomId, playerId)
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (err) {
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'Cancel ready failed' })
  }
})

// SPA fallback when serving frontend from backend (production)
if (existsSync(frontendDist)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(frontendDist, 'index.html'), (err) => {
      if (err) next()
    })
  })
}

app.listen(PORT, () => {
  console.log(`[START] Backend running on port ${PORT} (env PORT=${process.env.PORT || 'none'})`)
  console.log(`[START] Health check: GET /api/health`)
})
