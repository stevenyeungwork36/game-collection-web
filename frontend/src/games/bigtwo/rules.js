/**
 * Big Two rules: suit hierarchy (flower type) and combination types
 */

export const RULES_EN = {
  title: 'Rules',
  goal: 'Be the first to empty your hand. Play combinations that beat the table or pass.',
  suitOrder: 'Suit order (low to high, for tie-break)',
  suits: [
    { name: 'Diamonds', symbol: '♦', key: 'diamonds' },
    { name: 'Clubs', symbol: '♣', key: 'clubs' },
    { name: 'Hearts', symbol: '♥', key: 'hearts' },
    { name: 'Spades', symbol: '♠', key: 'spades' },
  ],
  rankOrder: 'Rank: 3 (lowest) < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 (highest)',
  combosTitle: 'Combination types',
  combos: [
    { type: 'single', name: 'Single', desc: 'One card.', nameZh: '單張', descZh: '一張牌。' },
    { type: 'pair', name: 'Pair', desc: 'Two cards of the same rank.', nameZh: '對子', descZh: '兩張相同點數。' },
    { type: 'triple', name: 'Triple', desc: 'Three cards of the same rank.', nameZh: '三條', descZh: '三張相同點數。' },
    { type: 'straight', name: 'Straight', desc: 'Five consecutive ranks (same or mixed suits).', nameZh: '順子', descZh: '五張連續點數（同花或雜花）。' },
    { type: 'flush', name: 'Flush', desc: 'Five cards of the same suit.', nameZh: '同花', descZh: '五張同一花色。' },
    { type: 'full_house', name: 'Full house', desc: 'Three of one rank + two of another.', nameZh: '葫蘆', descZh: '三條加一對。' },
    { type: 'four_of_a_kind', name: 'Four of a kind', desc: 'Four cards of the same rank.', nameZh: '鐵支', descZh: '四張相同點數。' },
    { type: 'straight_flush', name: 'Straight flush', desc: 'Five consecutive ranks, same suit.', nameZh: '同花順', descZh: '五張連續點數且同花。' },
  ],
  firstPlay: 'The player with 3♦ leads first. Then play in turn: beat the table or pass. If all others pass, you lead again.',
}

export const RULES_ZH = {
  title: '規則',
  goal: '先出完手牌者勝。出牌需壓過檯面或選擇過牌。',
  suitOrder: '花色大小（小至大，用於比牌）',
  suits: [
    { name: '方塊', symbol: '♦', key: 'diamonds' },
    { name: '梅花', symbol: '♣', key: 'clubs' },
    { name: '紅心', symbol: '♥', key: 'hearts' },
    { name: '黑桃', symbol: '♠', key: 'spades' },
  ],
  rankOrder: '點數：3（最小）< 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2（最大）',
  combosTitle: '牌型',
  combos: [
    { type: 'single', name: 'Single', desc: 'One card.', nameZh: '單張', descZh: '一張牌。' },
    { type: 'pair', name: 'Pair', desc: 'Two cards of the same rank.', nameZh: '對子', descZh: '兩張相同點數。' },
    { type: 'triple', name: 'Triple', desc: 'Three cards of the same rank.', nameZh: '三條', descZh: '三張相同點數。' },
    { type: 'straight', name: 'Straight', desc: 'Five consecutive ranks.', nameZh: '順子', descZh: '五張連續點數。' },
    { type: 'flush', name: 'Flush', desc: 'Five cards of the same suit.', nameZh: '同花', descZh: '五張同一花色。' },
    { type: 'full_house', name: 'Full house', desc: 'Three + two of another rank.', nameZh: '葫蘆', descZh: '三條加一對。' },
    { type: 'four_of_a_kind', name: 'Four of a kind', desc: 'Four cards of the same rank.', nameZh: '鐵支', descZh: '四張相同點數。' },
    { type: 'straight_flush', name: 'Straight flush', desc: 'Straight in same suit.', nameZh: '同花順', descZh: '五張連續點數且同花。' },
  ],
  firstPlay: '持有 3♦ 的玩家先出。依序出牌壓過檯面或過牌；若其餘三人皆過，最後出牌者再領出。',
}

const SUIT_SYMBOLS = { D: '♦', C: '♣', H: '♥', S: '♠' }
const SUIT_NAMES_EN = { D: 'Diamonds', C: 'Clubs', H: 'Hearts', S: 'Spades' }
const SUIT_NAMES_ZH = { D: '方塊', C: '梅花', H: '紅心', S: '黑桃' }

export function cardLabel(card, lang) {
  const sym = SUIT_SYMBOLS[card.suit] || card.suit
  const rank = card.rank
  return `${rank}${sym}`
}

export function cardDisplayClass(card) {
  return `bigtwo-card bigtwo-suit-${(card.suit || '').toLowerCase()}`
}

/**
 * Card image path for custom PNGs in frontend/public/cards/
 * Expected naming: {rank}_of_{suit}.png (e.g. 3_of_diamonds.png, 10_of_hearts.png, ace_of_spades.png, jack_of_clubs.png)
 * Ranks: 2,3,4,5,6,7,8,9,10, ace, jack, queen, king  Suits: clubs, diamonds, hearts, spades
 * If the file is missing, the card falls back to text.
 */
const RANK_TO_FILE = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king', 'A': 'ace' }
const SUIT_TO_FILE = { 'D': 'diamonds', 'C': 'clubs', 'H': 'hearts', 'S': 'spades' }

export function getCardImageSrc(card) {
  if (!card?.rank || !card?.suit) return null
  const rankFile = RANK_TO_FILE[card.rank]
  const suitFile = SUIT_TO_FILE[card.suit]
  if (!rankFile || !suitFile) return null
  return `/cards/${rankFile}_of_${suitFile}.png`
}

/** Example cards for rules display: suit order (one of each suit, same rank). */
export const RULES_SUIT_ORDER_CARDS = [
  { rank: '3', suit: 'D', id: 'rules-d' },
  { rank: '3', suit: 'C', id: 'rules-c' },
  { rank: '3', suit: 'H', id: 'rules-h' },
  { rank: '3', suit: 'S', id: 'rules-s' },
]

/** Example cards for rules: one per rank (3 to 2). */
export const RULES_RANK_ORDER_CARDS = [
  { rank: '3', suit: 'D', id: 'r3' },
  { rank: '5', suit: 'D', id: 'r5' },
  { rank: '8', suit: 'D', id: 'r8' },
  { rank: '10', suit: 'D', id: 'r10' },
  { rank: 'K', suit: 'D', id: 'rk' },
  { rank: '2', suit: 'D', id: 'r2' },
]

/** Example cards for each combo type (for visual display in rules). */
export const RULES_COMBO_EXAMPLES = {
  single: [{ rank: '7', suit: 'H', id: 'ex-s1' }],
  pair: [
    { rank: '9', suit: 'D', id: 'ex-p1' },
    { rank: '9', suit: 'S', id: 'ex-p2' },
  ],
  triple: [
    { rank: 'J', suit: 'D', id: 'ex-t1' },
    { rank: 'J', suit: 'C', id: 'ex-t2' },
    { rank: 'J', suit: 'H', id: 'ex-t3' },
  ],
  straight: [
    { rank: '7', suit: 'D', id: 'ex-st1' },
    { rank: '8', suit: 'C', id: 'ex-st2' },
    { rank: '9', suit: 'H', id: 'ex-st3' },
    { rank: '10', suit: 'S', id: 'ex-st4' },
    { rank: 'J', suit: 'D', id: 'ex-st5' },
  ],
  flush: [
    { rank: '3', suit: 'S', id: 'ex-f1' },
    { rank: '6', suit: 'S', id: 'ex-f2' },
    { rank: '8', suit: 'S', id: 'ex-f3' },
    { rank: '10', suit: 'S', id: 'ex-f4' },
    { rank: 'K', suit: 'S', id: 'ex-f5' },
  ],
  full_house: [
    { rank: '4', suit: 'D', id: 'ex-fh1' },
    { rank: '4', suit: 'C', id: 'ex-fh2' },
    { rank: '4', suit: 'H', id: 'ex-fh3' },
    { rank: 'Q', suit: 'S', id: 'ex-fh4' },
    { rank: 'Q', suit: 'D', id: 'ex-fh5' },
  ],
  four_of_a_kind: [
    { rank: 'A', suit: 'D', id: 'ex-4k1' },
    { rank: 'A', suit: 'C', id: 'ex-4k2' },
    { rank: 'A', suit: 'H', id: 'ex-4k3' },
    { rank: 'A', suit: 'S', id: 'ex-4k4' },
    { rank: '6', suit: 'D', id: 'ex-4k5' },
  ],
  straight_flush: [
    { rank: '5', suit: 'H', id: 'ex-sf1' },
    { rank: '6', suit: 'H', id: 'ex-sf2' },
    { rank: '7', suit: 'H', id: 'ex-sf3' },
    { rank: '8', suit: 'H', id: 'ex-sf4' },
    { rank: '9', suit: 'H', id: 'ex-sf5' },
  ],
}
