import { Link } from 'react-router-dom'
import Thumb from '../../components/Thumb'
import { formatShort } from '../../lib/dates'
import { groupByDay } from '../../lib/records'
import { useTrip } from '../../lib/useTrip'
import { useMoments } from '../../lib/useRecords'
import { ZoomBar } from './shared'

export default function DaysView() {
  const { trip, days, loading } = useTrip()
  const moments = useMoments()
  if (loading || !trip) return null
  const groups = groupByDay(moments, trip, days)

  return (
    <div className="page record">
      <ZoomBar />
      <h1>날별 앨범</h1>
      {groups.length === 0 && <p className="muted">기록한 날이 아직 없어요.</p>}
      {groups.map((g) => {
        const places = g.moments.filter((m) => m.place).length
        return (
          <Link key={g.date} to={`/record/day/${g.date}`} className="day-album">
            <span className="da-head">
              <span className="da-num">{g.day ? g.day.order + 1 : '·'}</span>
              <strong>{g.city || '여행 전'}</strong>
              <span className="muted">{formatShort(g.date)}{places ? ` · ${places}곳` : ''}</span>
            </span>
            {g.photoIds.length > 0 && (
              <span className={`mosaic n${Math.min(g.photoIds.length, 3)}`}>
                {g.photoIds.slice(0, 3).map((id, i) => (
                  <span key={id} className="mosaic-cell">
                    <Thumb id={id} full={i === 0} />
                    {i === 2 && g.photoIds.length > 3 && <span className="mosaic-more">+{g.photoIds.length - 3}</span>}
                  </span>
                ))}
              </span>
            )}
            {g.caption && <span className="da-caption">{g.caption}</span>}
          </Link>
        )
      })}
    </div>
  )
}
