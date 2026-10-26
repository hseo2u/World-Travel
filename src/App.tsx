import { lazy, Suspense } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import DayPage from './pages/DayPage'
import ImportPage from './pages/ImportPage'
import AiPage from './pages/AiPage'
import SettingsPage from './pages/SettingsPage'
import ComingSoon from './pages/ComingSoon'
import BookingsPage from './pages/BookingsPage'
import BookingPage from './pages/BookingPage'
import MoneyPage from './pages/MoneyPage'
import ExpensePage from './pages/ExpensePage'
import WalletPage from './pages/WalletPage'
import PackPage from './pages/PackPage'
import { useBookings } from './lib/useData'
import { dueSoon } from './lib/bookings'
import { todayIso } from './lib/dates'

// The map library is large, so it loads only when the map tab opens.
const MapPage = lazy(() => import('./pages/MapPage'))

const TABS = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/plan', label: '계획', icon: '🗓️' },
  { to: '/book', label: '예약', icon: '📌' },
  { to: '/money', label: '가계부', icon: '💳' },
  { to: '/map', label: '지도', icon: '🗺️' },
]

export default function App() {
  const overdue = dueSoon(useBookings(), todayIso(), 0).length
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
            <Route path="/book" element={<BookingsPage />} />
            <Route path="/book/:bookingId" element={<BookingPage />} />
            <Route path="/money" element={<MoneyPage />} />
            <Route path="/money/wallet" element={<WalletPage />} />
            <Route path="/money/:expenseId" element={<ExpensePage />} />
            <Route path="/pack" element={<PackPage />} />
            <Route path="/record" element={<ComingSoon title="기록" step="3단계 (12/14~1/3)" />} />
          </Routes>
        </main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              <span className="tab-icon">{t.icon}</span>
              {t.to === '/book' && overdue > 0 && <span className="tab-badge">{overdue}</span>}
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
