import { lazy, Suspense, useEffect } from 'react'
import { createHashRouter, NavLink, Outlet, RouterProvider } from 'react-router-dom'
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
import BackupPage from './pages/more/BackupPage'
import { useBookings } from './lib/useData'
import Icon, { type IconName } from './components/Icon'
import { dueSoon } from './lib/bookings'
import { todayIso } from './lib/dates'
import { refreshRates } from './lib/rates'

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

// A data router, so edit screens can hold the user back from leaving unsaved changes.
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/plan/import', element: <ImportPage /> },
      { path: '/plan/:dayId', element: <DayPage /> },
      { path: '/plan/:dayId/stop/:stopId', element: <StopPage /> },
      { path: '/map', element: <Suspense fallback={null}><MapPage /></Suspense> },
      { path: '/ai', element: <AiPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/book', element: <BookingsPage /> },
      { path: '/book/:bookingId', element: <BookingPage /> },
      { path: '/money', element: <MoneyPage /> },
      { path: '/money/wallet', element: <WalletPage /> },
      { path: '/money/:expenseId', element: <ExpensePage /> },
      { path: '/more', element: <MorePage /> },
      { path: '/more/entry', element: <EntryPage /> },
      { path: '/more/docs', element: <DocsPage /> },
      { path: '/more/safety', element: <SafetyPage /> },
      { path: '/more/backup', element: <BackupPage /> },
      { path: '/pack', element: <PackPage /> },
      { path: '/record', element: <TodayView /> },
      { path: '/record/day/:date', element: <TodayView /> },
      { path: '/record/days', element: <DaysView /> },
      { path: '/record/countries', element: <CountriesView /> },
      { path: '/record/feed', element: <FeedView /> },
      { path: '/record/m/:momentId', element: <MomentPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

function Shell() {
  const overdue = dueSoon(useBookings(), todayIso(), 0).length
  useEffect(() => {
    void refreshRates()
    const onShow = () => document.visibilityState === 'visible' && void refreshRates()
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])
  return (
    <div className="app">
      <main className="content">
        <Outlet />
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
  )
}
