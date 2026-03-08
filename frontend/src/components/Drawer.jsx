import { Link, useLocation } from 'react-router-dom'
import { gameRegistry } from '../games/gameRegistry'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getTranslations } from '../translations'

const DRAWER_WIDTH = 260

export default function Drawer({ isOpen, onClose }) {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useLanguage()
  const t = getTranslations(lang)

  const gameTitle = (game) => (lang === 'zh' && game.titleZh ? game.titleZh : game.title)

  return (
    <>
      <div
        className={`app-drawer-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`app-drawer ${isOpen ? 'open' : ''}`}
        style={{ width: DRAWER_WIDTH }}
        aria-label={t.navigation}
      >
        <div className="drawer-header">
          <Link to="/" className="drawer-title" onClick={onClose}>
            {t.appTitle}
          </Link>
        </div>
        <nav className="drawer-nav">
          <Link
            to="/"
            className={`drawer-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="drawer-item-icon">🏠</span>
            <span>{t.home}</span>
          </Link>
          {gameRegistry.map((game) => (
            <Link
              key={game.id}
              to={game.path}
              className={`drawer-item ${location.pathname === game.path ? 'active' : ''} ${game.subdued ? 'drawer-item-subdued' : ''}`}
              onClick={onClose}
            >
              <span className="drawer-item-icon">{game.icon}</span>
              <span>{gameTitle(game)}</span>
            </Link>
          ))}
        </nav>
        <div className="drawer-footer">
          <div className="drawer-theme">
            <span className="drawer-theme-label">{t.language}</span>
            <div className="drawer-lang-buttons">
              <button
                type="button"
                className={lang === 'en' ? 'active' : ''}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                className={lang === 'zh' ? 'active' : ''}
                onClick={() => setLang('zh')}
                aria-pressed={lang === 'zh'}
              >
                中文
              </button>
            </div>
          </div>
          <div className="drawer-theme">
            <span className="drawer-theme-label">{t.theme}</span>
            <div className="theme-switch" role="group" aria-label={t.themeA11y}>
              <div className="theme-switch-track">
                <span
                  className="theme-switch-thumb"
                  style={{ left: theme === 'day' ? 2 : 'calc(50% - 2px)' }}
                />
                <button
                  type="button"
                  className={theme === 'day' ? 'active' : ''}
                  onClick={() => setTheme('day')}
                  aria-pressed={theme === 'day'}
                  title={t.dayMode}
                >
                  ☀️
                </button>
                <button
                  type="button"
                  className={theme === 'night' ? 'active' : ''}
                  onClick={() => setTheme('night')}
                  aria-pressed={theme === 'night'}
                  title={t.nightMode}
                >
                  🌙
                </button>
              </div>
            </div>
          </div>
          <Link
            to="/settings"
            className={`drawer-item ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="drawer-item-icon">⚙️</span>
            <span>{t.settings}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}

export { DRAWER_WIDTH }
