import { lazy, Suspense } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import DayPage from './pages/DayPage'
import StopPage from './pages/StopPage'
import ImportPage from './pages/ImportPage'
import AiPage from './pages/AiPage'
import SettingsPage from './pages/SettingsPage'
import TodayView from './pages/record/TodayView'
import DaysView from './pages/record/DaysView'
import CountriesView from './pages/record/CountriesView'
import FeedView from './pages/record/FeedView'
import MomentPage from './pages/record/MomentPage'
import BookingsPage from './pages/BookingsPage'
import BookingPage from './pages/BookingPage'
import MoneyPage from './pages/MoneyPage'
import ExpensePage from './pages/ExpensePage'
import WalletPage from './pages/WalletPage'
import PackPage from './pages/PackPage'
import MorePage from './pages/more/MorePage'
import EntryPage from './pages/more/EntryPage'
import DocsPage from './pages/more/DocsPage'
import SafetyPage from './pages/more/SafetyPage'
import { useBookings } from './lib/useData'
import Icon, { type IconName } from './components/Icon'
import { dueSoon } from './lib/bookings'
import { todayIso } from './lib/dates'

// The map library is large, so it loads only when the map tab opens.
const MapPage = lazy(() => import('./pages/MapPage'))

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: '홈', icon: 'home', end: true },
  { to: '/plan', label: '계획', icon: 'plan' },
  { to: '/record', label: '기록', icon: 'record' },
  { to: '/book', label: '예약', icon: 'book' },
  { to: '/money', label: '가계부', icon: 'money' },
  { to: '/more', label: '기타', icon: 'more' },
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
            <Route path="/plan/:dayId/stop/:stopId" element={<StopPage />} />
            <Route path="/map" element={<Suspense fallback={null}><MapPage /></Suspense>} />
            <Route path="/ai" element={<AiPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/book" element={<BookingsPage />} />
            <Route path="/book/:bookingId" element={<BookingPage />} />
            <Route path="/money" element={<MoneyPage />} />
            <Route path="/money/wallet" element={<WalletPage />} />
            <Route path="/money/:expenseId" element={<ExpensePage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/more/entry" element={<EntryPage />} />
            <Route path="/more/docs" element={<DocsPage />} />
            <Route path="/more/safety" element={<SafetyPage />} />
            <Route path="/pack" element={<PackPage />} />
            <Route path="/record" element={<TodayView />} />
            <Route path="/record/day/:date" element={<TodayView />} />
            <Route path="/record/days" element={<DaysView />} />
            <Route path="/record/countries" element={<CountriesView />} />
            <Route path="/record/feed" element={<FeedView />} />
            <Route path="/record/m/:momentId" element={<MomentPage />} />
          </Routes>
        </main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              {({ isActive }) => (
                <>
                  <span className="tab-icon"><Icon name={t.icon} bold={isActive} /></span>
                  {t.to === '/book' && overdue > 0 && <span className="tab-badge">{overdue}</span>}
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
