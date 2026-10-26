import { NavLink, useLocation } from 'react-router-dom'

const VIEWS = [
  { to: '/record', label: '하루', end: true },
  { to: '/record/days', label: '날별' },
  { to: '/record/countries', label: '나라' },
  { to: '/record/feed', label: '피드' },
]

/** Today, days, countries, feed: each one step wider than the last. */
export function ZoomBar() {
  // A past day opened from the wider views is still the day view.
  const onDay = useLocation().pathname.startsWith('/record/day/')
  return (
    <nav className="zoom-bar" aria-label="기록 보기">
      {VIEWS.map((v) => (
        <NavLink key={v.to} to={v.to} end={v.end} className={({ isActive }) => (isActive || (onDay && v.end) ? 'zoom active' : 'zoom')}>{v.label}</NavLink>
      ))}
    </nav>
  )
}

export function Stars({ value }: { value: number }) {
  if (!value) return null
  return <span className="stars" aria-label={`별점 ${value}점`}>{'★'.repeat(value)}<span className="stars-off">{'★'.repeat(5 - value)}</span></span>
}
