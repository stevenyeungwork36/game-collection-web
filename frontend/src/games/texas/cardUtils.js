/**
 * Texas Hold'em uses same card format as Big Two (rank 2-A, suits D/C/H/S).
 * Re-export card image helper for consistency with frontend/public/cards naming.
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

export function cardLabel(card, lang) {
  const sym = { D: '♦', C: '♣', H: '♥', S: '♠' }[card?.suit] || ''
  return `${card?.rank || ''}${sym}`
}
