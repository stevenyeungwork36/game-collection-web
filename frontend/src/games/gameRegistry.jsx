import { lazy, Suspense } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { getTranslations } from '../translations'

const ImposterGame = lazy(() => import('./imposter'))
const KittensGame = lazy(() => import('./kittens'))
const BigTwoGame = lazy(() => import('./bigtwo'))
const TestGame = lazy(() => import('./test'))

function GameFallback() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-light" role="status">
        <span className="visually-hidden">{t.loading}</span>
      </div>
    </div>
  )
}

export const gameRegistry = [
  {
    id: 'imposter',
    title: 'Imposter',
    titleZh: '臥底',
    description: 'Find the imposter. One player sees a different word; vote to catch them.',
    descriptionZh: '找出臥底。一人看到不同的詞，其他人投票指認。',
    path: '/games/imposter',
    icon: '🎭',
    Component: function ImposterRoute() {
      return (
        <Suspense fallback={<GameFallback />}>
          <ImposterGame />
        </Suspense>
      )
    },
  },
  {
    id: 'kittens',
    title: 'Exploding Kittens',
    titleZh: '爆炸貓',
    description: 'Avoid the exploding kitten. Play cards, draw carefully. Min 2 players.',
    descriptionZh: '避開爆炸貓。出牌與抽牌需謹慎。至少 2 人。',
    path: '/games/kittens',
    icon: '🐱',
    Component: function KittensRoute() {
      return (
        <Suspense fallback={<GameFallback />}>
          <KittensGame />
        </Suspense>
      )
    },
  },
  {
    id: 'bigtwo',
    title: 'Big Two',
    titleZh: '鋤大弟',
    description: 'Climbing card game. Play combinations to empty your hand. 2 is highest. 3–4 players.',
    descriptionZh: '撲克牌接龍遊戲，出牌組合壓過上家並清空手牌。2 最大。3–4 人。',
    path: '/games/bigtwo',
    icon: '🃏',
    Component: function BigTwoRoute() {
      return (
        <Suspense fallback={<GameFallback />}>
          <BigTwoGame />
        </Suspense>
      )
    },
  },
  {
    id: 'test',
    title: 'Connection Test',
    titleZh: '連線測試',
    description: 'One-person test: check that the backend is reachable.',
    descriptionZh: '單人測試：確認後端是否可連線。',
    path: '/games/test',
    icon: '🔌',
    subdued: true,
    Component: function TestRoute() {
      return (
        <Suspense fallback={<GameFallback />}>
          <TestGame />
        </Suspense>
      )
    },
  },
]
