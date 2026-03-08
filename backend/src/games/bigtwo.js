/**
 * Big Two (鋤大弟) - Climbing card game
 * 3–4 players, 52 cards. 3 players: 17 each (1 left out); 4 players: 13 each.
 * Rank: 3 low .. 2 high. Suit (for tie-break): ♦ < ♣ < ♥ < ♠
 * First to play: player with 3♦. Combos: single, pair, triple, 5-card (straight, flush, full house, four of a kind, straight flush).
 */

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const SUITS = ['D', 'C', 'H', 'S'] // Diamonds, Clubs, Hearts, Spades (low to high)
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i]))
const SUIT_VALUE = Object.fromEntries(SUITS.map((s, i) => [s, i]))

const PLAYER_EMOJIS = ['🐱', '🐶', '🐰', '🐻']
const MIN_PLAYERS = 3
const MAX_PLAYERS = 4
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

const rooms = new Map()
let playerIdCounter = 1

function generatePlayerId() {
  return `p${playerIdCounter++}`
}

function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}` })
    }
  }
  return deck
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const r = RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
    if (r !== 0) return r
    return SUIT_VALUE[a.suit] - SUIT_VALUE[b.suit]
  })
}

function getComboType(cards) {
  const n = cards.length
  const sorted = sortCards(cards)
  if (n === 1) return { type: 'single', value: sorted[0], rank: 0 }
  if (n === 2) {
    if (sorted[0].rank !== sorted[1].rank) return null
    return { type: 'pair', value: sorted[1], rank: 1 }
  }
  if (n === 3) {
    if (!sorted.every((c) => c.rank === sorted[0].rank)) return null
    return { type: 'triple', value: sorted[2], rank: 2 }
  }
  if (n === 5) {
    const ranks = sorted.map((c) => RANK_VALUE[c.rank])
    const suits = sorted.map((c) => c.suit)
    const sameSuit = suits.every((s) => s === suits[0])
    const rankSet = new Set(ranks)
    const isStraight = (() => {
      const min = Math.min(...ranks)
      const want = [min, min + 1, min + 2, min + 3, min + 4]
      return want.every((r) => rankSet.has(r)) || (rankSet.has(12) && rankSet.has(0) && rankSet.has(1) && rankSet.has(2) && rankSet.has(3)) // A-2-3-4-5
    })()
    if (sameSuit && isStraight) return { type: 'straight_flush', value: sorted[4], rank: 7 }
    if (rankSet.size === 2) {
      const counts = Object.values(sorted.reduce((acc, c) => { acc[c.rank] = (acc[c.rank] || 0) + 1; return acc }, {}))
      if (counts.some((x) => x === 4)) return { type: 'four_of_a_kind', value: sorted[4], rank: 6 }
      if (counts.some((x) => x === 3)) return { type: 'full_house', value: sorted[4], rank: 5 }
      return null
    }
    if (sameSuit) return { type: 'flush', value: sorted[4], rank: 4 }
    if (isStraight) return { type: 'straight', value: sorted[4], rank: 3 }
    return null
  }
  return null
}

function compareCombos(comboA, comboB) {
  if (!comboA || !comboB) return 0
  if (comboA.type !== comboB.type) return comboA.rank - comboB.rank
  const va = comboA.value
  const vb = comboB.value
  const r = RANK_VALUE[va.rank] - RANK_VALUE[vb.rank]
  if (r !== 0) return r
  return SUIT_VALUE[va.suit] - SUIT_VALUE[vb.suit]
}

function findPlayerWithThreeD(hands, playerIds) {
  for (let i = 0; i < playerIds.length; i++) {
    const hand = hands[playerIds[i]] || []
    if (hand.some((c) => c.suit === 'D' && c.rank === '3')) return i
  }
  return 0
}

export function joinRoom(roomId, playerName) {
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      roomId,
      players: [],
      currentRoundPlayers: null,
      state: 'waiting',
      countdownEndTime: null,
      deck: [],
      hands: {},
      currentPlayerIndex: 0,
      table: null,
      tablePlayerId: null,
      passCount: 0,
      winner: null,
      lastActivityAt: Date.now(),
    }
    rooms.set(roomId, room)
  }
  touchRoom(room)

  const name = (playerName || '').trim()
  if (!name) return { success: false, error: 'Name required' }
  if (room.players.length >= MAX_PLAYERS) return { success: false, error: 'Room full' }
  const existing = room.players.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    return {
      success: true,
      playerId: existing.id,
      roomId,
      state: room.state,
      players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
      playersNeeded: MIN_PLAYERS - room.players.length,
    }
  }

  const playerId = generatePlayerId()
  const emoji = PLAYER_EMOJIS[room.players.length % PLAYER_EMOJIS.length]
  room.players.push({ id: playerId, name, emoji })

  return {
    success: true,
    playerId,
    roomId,
    state: room.state,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    playersNeeded: MIN_PLAYERS - room.players.length,
  }
}

export function getRoomState(roomId, playerId) {
  cleanupInactiveRooms()
  const room = rooms.get(roomId)
  if (!room) return null
  touchRoom(room)

  if (room.state === 'waiting' && room.players.length >= MIN_PLAYERS) {
    room.state = 'countdown'
    room.countdownEndTime = Date.now() + COUNTDOWN_SECONDS * 1000
  }

  if (room.state === 'countdown' && Date.now() >= room.countdownEndTime) {
    room.currentRoundPlayers = [...room.players]
    startNewRound(room)
  }

  const base = {
    roomId,
    state: room.state,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    playersNeeded: room.state === 'waiting' ? MIN_PLAYERS - room.players.length : 0,
  }

  if (room.state === 'countdown') {
    base.countdownEndTime = room.countdownEndTime
  }

  if (room.state === 'playing' || room.state === 'result') {
    const round = room.currentRoundPlayers || []
    base.currentPlayerId = round[room.currentPlayerIndex]?.id
    base.myHand = sortCards(room.hands[playerId] || [])
    base.handCounts = {}
    round.forEach((p) => { base.handCounts[p.id] = (room.hands[p.id] || []).length })
    base.table = room.table
    base.tablePlayerId = room.tablePlayerId
    base.tableComboType = room.tableComboType || null
    base.winner = room.winner
  }

  if (room.state === 'result') {
    base.readyPlayers = room.readyPlayers || []
  }

  return base
}

function startNewRound(room) {
  const players = room.currentRoundPlayers || room.players
  const n = players?.length || 0
  if (!players || n < MIN_PLAYERS || n > MAX_PLAYERS) {
    room.state = 'waiting'
    return
  }
  const deck = shuffle(buildDeck())
  room.deck = deck
  room.hands = {}
  const playerIds = players.map((p) => p.id)
  const cardsPerPlayer = Math.floor(52 / n)
  for (let i = 0; i < n; i++) {
    room.hands[playerIds[i]] = sortCards(deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer))
  }
  room.table = null
  room.tablePlayerId = null
  room.tableComboType = null
  room.passCount = 0
  room.winner = null
  room.currentPlayerIndex = findPlayerWithThreeD(room.hands, playerIds)
  room.state = 'playing'
}

export function playCards(roomId, playerId, cardIds) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  touchRoom(room)
  const round = room.currentRoundPlayers || []
  const currentId = round[room.currentPlayerIndex]?.id
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }

  const hand = room.hands[playerId] || []
  if (!Array.isArray(cardIds) || cardIds.length === 0) return { success: false, error: 'Select cards' }

  const selected = cardIds.map((id) => hand.find((c) => c.id === id)).filter(Boolean)
  if (selected.length !== cardIds.length) return { success: false, error: 'Invalid cards' }

  const combo = getComboType(selected)
  if (!combo) return { success: false, error: 'Invalid combination' }

  const table = room.table
  const tableCombo = room.tableComboType
  const mustLead = !table || room.passCount >= 3
  if (!mustLead && compareCombos(combo, tableCombo) <= 0) return { success: false, error: 'Must beat table' }

  selected.forEach((c) => {
    const idx = hand.findIndex((x) => x.id === c.id)
    if (idx !== -1) hand.splice(idx, 1)
  })
  room.hands[playerId] = hand

  room.table = selected
  room.tablePlayerId = playerId
  room.tableComboType = combo
  room.passCount = 0
  room.lastPlayedPlayerIndex = room.currentPlayerIndex

  if (hand.length === 0) {
    room.winner = playerId
    room.state = 'result'
    room.readyPlayers = []
    return { success: true, won: true }
  }

  const roundLen = room.currentRoundPlayers?.length || MIN_PLAYERS
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % roundLen
  return { success: true }
}

export function pass(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  touchRoom(room)
  const round = room.currentRoundPlayers || []
  const currentId = round[room.currentPlayerIndex]?.id
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  if (!room.table || room.table.length === 0) return { success: false, error: 'You must lead' }

  room.passCount++
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % round.length

  const roundLen = round.length
  if (room.passCount >= roundLen - 1) {
    room.table = null
    room.tablePlayerId = null
    room.tableComboType = null
    room.passCount = 0
    if (room.lastPlayedPlayerIndex != null) {
      room.currentPlayerIndex = room.lastPlayedPlayerIndex
    }
  }
  return { success: true }
}

export function ready(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  touchRoom(room)
  if (room.state !== 'result') return { success: false, error: 'Not in result phase' }
  if (!room.currentRoundPlayers?.some((p) => p.id === playerId)) return { success: false, error: 'Not in round' }
  if (room.readyPlayers.includes(playerId)) return { success: true, state: 'result', readyPlayers: room.readyPlayers }

  room.readyPlayers.push(playerId)
  if (room.readyPlayers.length < room.currentRoundPlayers.length) {
    return { success: true, state: 'result', readyPlayers: room.readyPlayers }
  }

  room.state = 'countdown'
  room.countdownEndTime = Date.now() + COUNTDOWN_SECONDS * 1000
  room.readyPlayers = []
  room.currentRoundPlayers = null
  room.deck = []
  room.hands = {}
  room.winner = null
  return { success: true, state: 'countdown', countdownEndTime: room.countdownEndTime }
}
