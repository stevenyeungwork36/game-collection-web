import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getTranslations } from '../translations'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useLanguage()
  const t = getTranslations(lang)

  return (
    <div className="page-content">
      <h2 className="page-title">{t.settingsTitle}</h2>
      <p className="page-subtitle">{t.settingsSubtitle}</p>

      <section className="settings-section">
        <h3 className="settings-section-title">{t.language}</h3>
        <p className="settings-section-desc">{t.settingsLanguageDesc}</p>
        <div className="theme-toggle theme-switch--standalone" style={{ maxWidth: '12rem' }}>
          <button
            type="button"
            className={lang === 'en' ? 'active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={lang === 'zh' ? 'active' : ''}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">{t.settingsTheme}</h3>
        <p className="settings-section-desc">{t.settingsThemeDesc}</p>
        <div className="theme-switch theme-switch--standalone" role="group" aria-label={t.settingsTheme}>
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
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">{t.settingsMore}</h3>
        <p className="settings-section-desc text-muted">
          {t.settingsPlaceholder}
        </p>
      </section>
    </div>
  )
}
