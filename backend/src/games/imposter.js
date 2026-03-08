import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORDS_PATH = join(__dirname, '../../data/imposter-words.json')

const PLAYER_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮']

const MIN_PLAYERS = 3
const WORD_PHASE_SECONDS = 10
const COUNTDOWN_SECONDS = 5
const ROOM_IDLE_MS = 30 * 60 * 1000 // 30 min inactive -> delete room

function touchRoom(room) {
  room.lastActivityAt = Date.now()
}

function cleanupInactiveRooms() {
  const now = Date.now()
  for (const [id, room] of rooms.entries()) {
    if ((now - (room.lastActivityAt || 0)) > ROOM_IDLE_MS) {
      rooms.delete(id)
    }
  }
}

function loadWords() {
  if (!existsSync(WORDS_PATH)) return { pairs: [] }
  try {
    return JSON.parse(readFileSync(WORDS_PATH, 'utf8'))
  } catch {
    return { pairs: [] }
  }
}

const rooms = new Map()
let playerIdCounter = 1

function generatePlayerId() {
  return `p${playerIdCounter++}`
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return undefined
  const i = crypto.randomInt(0, arr.length)
  return arr[i]
}

function startNewRound(room, words) {
  const pairs = words.pairs || []
  if (pairs.length === 0) return false
  room.currentRoundPlayers = [...room.players]
  if (room.currentRoundPlayers.length < MIN_PLAYERS) return false
  const pair = pickRandom(pairs)
  room.normalWord = pair.normal
  room.imposterWord = pair.imposter
  room.imposterPlayerId = pickRandom(room.currentRoundPlayers).id
  room.wordPhaseEndTime = Date.now() + WORD_PHASE_SECONDS * 1000
  room.votes = {}
  room.votedOutPlayerId = null
  room.result = null
  room.readyPlayers = []
  return true
}

export function joinRoom(roomId, playerName) {
  const words = loadWords()
  const pairs = words.pairs || []
  if (pairs.length === 0) {
    return { success: false, error: 'Word list not configured. Add pairs to backend/data/imposter-words.json' }
  }

  let room = rooms.get(roomId)
  if (!room) {
    room = {
      roomId,
      players: [],
      currentRoundPlayers: null,
      state: 'waiting',
      countdownEndTime: null,
      imposterPlayerId: null,
      normalWord: null,
      imposterWord: null,
      wordPhaseEndTime: null,
      votes: {},
      votedOutPlayerId: null,
      result: null,
      readyPlayers: [],
      winnerCounts: {},
      lastActivityAt: Date.now(),
    }
    rooms.set(roomId, room)
  }
  touchRoom(room)

  const existing = room.players.find((p) => p.name.toLowerCase() === playerName.trim().toLowerCase())
  if (existing) {
    if (room.state === 'waiting') {
      return {
        success: true,
        playerId: existing.id,
        roomId,
        state: room.state,
        players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
        playersNeeded: MIN_PLAYERS - room.players.length,
      }
    }
    if (room.state === 'countdown' || room.state === 'word' || room.state === 'voting' || room.state === 'result') {
      const inRound = room.currentRoundPlayers?.some((p) => p.id === existing.id)
      return {
        success: true,
        playerId: existing.id,
        roomId,
        state: inRound ? room.state : 'waiting_next_round',
        waitingNextRound: !inRound,
        players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
        countdownEndTime: room.state === 'countdown' ? room.countdownEndTime : undefined,
      }
    }
  }

  if (room.state === 'waiting') {
    const usedEmojis = new Set(room.players.map((p) => p.emoji))
    const availableEmojis = PLAYER_EMOJIS.filter((e) => !usedEmojis.has(e))
    const emoji = availableEmojis.length > 0 ? pickRandom(availableEmojis) : PLAYER_EMOJIS[room.players.length % PLAYER_EMOJIS.length]
    const id = generatePlayerId()
    room.players.push({ id, name: playerName.trim(), emoji })

    return {
      success: true,
      playerId: id,
      roomId,
      state: room.state,
      players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
      playersNeeded: MIN_PLAYERS - room.players.length,
      readyPlayers: room.readyPlayers || [],
    }
  }

  if (room.state === 'countdown' || room.state === 'word' || room.state === 'voting' || room.state === 'result') {
    const usedEmojis = new Set(room.players.map((p) => p.emoji))
    const availableEmojis = PLAYER_EMOJIS.filter((e) => !usedEmojis.has(e))
    const emoji = availableEmojis.length > 0 ? pickRandom(availableEmojis) : PLAYER_EMOJIS[room.players.length % PLAYER_EMOJIS.length]
    const id = generatePlayerId()
    room.players.push({ id, name: playerName.trim(), emoji })
    return {
      success: true,
      playerId: id,
      roomId,
      state: 'waiting_next_round',
      waitingNextRound: true,
      players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    }
  }

  return { success: false, error: 'Cannot join' }
}

export function getRoomState(roomId, playerId) {
  cleanupInactiveRooms()
  const room = rooms.get(roomId)
  if (!room) return null
  touchRoom(room)

  if (room.state === 'waiting') {
    room.readyPlayers = room.readyPlayers || []
    const allReady = room.readyPlayers.length === room.players.length && room.players.length >= MIN_PLAYERS
    if (allReady) {
      room.state = 'countdown'
      room.countdownEndTime = Date.now() + COUNTDOWN_SECONDS * 1000
      room.readyPlayers = []
    }
  }

  if (room.state === 'countdown' && Date.now() >= room.countdownEndTime) {
    room.state = 'word'
    const words = loadWords()
    if (!startNewRound(room, words)) room.state = 'waiting'
  }

  if (room.state === 'word' && Date.now() >= room.wordPhaseEndTime) {
    room.state = 'voting'
  }

  const inRound = room.currentRoundPlayers?.some((p) => p.id === playerId)
  if ((room.state === 'word' || room.state === 'voting' || room.state === 'result') && !inRound) {
    return {
      roomId,
      state: 'waiting_next_round',
      players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    }
  }

  const base = {
    roomId,
    state: room.state,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    playersNeeded: room.state === 'waiting' ? MIN_PLAYERS - room.players.length : 0,
    readyPlayers: room.state === 'waiting' ? (room.readyPlayers || []) : [],
    roundPlayers: room.currentRoundPlayers?.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })) || [],
    winnerCounts: room.winnerCounts || {},
  }

  if (room.state === 'countdown') {
    base.countdownEndTime = room.countdownEndTime
  }

  if (room.state === 'word') {
    base.wordPhaseEndTime = room.wordPhaseEndTime
    base.myWord = room.imposterPlayerId === playerId ? room.imposterWord : room.normalWord
    base.isImposter = room.imposterPlayerId === playerId
  }

  if (room.state === 'voting') {
    base.votes = room.votes
    base.hasVoted = playerId in room.votes
  }

  if (room.state === 'result') {
    base.result = room.result
    base.votedOutPlayerId = room.votedOutPlayerId
    base.imposterPlayerId = room.imposterPlayerId
    base.isImposter = room.imposterPlayerId === playerId
    base.readyPlayers = room.readyPlayers || []
  }

  return base
}

export function setReady(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (room.state !== 'waiting') return { success: false, error: 'Not in waiting' }
  if (!room.players.some((p) => p.id === playerId)) return { success: false, error: 'Not in room' }
  touchRoom(room)
  room.readyPlayers = room.readyPlayers || []
  if (!room.readyPlayers.includes(playerId)) room.readyPlayers.push(playerId)
  return { success: true, readyPlayers: room.readyPlayers }
}

export function cancelReady(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (room.state !== 'waiting') return { success: false, error: 'Not in waiting' }
  if (!room.players.some((p) => p.id === playerId)) return { success: false, error: 'Not in room' }
  touchRoom(room)
  room.readyPlayers = room.readyPlayers || []
  room.readyPlayers = room.readyPlayers.filter((id) => id !== playerId)
  return { success: true, readyPlayers: room.readyPlayers }
}

export function ready(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  touchRoom(room)
  if (room.state !== 'result') return { success: false, error: 'Not in result phase' }
  if (!room.currentRoundPlayers?.some((p) => p.id === playerId)) return { success: false, error: 'Not in this round' }
  if (room.readyPlayers.includes(playerId)) return { success: true, state: 'result', readyPlayers: room.readyPlayers }

  room.readyPlayers.push(playerId)

  if (room.readyPlayers.length < room.currentRoundPlayers.length) {
    return { success: true, state: 'result', readyPlayers: room.readyPlayers }
  }

  room.state = 'countdown'
  room.countdownEndTime = Date.now() + COUNTDOWN_SECONDS * 1000
  room.readyPlayers = []
  room.currentRoundPlayers = null
  room.imposterPlayerId = null
  room.normalWord = null
  room.imposterWord = null
  room.wordPhaseEndTime = null
  room.votes = {}
  room.votedOutPlayerId = null
  room.result = null

  return {
    success: true,
    state: 'countdown',
    countdownEndTime: room.countdownEndTime,
  }
}

export function vote(roomId, playerId, votedForPlayerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  touchRoom(room)
  if (room.state !== 'voting') return { success: false, error: 'Not in voting phase' }
  if (room.votes[playerId] !== undefined) return { success: false, error: 'Already voted' }
  const target = room.currentRoundPlayers?.find((p) => p.id === votedForPlayerId)
  if (!target) return { success: false, error: 'Invalid player' }

  room.votes[playerId] = votedForPlayerId

  if (Object.keys(room.votes).length < room.currentRoundPlayers.length) {
    return { success: true, state: 'voting', waiting: true }
  }

  const tally = {}
  for (const pid of Object.values(room.votes)) {
    tally[pid] = (tally[pid] || 0) + 1
  }
  let maxVotes = 0
  let votedOut = null
  for (const [pid, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count
      votedOut = pid
    }
  }
  room.votedOutPlayerId = votedOut
  room.result = votedOut === room.imposterPlayerId ? 'crew_win' : 'imposter_win'
  room.state = 'result'
  room.readyPlayers = []
  room.winnerCounts = room.winnerCounts || {}
  if (room.result === 'crew_win') {
    room.currentRoundPlayers.forEach((p) => {
      if (p.id !== room.imposterPlayerId) room.winnerCounts[p.id] = (room.winnerCounts[p.id] || 0) + 1
    })
  } else {
    room.winnerCounts[room.imposterPlayerId] = (room.winnerCounts[room.imposterPlayerId] || 0) + 1
  }

  return {
    success: true,
    state: 'result',
    result: room.result,
    votedOutPlayerId: room.votedOutPlayerId,
    imposterPlayerId: room.imposterPlayerId,
  }
}

export function listRooms() {
  cleanupInactiveRooms()
  return [...rooms.entries()].map(([roomId, r]) => ({
    roomId,
    playerCount: r.players?.length ?? 0,
    state: r.state ?? 'waiting',
    minPlayers: MIN_PLAYERS,
    hasPassword: false,
  }))
}

export function leaveRoom(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  room.players = (room.players || []).filter((p) => p.id !== playerId)
  if (room.players.length === 0) {
    rooms.delete(roomId)
    return { success: true }
  }
  // Someone left: reset room to waiting so everyone else returns to ready/lobby
  if (room.state !== 'waiting') {
    room.state = 'waiting'
    room.currentRoundPlayers = null
    room.countdownEndTime = null
    room.imposterPlayerId = null
    room.normalWord = null
    room.imposterWord = null
    room.wordPhaseEndTime = null
    room.votes = {}
    room.votedOutPlayerId = null
    room.result = null
    room.readyPlayers = []
  }
  return { success: true }
}
