// Card type definitions for Exploding Kittens

const FOOD_DESC_EN = 'Play 2 matching food cards to steal a random card from the next player.'
const FOOD_DESC_ZH = '打出 2 張相同食物牌，可從下一位玩家手牌中隨機抽走 1 張。'

export const CARD_TYPES = {
  exploding_kitten: {
    type: 'exploding_kitten',
    titleEn: 'Exploding Kitten',
    titleZh: '爆炸貓',
    descEn: "Draw this and you're out! Play a Defuse to survive.",
    descZh: '抽到即出局！打出拆彈可免於出局。',
    emoji: '💣',
  },
  defuse: {
    type: 'defuse',
    titleEn: 'Defuse',
    titleZh: '拆彈',
    descEn: 'Cancel an Exploding Kitten. Put it back in the deck anywhere.',
    descZh: '可化解爆炸貓，並將該牌放回牌堆任意位置。',
    emoji: '🙏',
  },
  skip: {
    type: 'skip',
    titleEn: 'Skip',
    titleZh: '跳過',
    descEn: 'End your turn without drawing a card.',
    descZh: '結束你的回合且不用抽牌。',
    emoji: '⏭️',
  },
  attack: {
    type: 'attack',
    titleEn: 'Attack',
    titleZh: '攻擊',
    descEn: 'Next player must take 2 turns (draw 2 cards).',
    descZh: '下一位玩家必須連續進行兩回合（抽兩張牌）。',
    emoji: '⚔️',
  },
  nope: {
    type: 'nope',
    titleEn: 'Nope',
    titleZh: '不要',
    descEn: 'Cancel any Action card (except Exploding Kitten or Defuse).',
    descZh: '可取消任何行動牌（爆炸貓與拆彈除外）。',
    emoji: '🚫',
  },
  see_the_future: {
    type: 'see_the_future',
    titleEn: 'See the Future',
    titleZh: '預知未來',
    descEn: 'Peek at the top 3 cards of the draw pile.',
    descZh: '查看牌堆最上面 3 張牌。',
    emoji: '🔮',
  },
  shuffle: {
    type: 'shuffle',
    titleEn: 'Shuffle',
    titleZh: '洗牌',
    descEn: 'Shuffle the draw pile.',
    descZh: '將牌堆洗牌。',
    emoji: '🔀',
  },
  favor: {
    type: 'favor',
    titleEn: 'Gratitude',
    titleZh: '感恩',
    descEn: 'Choose a player; they must give you 1 card of their choice from their hand.',
    descZh: '選擇一位玩家，該玩家必須從手牌中選 1 張牌給你。',
    emoji: '🙇',
  },
  draw_from_bottom: {
    type: 'draw_from_bottom',
    titleEn: 'Draw from the Bottom',
    titleZh: '從底抽牌',
    descEn: 'Your next draw is from the bottom of the deck instead of the top.',
    descZh: '你下一次抽牌改為從牌堆底部抽牌。',
    emoji: '⬇️',
  },
  reverse: {
    type: 'reverse',
    titleEn: 'Reverse',
    titleZh: '反轉',
    descEn: 'Reverse the order of play.',
    descZh: '反轉出牌順序。',
    emoji: '🔄',
  },
  food_taco: {
    type: 'food_taco',
    titleEn: 'Taco Cat',
    titleZh: '塔可貓',
    descEn: FOOD_DESC_EN,
    descZh: FOOD_DESC_ZH,
    emoji: '🌮',
  },
  food_watermelon: {
    type: 'food_watermelon',
    titleEn: 'Watermelon',
    titleZh: '西瓜',
    descEn: FOOD_DESC_EN,
    descZh: FOOD_DESC_ZH,
    emoji: '🍉',
  },
  food_pizza: {
    type: 'food_pizza',
    titleEn: 'Pizza',
    titleZh: '披薩',
    descEn: FOOD_DESC_EN,
    descZh: FOOD_DESC_ZH,
    emoji: '🍕',
  },
  food_sushi: {
    type: 'food_sushi',
    titleEn: 'Sushi',
    titleZh: '壽司',
    descEn: FOOD_DESC_EN,
    descZh: FOOD_DESC_ZH,
    emoji: '🍣',
  },
}

export const DECK_TEMPLATE = [
  ['defuse', 6],
  ['skip', 4],
  ['attack', 4],
  ['nope', 5],
  ['see_the_future', 5],
  ['shuffle', 5],
  ['favor', 4],
  ['draw_from_bottom', 4],
  ['reverse', 4],
  ['food_taco', 2],
  ['food_watermelon', 2],
  ['food_pizza', 2],
  ['food_sushi', 2],
]

export function getCardInfo(type) {
  return CARD_TYPES[type] ? { ...CARD_TYPES[type] } : null
}

export function isFoodType(type) {
  return type && type.startsWith('food_')
}
