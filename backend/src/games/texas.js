/**
 * Texas Hold'em Poker
 * Min 1 human, max TABLE_SIZE (9). Bots fill empty seats. 1000 chips per player; rebuy 1000 when chips <= 0 next round.
 * Leaderboard: current chips - (bustCount * 50).
 */

import crypto from 'crypto'
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUITS = ['D', 'C', 'H', 'S']
const RANK_NUM = Object.fromEntries(RANKS.map((r, i) => [r, i]))
const TABLE_SIZE = 9
const MIN_PLAYERS = 1
const START_CHIPS = 1000
const SMALL_BLIND = 10
const BIG_BLIND = 20
const BOT_NAMES = ['Bot Alex', 'Bot Sam', 'Bot Jordan', 'Bot Casey', 'Bot Riley', 'Bot Morgan', 'Bot Quinn', 'Bot Avery']
const ROOM_IDLE_MS = 45 * 60 * 1000
const BUST_PENALTY = 50

const rooms = new Map()
let playerIdCounter = 1
let botIdCounter = 1

function secureRandomInt(max) {
  if (max <= 0) return 0
  return crypto.randomInt(0, max)
}

function generatePlayerId() {
  return `p${playerIdCounter++}`
}

function generateBotId() {
  return `bot-${botIdCounter++}`
}

function touchRoom(room) {
  room.lastActivityAt = Date.now()
}

function cleanupInactiveRooms() {
  const now = Date.now()
  for (const [id, room] of rooms.entries()) {
    if ((now - (room.lastActivityAt || 0)) > ROOM_IDLE_MS) rooms.delete(id)
  }
}

function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}-${secureRandomInt(1e9)}` })
    }
  }
  return shuffle(deck)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function rankValue(card) {
  return RANK_NUM[card.rank] ?? -1
}

// Best 5-card hand from up to 7 cards. Returns { rank, values } for comparison.
function evaluateHand(cards) {
  if (!cards || cards.length < 5) return { rank: -1, values: [] }
  const all = cards.length === 5 ? cards : chooseBest5(cards)
  const r = getHandRank(all)
  return r
}

function chooseBest5(cards) {
  if (cards.length === 5) return cards
  if (cards.length < 5) return []
  let best = null
  const indices = [...Array(cards.length).keys()]
  const combos = combinations(indices, 5)
  for (const combo of combos) {
    const five = combo.map((i) => cards[i])
    const r = getHandRank(five)
    if (!best || compareHandRanks(r, best) > 0) best = r
  }
  return best ? best.cards : []
}

function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const out = []
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = combinations(arr.slice(i + 1), k - 1)
    for (const c of rest) out.push([arr[i], ...c])
  }
  return out
}

function getHandRank(five) {
  const sorted = [...five].sort((a, b) => rankValue(b) - rankValue(a))
  const ranks = sorted.map((c) => rankValue(c))
  const suits = sorted.map((c) => c.suit)
  const sameSuit = suits.every((s) => s === suits[0])
  const rankCounts = {}
  ranks.forEach((r) => { rankCounts[r] = (rankCounts[r] || 0) + 1 })
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  const sortedRanks = [...new Set(ranks)].sort((a, b) => b - a)

  const isStraight = (() => {
    const uniq = [...new Set(ranks)].sort((a, b) => a - b)
    if (uniq.length !== 5) return false
    if (uniq[4] - uniq[0] === 4) return true
    if (uniq.includes(12) && uniq.includes(0) && uniq.includes(1) && uniq.includes(2) && uniq.includes(3)) return true
    return false
  })()

  const straightHigh = (() => {
    const uniq = [...new Set(ranks)].sort((a, b) => a - b)
    if (uniq[4] - uniq[0] === 4) return uniq[4]
    if (uniq.includes(12) && uniq.includes(0) && uniq.includes(1)) return 3
    return -1
  })()

  if (sameSuit && isStraight) return { rank: 8, values: [straightHigh], cards: sorted }
  if (counts[0] === 4) return { rank: 7, values: [findRankWithCount(rankCounts, 4), findRankWithCount(rankCounts, 1)], cards: sorted }
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, values: [findRankWithCount(rankCounts, 3), findRankWithCount(rankCounts, 2)], cards: sorted }
  if (sameSuit) return { rank: 5, values: ranks, cards: sorted }
  if (isStraight) return { rank: 4, values: [straightHigh], cards: sorted }
  if (counts[0] === 3) return { rank: 3, values: [findRankWithCount(rankCounts, 3), ...sortedRanks.filter((r) => r !== findRankWithCount(rankCounts, 3))], cards: sorted }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = sortedRanks.filter((r) => rankCounts[r] === 2).sort((a, b) => b - a)
    const kicker = sortedRanks.find((r) => rankCounts[r] === 1)
    return { rank: 2, values: [...pairs, kicker], cards: sorted }
  }
  if (counts[0] === 2) return { rank: 1, values: [findRankWithCount(rankCounts, 2), ...sortedRanks.filter((r) => r !== findRankWithCount(rankCounts, 2))], cards: sorted }
  return { rank: 0, values: ranks, cards: sorted }
}

function findRankWithCount(rankCounts, n) {
  for (const [r, c] of Object.entries(rankCounts)) if (c === n) return parseInt(r, 10)
  return -1
}

function compareHandRanks(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    const va = a.values[i] ?? 0
    const vb = b.values[i] ?? 0
    if (va !== vb) return va - vb
  }
  return 0
}

function getActivePlayers(room) {
  return room.seatOrder.filter((id) => !room.folded.has(id) && (room.chips[id] || 0) > 0)
}

function nextPhase(room) {
  if (room.phase === 'preflop') {
    room.phase = 'flop'
    room.communityCards.push(...room.deck.splice(0, 3))
    room.roundBet = 0
    room.currentBet = {}
    room.lastAggressorIndex = null
    room.currentPlayerIndex = (room.dealerIndex + 1) % room.seatOrder.length
    return
  }
  if (room.phase === 'flop') {
    room.phase = 'turn'
    room.communityCards.push(room.deck.shift())
    room.roundBet = 0
    room.currentBet = {}
    room.currentPlayerIndex = (room.dealerIndex + 1) % room.seatOrder.length
    return
  }
  if (room.phase === 'turn') {
    room.phase = 'river'
    room.communityCards.push(room.deck.shift())
    room.roundBet = 0
    room.currentBet = {}
    room.currentPlayerIndex = (room.dealerIndex + 1) % room.seatOrder.length
    return
  }
  if (room.phase === 'river') {
    room.phase = 'showdown'
    awardPot(room)
    return
  }
}

function awardPot(room) {
  const active = getActivePlayers(room)
  if (active.length === 0) return
  if (active.length === 1) {
    room.chips[active[0]] = (room.chips[active[0]] || 0) + room.pot
    room.pot = 0
    endRound(room)
    return
  }
  const bestHands = {}
  const community = room.communityCards || []
  for (const pid of active) {
    const hole = room.holeCards[pid] || []
    const seven = [...hole, ...community]
    bestHands[pid] = evaluateHand(seven)
  }
  let best = active[0]
  for (const pid of active.slice(1)) {
    if (compareHandRanks(bestHands[pid], bestHands[best]) > 0) best = pid
  }
  const winners = active.filter((pid) => compareHandRanks(bestHands[pid], bestHands[best]) === 0)
  const share = Math.floor(room.pot / winners.length)
  for (const pid of winners) room.chips[pid] = (room.chips[pid] || 0) + share
  room.pot = 0
  room.winnerThisRound = winners
  endRound(room)
}

function endRound(room) {
  room.state = 'between_rounds'
  room.phase = null
  room.communityCards = []
  room.holeCards = {}
  room.folded = new Set()
  room.currentBet = {}
  room.roundBet = 0
  for (const id of room.seatOrder) {
    if ((room.chips[id] || 0) <= 0) {
      room.bustCount[id] = (room.bustCount[id] || 0) + 1
      room.chips[id] = START_CHIPS
    }
  }
  room.readyPlayers = []
}

function startNewRound(room) {
  const atTable = room.seatOrder.filter((id) => (room.chips[id] || 0) > 0)
  if (atTable.length < 2) {
    room.state = 'waiting'
    return
  }
  room.state = 'playing'
  room.deck = buildDeck()
  room.communityCards = []
  room.holeCards = {}
  room.folded = new Set()
  room.currentBet = {}
  room.roundBet = BIG_BLIND
  room.pot = 0
  room.dealerIndex = (room.dealerIndex + 1) % room.seatOrder.length
  const dealer = room.seatOrder[room.dealerIndex]
  const sbIndex = (room.dealerIndex + 1) % room.seatOrder.length
  const bbIndex = (room.dealerIndex + 2) % room.seatOrder.length
  const sbPlayer = room.seatOrder[sbIndex]
  const bbPlayer = room.seatOrder[bbIndex]
  room.chips[sbPlayer] = (room.chips[sbPlayer] || 0) - SMALL_BLIND
  room.chips[bbPlayer] = (room.chips[bbPlayer] || 0) - BIG_BLIND
  room.pot = SMALL_BLIND + BIG_BLIND
  room.currentBet[sbPlayer] = SMALL_BLIND
  room.currentBet[bbPlayer] = BIG_BLIND
  room.phase = 'preflop'
  for (const id of room.seatOrder) {
    if ((room.chips[id] || 0) <= 0) continue
    room.holeCards[id] = [room.deck.shift(), room.deck.shift()]
  }
  const n = room.seatOrder.length
  room.currentPlayerIndex = n === 2 ? sbIndex : (room.dealerIndex + 3) % n
  room.lastAggressorIndex = bbIndex
}

function advanceTurn(room) {
  const active = getActivePlayers(room)
  if (active.length === 1) {
    room.chips[active[0]] = (room.chips[active[0]] || 0) + room.pot
    room.pot = 0
    room.winnerThisRound = [active[0]]
    endRound(room)
    return
  }
  const order = room.seatOrder
  const start = room.currentPlayerIndex
  let next = (start + 1) % order.length
  while (next !== start) {
    const id = order[next]
    if (room.folded.has(id)) {
      next = (next + 1) % order.length
      continue
    }
    const chips = room.chips[id] || 0
    const bet = room.currentBet[id] || 0
    const hasActed = bet >= room.roundBet || chips === 0
    if (!hasActed) {
      room.currentPlayerIndex = next
      return
    }
    next = (next + 1) % order.length
  }
  nextPhase(room)
  if (room.state === 'playing') scheduleBotTurns(room)
}

function botAction(room, playerId) {
  const hole = room.holeCards[playerId] || []
  const community = room.communityCards || []
  const toCall = room.roundBet - (room.currentBet[playerId] || 0)
  const myChips = room.chips[playerId] || 0
  const canRaise = myChips > toCall

  const handStrength = (() => {
    if (hole.length < 2) return 0
    const v0 = rankValue(hole[0])
    const v1 = rankValue(hole[1])
    const high = Math.max(v0, v1)
    const low = Math.min(v0, v1)
    const pair = hole[0].rank === hole[1].rank
    const suited = hole[0].suit === hole[1].suit
    let s = high * 2 + low
    if (pair) s += 40
    if (suited) s += 5
    if (high >= 10) s += 15
    return Math.min(100, s)
  })()

  if (handStrength < 25 && toCall > myChips * 0.3) return 'fold'
  if (handStrength >= 70 && canRaise) return 'raise'
  if (toCall === 0) return 'check'
  return 'call'
}

export function joinRoom(roomId, playerName) {
  cleanupInactiveRooms()
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      roomId,
      seatOrder: [],
      players: [],
      chips: {},
      bustCount: {},
      state: 'waiting',
      deck: [],
      communityCards: [],
      holeCards: {},
      folded: new Set(),
      currentBet: {},
      roundBet: 0,
      pot: 0,
      dealerIndex: 0,
      currentPlayerIndex: 0,
      phase: null,
      readyPlayers: [],
      winnerThisRound: null,
      lastActivityAt: Date.now(),
    }
    rooms.set(roomId, room)
  }
  touchRoom(room)

  const name = (playerName || '').trim()
  if (!name) return { success: false, error: 'Name required' }
  const humanCount = room.players.filter((p) => !p.isBot).length
  const total = room.seatOrder.length
  if (total >= TABLE_SIZE) return { success: false, error: 'Table full' }
  const existing = room.players.find((p) => !p.isBot && p.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    return {
      success: true,
      playerId: existing.id,
      roomId,
      state: room.state,
      players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, isBot: p.isBot })),
      seatOrder: room.seatOrder,
      chips: room.chips,
      bustCount: room.bustCount || {},
    }
  }

  const playerId = generatePlayerId()
  const emojis = ['🃏', '🎴', '♠️', '♥️', '♦️', '♣️', '🂡', '🂢', '🂣']
  const emoji = emojis[room.players.length % emojis.length]
  room.players.push({ id: playerId, name, emoji, isBot: false })
  room.seatOrder.push(playerId)
  room.chips[playerId] = START_CHIPS
  room.bustCount[playerId] = room.bustCount[playerId] || 0

  return {
    success: true,
    playerId,
    roomId,
    state: room.state,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, isBot: p.isBot })),
    seatOrder: room.seatOrder,
    chips: room.chips,
    bustCount: room.bustCount || {},
  }
}

export function addBot(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (!room.players.some((p) => p.id === playerId && !p.isBot)) return { success: false, error: 'Not in room' }
  touchRoom(room)
  if (room.seatOrder.length >= TABLE_SIZE) return { success: false, error: 'Table full' }

  const botId = generateBotId()
  const usedNames = new Set(room.players.map((p) => p.name))
  let name = BOT_NAMES[room.players.length % BOT_NAMES.length]
  if (usedNames.has(name)) name = `Bot ${botId.slice(-3)}`
  room.players.push({ id: botId, name, emoji: '🤖', isBot: true })
  room.seatOrder.push(botId)
  room.chips[botId] = START_CHIPS
  room.bustCount[botId] = 0

  return {
    success: true,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, isBot: p.isBot })),
    seatOrder: room.seatOrder,
    chips: room.chips,
  }
}

export function removeBot(roomId, playerId, botIdToRemove) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (!room.players.some((p) => p.id === playerId && !p.isBot)) return { success: false, error: 'Not in room' }
  const bot = room.players.find((p) => p.id === botIdToRemove && p.isBot)
  if (!bot) return { success: false, error: 'Not a bot or not found' }
  touchRoom(room)

  room.players = room.players.filter((p) => p.id !== botIdToRemove)
  room.seatOrder = room.seatOrder.filter((id) => id !== botIdToRemove)
  delete room.chips[botIdToRemove]
  delete room.bustCount[botIdToRemove]
  if (room.state === 'playing') {
    room.folded.add(botIdToRemove)
  }

  return {
    success: true,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, isBot: p.isBot })),
    seatOrder: room.seatOrder,
    chips: room.chips,
  }
}

export function startGame(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (!room.players.some((p) => p.id === playerId && !p.isBot)) return { success: false, error: 'Not in room' }
  if (room.state !== 'waiting') return { success: false, error: 'Game already started' }
  touchRoom(room)
  if (room.seatOrder.length < 2) return { success: false, error: 'Need at least 2 players' }

  room.dealerIndex = secureRandomInt(room.seatOrder.length)
  startNewRound(room)
  scheduleBotTurns(room)
  return { success: true }
}

function scheduleBotTurns(room) {
  if (room._botTimeout) clearTimeout(room._botTimeout)
  const order = room.seatOrder
  const currentId = order[room.currentPlayerIndex]
  const player = room.players.find((p) => p.id === currentId)
  const rid = room.roomId
  if (player && player.isBot && room.state === 'playing' && room.phase !== 'showdown') {
    room._botTimeout = setTimeout(() => {
      const action = botAction(room, currentId)
      if (action === 'fold') actionFold(rid, currentId)
      else if (action === 'check') actionCheck(rid, currentId)
      else if (action === 'call') actionCall(rid, currentId)
      else if (action === 'raise') actionRaise(rid, currentId, room.roundBet + BIG_BLIND)
      scheduleBotTurns(room)
    }, 1200)
  }
}

function actionFold(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return
  room.folded.add(playerId)
  advanceTurn(room)
  if (room.state === 'playing' && room.phase !== 'showdown') scheduleBotTurns(room)
}

function actionCheck(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return
  const toCall = room.roundBet - (room.currentBet[playerId] || 0)
  if (toCall !== 0) return
  advanceTurn(room)
  if (room.state === 'playing' && room.phase !== 'showdown') scheduleBotTurns(room)
}

function actionCall(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return
  const toCall = room.roundBet - (room.currentBet[playerId] || 0)
  const myChips = room.chips[playerId] || 0
  const amount = Math.min(toCall, myChips)
  room.chips[playerId] = myChips - amount
  room.currentBet[playerId] = (room.currentBet[playerId] || 0) + amount
  room.pot += amount
  advanceTurn(room)
  if (room.state === 'playing' && room.phase !== 'showdown') scheduleBotTurns(room)
}

function actionRaise(roomId, playerId, amount) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return
  const myChips = room.chips[playerId] || 0
  const current = room.currentBet[playerId] || 0
  const toMatch = amount - current
  const actual = Math.min(toMatch, myChips)
  room.chips[playerId] = myChips - actual
  room.currentBet[playerId] = current + actual
  room.pot += actual
  if (current + actual > room.roundBet) room.roundBet = current + actual
  const idx = room.seatOrder.indexOf(playerId)
  if (idx >= 0) room.lastAggressorIndex = idx
  advanceTurn(room)
  if (room.state === 'playing' && room.phase !== 'showdown') scheduleBotTurns(room)
}

export function fold(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  const order = room.seatOrder
  const currentId = order[room.currentPlayerIndex]
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  touchRoom(room)
  actionFold(roomId, playerId)
  return { success: true }
}

export function check(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  const order = room.seatOrder
  const currentId = order[room.currentPlayerIndex]
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  const toCall = room.roundBet - (room.currentBet[playerId] || 0)
  if (toCall !== 0) return { success: false, error: 'Must call or fold' }
  touchRoom(room)
  actionCheck(roomId, playerId)
  return { success: true }
}

export function call(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  const order = room.seatOrder
  const currentId = order[room.currentPlayerIndex]
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  touchRoom(room)
  const toCall = room.roundBet - (room.currentBet[playerId] || 0)
  if (toCall <= 0) return { success: false, error: 'Nothing to call' }
  actionCall(roomId, playerId)
  return { success: true }
}

export function raise(roomId, playerId, amount) {
  const room = rooms.get(roomId)
  if (!room || room.state !== 'playing') return { success: false, error: 'Not in play' }
  const order = room.seatOrder
  const currentId = order[room.currentPlayerIndex]
  if (currentId !== playerId) return { success: false, error: 'Not your turn' }
  touchRoom(room)
  const minRaise = room.roundBet + BIG_BLIND
  const num = parseInt(amount, 10)
  if (isNaN(num) || num < minRaise) return { success: false, error: `Min raise ${minRaise}` }
  const myChips = room.chips[playerId] || 0
  if (num > room.currentBet[playerId] + myChips) return { success: false, error: 'Not enough chips' }
  actionRaise(roomId, playerId, num)
  return { success: true }
}

export function readyNextRound(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  if (room.state !== 'between_rounds') return { success: false, error: 'Not between rounds' }
  touchRoom(room)
  room.readyPlayers = room.readyPlayers || []
  if (!room.readyPlayers.includes(playerId)) room.readyPlayers.push(playerId)
  const humans = room.players.filter((p) => !p.isBot).map((p) => p.id)
  const allReady = humans.length > 0 && humans.every((id) => room.readyPlayers.includes(id))
  if (allReady) {
    startNewRound(room)
    scheduleBotTurns(room)
  }
  return { success: true, readyPlayers: room.readyPlayers }
}

export function getRoomState(roomId, playerId) {
  cleanupInactiveRooms()
  const room = rooms.get(roomId)
  if (!room) return null
  touchRoom(room)

  const base = {
    roomId,
    state: room.state,
    players: room.players.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, isBot: p.isBot })),
    seatOrder: room.seatOrder,
    chips: { ...room.chips },
    bustCount: { ...(room.bustCount || {}) },
    tableSize: TABLE_SIZE,
  }

  base.leaderboard = room.seatOrder.map((id) => ({
    id,
    name: (room.players.find((p) => p.id === id) || {}).name,
    emoji: (room.players.find((p) => p.id === id) || {}).emoji,
    chips: room.chips[id] || 0,
    bustCount: room.bustCount[id] || 0,
    score: (room.chips[id] || 0) - ((room.bustCount[id] || 0) * BUST_PENALTY),
  })).sort((a, b) => b.score - a.score)

  if (room.state === 'waiting') {
    return base
  }

  if (room.state === 'between_rounds') {
    base.readyPlayers = room.readyPlayers || []
    base.winnerThisRound = room.winnerThisRound || []
    return base
  }

  if (room.state === 'playing') {
    base.communityCards = room.communityCards || []
    base.pot = room.pot
    base.roundBet = room.roundBet
    base.currentPlayerId = room.seatOrder[room.currentPlayerIndex]
    base.phase = room.phase
    base.folded = Array.from(room.folded || [])
    base.currentBet = { ...(room.currentBet || {}) }
    base.myHoleCards = room.holeCards[playerId] || []
    base.holeCardsRevealed = {}
    if (room.phase === 'showdown') {
      for (const id of room.seatOrder) base.holeCardsRevealed[id] = room.holeCards[id] || []
    }
    base.dealerIndex = room.dealerIndex
    base.winnerThisRound = room.winnerThisRound || null
    return base
  }

  return base
}

export function listRooms() {
  cleanupInactiveRooms()
  return [...rooms.entries()].map(([roomId, r]) => ({
    roomId,
    playerCount: r.seatOrder?.length ?? 0,
    state: r.state ?? 'waiting',
    minPlayers: MIN_PLAYERS,
    tableSize: TABLE_SIZE,
    hasPassword: false,
  }))
}

export function leaveRoom(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return { success: false, error: 'Room not found' }
  touchRoom(room)
  const isBot = room.players.some((p) => p.id === playerId && p.isBot)
  if (isBot) return { success: false, error: 'Bots cannot leave' }
  room.players = room.players.filter((p) => p.id !== playerId)
  room.seatOrder = room.seatOrder.filter((id) => id !== playerId)
  delete room.chips[playerId]
  delete room.bustCount[playerId]
  if (room._botTimeout) clearTimeout(room._botTimeout)
  if (room.seatOrder.length === 0) {
    rooms.delete(roomId)
    return { success: true }
  }
  if (room.state === 'playing' || room.state === 'between_rounds') {
    room.state = 'waiting'
    room.readyPlayers = []
    room.deck = []
    room.communityCards = []
    room.holeCards = {}
    room.folded = new Set()
    room.currentBet = {}
    room.pot = 0
  }
  return { success: true }
}
