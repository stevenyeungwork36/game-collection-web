import { Link } from 'react-router-dom'
import { gameRegistry } from '../games/gameRegistry'
import { useLanguage } from '../context/LanguageContext'
import { getTranslations } from '../translations'

export default function HomePage() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)

  const gameTitle = (game) => (lang === 'zh' && game.titleZh ? game.titleZh : game.title)
  const gameDesc = (game) => (lang === 'zh' && game.descriptionZh ? game.descriptionZh : game.description)

  return (
    <div className="py-2">
      <h1 className="page-title">{t.homeTitle}</h1>
      <p className="page-subtitle">{t.homeSubtitle}</p>
      <div className="row g-4">
        {gameRegistry.map((game) => (
          <div key={game.id} className={`col-12 col-sm-6 col-lg-4 ${game.subdued ? 'game-card-col-subdued' : ''}`}>
            <Link to={game.path} className="game-card-link text-decoration-none">
              <div className={`game-card card h-100 ${game.subdued ? 'game-card-subdued' : ''}`}>
                <div className="card-body d-flex flex-column">
                  <div className="display-4 mb-3" aria-hidden="true">
                    {game.icon}
                  </div>
                  <h5 className="card-title">{gameTitle(game)}</h5>
                  <p className="card-text text-secondary flex-grow-1">
                    {gameDesc(game)}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
