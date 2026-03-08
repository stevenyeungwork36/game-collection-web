import { DECK_TEMPLATE, getCardInfo, isFoodType } from './kittens-cards.js'

const PLAYER_EMOJIS = ['🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🦊', '🐯']
const MIN_PLAYERS = 2
const COUNTDOWN_SECONDS = 5
const INITIAL_DEFUSE_PER_PLAYER = 1
const INITIAL_OTHER_CARDS = 3
const ROOM_IDLE_MS = 30 * 60 * 1000 // 30 min inactive -> delete room

const rooms = new Map()

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
let playerIdCounter = 1

function generatePlayerId() {
  return `p${playerIdCounter++}`
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(nPlayers) {
  const all = []
  for (const [type, count] of DECK_TEMPLATE) {
    for (let i = 0; i < count; i++) {
      all.push({ type, id: `${type}-${Math.random().toString(36).slice(2, 10)}` })
    }
  }
  const defuses = shuffle(all.filter((c) => c.type === 'defuse'))
  const others = shuffle(all.filter((c) => c.type !== 'defuse'))
  const dealDefuses = defuses.slice(0, Math.min(nPlayers, defuses.length))
  const defusesInDeck = defuses.slice(dealDefuses.length)
  const otherForDeal = others.slice(0, nPlayers * INITIAL_OTHER_CARDS)
  const otherInDeck = others.slice(nPlayers * INITIAL_OTHER_CARDS)
  const deck = shuffle([
    ...defusesInDeck,
    ...otherInDeck,
    ...Array.from({ length: nPlayers - 1 }, () => ({ type: 'exploding_kitten', id: `ek-${Math.random().toString(36).slice(2, 10)}` })),
  ])
  return { deck, dealDefuses, dealOthers: otherForDeal }
}

function startNewRound(room) {
  const players = room.currentRoundPlayers || room.players
  if (!players || players.length < MIN_PLAYERS) return false
  const n = players.length
  const { deck, dealDefuses, dealOthers } = buildDeck(n)
  room.deck = deck
  room.hands = {}
  room.eliminated = new Set()
  room.currentPlayerIndex = 0
  room.drawsRemaining = 1
  room.lastAction = null
  room.winner = null
  room.lastAction = null
  room.playedCardsHistory = []
  room.pendingFavor = null
  room.turnDirection = 1
  room.drawFromBottom = false
  room.state = 'playing'

  for (let i = 0; i < n; i++) {
    const pid = players[i].id
    const hand = []
    if (dealDefuses[i]) hand.push(dealDefuses[i])
    for (let j = 0; j < INITIAL_OTHER_CARDS; j++) {
      const idx = i * INITIAL_OTHER_CARDS + j
      if (dealOthers[idx]) hand.push(dealOthers[idx])
    }
    room.hands[pid] = shuffle(hand)
  }
  return true
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
      readyPlayers: [],
      restartRequested: {},
      deck: [],
      hands: {},
      currentPlayerIndex: 0,
      drawsRemaining: 1,
      eliminated: new Set(),
      lastAction: null,
      winner: null,
      playedCardsHistory: [],
      pendingFavor: null,
      turnDirection: 1,
      drawFromBottom: false,
      lastActivityAt: Date.now(),
    }
    rooms.set(roomId, room)
  }
  touchRoom(room)

  const name = (playerName || '').trim().toLowerCase()
  const existing = room.players.find((p) => p.name.toLowerCase() === name)
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
    if (['countdown', 'playing', 'result'].includes(room.state)) {
      const inRound = room.currentRoundPlayers?.some((p) => p.id === existing.id)
      return {
        success: true,
        playerId: existing.id,
        roomId,
        state: inRound ? room.state : 'waiting_next_round',
        waitingNextRound: !inRound,
        players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
      }
    }
  }

  if (room.players.length >= 8) return { success: false, error: 'Room full' }
  const playerId = generatePlayerId()
  const emoji = PLAYER_EMOJIS[room.players.length % PLAYER_EMOJIS.length]
  room.players.push({ id: playerId, name: (playerName || '').trim() || 'Player', emoji })
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
    if (!startNewRound(room)) room.state = 'waiting'
  }

  const inRound = room.currentRoundPlayers?.some((p) => p.id === playerId)
  if (['playing', 'result'].includes(room.state) && !inRound) {
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
    roundPlayers: (room.currentRoundPlayers || []).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    restartRequested: room.restartRequested || {},
  }

  if (room.state === 'countdown') base.countdownEndTime = room.countdownEndTime

  if (room.state === 'playing' || room.state === 'result') {
    const roundPlayers = room.currentRoundPlayers || []
    base.currentPlayerId = roundPlayers[room.currentPlayerIndex]?.id
    base.eliminated = Array.from(room.eliminated || [])
    base.handCounts = {}
    roundPlayers.forEach((p) => { base.handCounts[p.id] = (room.hands[p.id] || []).length })
    base.myHand = (room.hands[playerId] || []).map((c) => ({ ...c, ...getCardInfo(c.type) }))
    base.drawsRemaining = room.drawsRemaining
    base.lastAction = room.lastAction
    base.playedCardsHistory = room.playedCardsHistory || []
    base.winner = room.winner
    base.turnDirection = room.turnDirection ?? 1
    base.drawFromBottom = room.drawFromBottom === true
    if (room.pendingFavor) {
      if (room.pendingFavor.toPlayerId === playerId) base.pendingFavor = room.pendingFavor
      if (room.pendingFavor.fromPlayerId === playerId) base.pendingFavorWaiting = room.pendingFavor
    }
  }

  if (room.state === 'result') base.readyPlayers = room.readyPlayers || []
  return base
}

function advanceTurn(room) {
  const round = room.currentRoundPlayers
  if (!round || round.length === 0) return
  const dir = room.turnDirection ?? 1
  const len = round.length
  room.currentPlayerIndex = (room.currentPlayerIndex + dir + len) % len
  room.drawsRemaining = 1
  room.lastAction = null
  let next = room.currentPlayerIndex
  let steps = 0
  while (room.eliminated.has(round[next].id) && steps < len) {
    next = (next + dir + len) % len
    steps++
    if (next === room.currentPlayerIndex) break
  }
  room.currentPlayerIndex = next
}

function checkWinner(room) {
  const round = room.currentRoundPlayers
  if (!round) return
  const alive = round.filter((p) => !room.eliminated.has(p.id))
  if (alive.length === 1) {
    room.winner = alive[0].id
    room.state = 'result'
    room.readyPlayers = []
  }
}

function getNextPlayerIndex(room) {
  const round = room.currentRoundPlayers
  if (!round || round.length === 0) return -1
  const dir = room.turnDirection ?? 1
  const len = round.length
  let next = (room.currentPlayerIndex + dir + len) % len
  let steps = 0
  while (room.eliminated.has(round[next].id) && steps < len) {
    next = (next + dir + len) % len
    steps++
  }
  return room.eliminated.has(round[next].id) ? -1 : next
}

export function playCard(roomId, playerId, cardId, options = {}) {
  const { targetPlayerId, pairCardId } = options || {}
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  touchRoom(room)
  if (room.pendingFavor) return { success: false, error: 'Complete the pending Favor first' }
  const round = room.currentRoundPlayers
  const currentId = round[room.currentPlayerIndex]?.id
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  if (room.drawsRemaining <= 0) return { success: false, error: 'Must draw first' }
  if (room.eliminated.has(playerId)) return { success: false, error: 'You are out' }

  const hand = room.hands[playerId] || []
  const idx = hand.findIndex((c) => c.id === cardId)
  if (idx === -1) return { success: false, error: 'Card not in hand' }
  const card = hand[idx]
  if (card.type === 'exploding_kitten') return { success: false, error: 'Cannot play Exploding Kitten' }
  if (card.type === 'defuse') return { success: false, error: 'Defuse is only for when you draw an Exploding Kitten' }

  if (card.type === 'favor') {
    if (!targetPlayerId || targetPlayerId === playerId) return { success: false, error: 'Choose another player' }
    if (room.eliminated.has(targetPlayerId)) return { success: false, error: 'Target is out' }
    const targetHand = room.hands[targetPlayerId] || []
    if (targetHand.length === 0) return { success: false, error: 'Target has no cards' }
  }

  if (isFoodType(card.type)) {
    if (!pairCardId || pairCardId === cardId) return { success: false, error: 'Select a second matching food card' }
    const pairIdx = hand.findIndex((c) => c.id === pairCardId)
    if (pairIdx === -1) return { success: false, error: 'Second card not in hand' }
    const pairCard = hand[pairIdx]
    if (pairCard.type !== card.type) return { success: false, error: 'Cards must be the same food type' }
  }

  const player = round.find((p) => p.id === playerId)
  const info = getCardInfo(card.type)
  const entry = { type: card.type, playerId, playerName: player?.name, emoji: player?.emoji, cardEmoji: info?.emoji }
  room.lastAction = entry
  room.playedCardsHistory = room.playedCardsHistory || []
  room.playedCardsHistory.push(entry)

  if (card.type === 'skip') {
    hand.splice(idx, 1)
    room.drawsRemaining = 0
    advanceTurn(room)
    checkWinner(room)
    return { success: true }
  }
  if (card.type === 'attack') {
    hand.splice(idx, 1)
    advanceTurn(room)
    room.drawsRemaining = 2
    return { success: true }
  }
  if (card.type === 'nope') {
    hand.splice(idx, 1)
    room.lastAction = null
    room.drawsRemaining = 1
    return { success: true }
  }
  if (card.type === 'see_the_future') {
    hand.splice(idx, 1)
    const deck = room.deck
    const top3 = []
    for (let i = 1; i <= 3 && deck.length - i >= 0; i++) {
      top3.push({ ...deck[deck.length - i], ...getCardInfo(deck[deck.length - i].type) })
    }
    return { success: true, seenCards: top3 }
  }
  if (card.type === 'shuffle') {
    hand.splice(idx, 1)
    room.deck = shuffle(room.deck)
    return { success: true }
  }
  if (card.type === 'draw_from_bottom') {
    hand.splice(idx, 1)
    room.drawFromBottom = true
    return { success: true }
  }
  if (card.type === 'reverse') {
    hand.splice(idx, 1)
    room.turnDirection = -(room.turnDirection ?? 1)
    return { success: true }
  }
  if (card.type === 'favor') {
    hand.splice(idx, 1)
    const fromPlayer = round.find((p) => p.id === playerId)
    room.pendingFavor = {
      fromPlayerId: playerId,
      toPlayerId: targetPlayerId,
      fromPlayerName: fromPlayer?.name,
      fromEmoji: fromPlayer?.emoji,
    }
    return { success: true }
  }
  if (isFoodType(card.type)) {
    const pairIdx = hand.findIndex((c) => c.id === pairCardId)
    const [i1, i2] = idx < pairIdx ? [pairIdx, idx] : [idx, pairIdx]
    hand.splice(i1, 1)
    hand.splice(i2, 1)
    const nextIdx = getNextPlayerIndex(room)
    if (nextIdx >= 0) {
      const nextId = round[nextIdx].id
      const nextHand = room.hands[nextId] || []
      if (nextHand.length > 0) {
        const stolenIdx = Math.floor(Math.random() * nextHand.length)
        const stolen = nextHand.splice(stolenIdx, 1)[0]
        room.hands[playerId].push(stolen)
      }
    }
    return { success: true }
  }
  return { success: true }
}

export function favorGive(roomId, playerId, cardId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  touchRoom(room)
  const pending = room.pendingFavor
  if (!pending || pending.toPlayerId !== playerId) return { success: false, error: 'Not your turn to give' }
  const hand = room.hands[playerId] || []
  const idx = hand.findIndex((c) => c.id === cardId)
  if (idx === -1) return { success: false, error: 'Card not in hand' }
  const card = hand.splice(idx, 1)[0]
  room.hands[pending.fromPlayerId] = room.hands[pending.fromPlayerId] || []
  room.hands[pending.fromPlayerId].push(card)
  room.pendingFavor = null
  return { success: true }
}

export function drawCard(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  touchRoom(room)
  if (room.pendingFavor) return { success: false, error: 'Complete the pending Favor first' }
  const round = room.currentRoundPlayers
  const currentId = round[room.currentPlayerIndex]?.id
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  if (room.drawsRemaining <= 0) return { success: false, error: 'No draws left' }
  if (room.eliminated.has(playerId)) return { success: false, error: 'You are out' }

  if (room.deck.length === 0) return { success: false, error: 'Deck empty' }
  const fromBottom = room.drawFromBottom === true
  if (fromBottom) room.drawFromBottom = false
  const drawn = fromBottom ? room.deck.shift() : room.deck.pop()
  room.drawsRemaining--

  if (drawn.type === 'exploding_kitten') {
    const hand = room.hands[playerId] || []
    const defuseIdx = hand.findIndex((c) => c.type === 'defuse')
    if (defuseIdx === -1) {
      room.eliminated.add(playerId)
      advanceTurn(room)
      checkWinner(room)
      return { success: true, drewExploding: true, defused: false }
    }
    hand.splice(defuseIdx, 1)
    const pos = Math.floor(Math.random() * (room.deck.length + 1))
    room.deck.splice(pos, 0, drawn)
    room.lastAction = { type: 'defuse', playerId }
    if (room.drawsRemaining === 0) {
      advanceTurn(room)
      checkWinner(room)
    }
    return { success: true, drewExploding: true, defused: true }
  }

  room.hands[playerId] = room.hands[playerId] || []
  room.hands[playerId].push(drawn)
  if (room.drawsRemaining === 0) {
    advanceTurn(room)
    checkWinner(room)
  }
  return { success: true, drew: drawn.type }
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
  room.deck = []
  room.hands = {}
  room.eliminated = new Set()
  room.winner = null
  room.playedCardsHistory = []
  room.restartRequested = {}
  return { success: true, state: 'countdown', countdownEndTime: room.countdownEndTime }
}

export function requestRestart(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  touchRoom(room)
  if (!room.currentRoundPlayers?.some((p) => p.id === playerId)) return { success: false, error: 'Not in this round' }

  room.restartRequested = room.restartRequested || {}
  room.restartRequested[playerId] = true
  const roundIds = new Set(room.currentRoundPlayers.map((p) => p.id))
  const requested = Object.keys(room.restartRequested).filter((id) => roundIds.has(id))
  if (requested.length < room.currentRoundPlayers.length) {
    return { success: true, restartRequested: room.restartRequested }
  }

  room.state = 'countdown'
  room.countdownEndTime = Date.now() + COUNTDOWN_SECONDS * 1000
  room.readyPlayers = []
  room.currentRoundPlayers = null
  room.deck = []
  room.hands = {}
  room.eliminated = new Set()
  room.winner = null
  room.playedCardsHistory = []
  room.restartRequested = {}
  return { success: true, state: 'countdown', countdownEndTime: room.countdownEndTime }
}
