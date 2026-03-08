import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { useLanguage } from './context/LanguageContext'
import { getTranslations } from './translations'
import Drawer, { DRAWER_WIDTH } from './components/Drawer'
import DrawerToggle from './components/DrawerToggle'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import GameLayout from './components/GameLayout'
import { gameRegistry } from './games/gameRegistry'

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { lang } = useLanguage()
  const t = getTranslations(lang)

  return (
    <div className="app-root">
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <DrawerToggle
        onClick={() => setDrawerOpen((prev) => !prev)}
        ariaLabel={drawerOpen ? t.closeMenu : t.openMenu}
        stuckToDrawer={drawerOpen}
        drawerWidth={DRAWER_WIDTH}
        isOpen={drawerOpen}
      />
      <main
        className="app-main"
        style={{ marginLeft: drawerOpen ? DRAWER_WIDTH : 0 }}
      >
        <div className="app-main-inner">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {gameRegistry.map((game) => (
            <Route
              key={game.path}
              path={game.path}
              element={
                <GameLayout config={game}>
                  <game.Component />
                </GameLayout>
              }
            />
          ))}
          </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
