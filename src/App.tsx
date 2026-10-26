import { lazy, Suspense } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import DayPage from './pages/DayPage'
import ImportPage from './pages/ImportPage'
import AiPage from './pages/AiPage'
import SettingsPage from './pages/SettingsPage'
import ComingSoon from './pages/ComingSoon'

// The map library is large, so it loads only when the map tab opens.
const MapPage = lazy(() => import('./pages/MapPage'))

const TABS = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/plan', label: '계획', icon: '🗓️' },
  { to: '/map', label: '지도', icon: '🗺️' },
  { to: '/money', label: '가계부', icon: '💳' },
  { to: '/record', label: '기록', icon: '📸' },
]

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <main className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/plan/import" element={<ImportPage />} />
            <Route path="/plan/:dayId" element={<DayPage />} />
            <Route path="/map" element={<Suspense fallback={null}><MapPage /></Suspense>} />
            <Route path="/ai" element={<AiPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/money" element={<ComingSoon title="가계부" step="2단계 (11/23~12/13)" />} />
            <Route path="/record" element={<ComingSoon title="기록" step="3단계 (12/14~1/3)" />} />
          </Routes>
        </main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
