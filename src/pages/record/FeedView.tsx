import { Link } from 'react-router-dom'
import Thumb from '../../components/Thumb'
import { daysBetween, todayIso } from '../../lib/dates'
import { feedPhotos, groupByCountry } from '../../lib/records'
import { useTrip } from '../../lib/useTrip'
import { useMoments } from '../../lib/useRecords'
import { ZoomBar } from './shared'

export default function FeedView() {
  const { trip, days, loading } = useTrip()
  const moments = useMoments()
  if (loading || !trip) return null

  const countries = groupByCountry(moments).filter((c) => c.country !== '어딘가')
  const cities = new Set(moments.map((m) => m.city).filter(Boolean))
  const sinceStart = daysBetween(trip.startDate, todayIso())
  const dayNum = sinceStart < 0 ? 0 : Math.min(sinceStart + 1, days.length)
  const photos = feedPhotos(moments)
  const now = days.find((d) => d.order === sinceStart)

  return (
    <div className="page record">
      <ZoomBar />
      <section className="profile">
        <div className="avatar" aria-hidden="true">✈︎</div>
        <div className="profile-stats">
          <span><strong>{dayNum}</strong>Day</span>
          <span><strong>{countries.length}</strong>나라</span>
          <span><strong>{cities.size}</strong>도시</span>
        </div>
      </section>
      <div className="profile-bio">
        <strong>{trip.name}</strong>
        <span>{days.length}일 동안 {new Set(days.map((d) => d.country).filter(Boolean)).size}개국</span>
        {now && <span className="muted">지금 {now.cities.at(-1)} · {now.country}</span>}
      </div>

      {countries.length > 0 && (
        <div className="highlights">
          {countries.map((c) => (
            <Link key={c.country} to={`/record/countries#country-${c.country}`} className="highlight">
              <span className="hl-ring">{c.photoIds[0] ? <Thumb id={c.photoIds[0]} className="hl-img" /> : <span className="hl-img thumb-empty" />}</span>
              <span>{c.country}</span>
            </Link>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="muted">사진을 올리면 여기에 피드처럼 모여요.</p>
      ) : (
        <div className="feed-grid">
          {photos.map((p) => (
            <Link key={p.photoId} to={`/record/day/${p.date}`} aria-label={`${p.date} 기록 보기`}>
              <Thumb id={p.photoId} className="grid-photo" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
