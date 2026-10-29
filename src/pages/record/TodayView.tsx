import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db'
import Thumb from '../../components/Thumb'
import { formatShort, todayIso } from '../../lib/dates'
import { here, nearbyPlaces, type PlaceHit } from '../../lib/nearby'
import { savePhotos } from '../../lib/photos'
import { dayForDate, fileIntoAlbums, whereOn } from '../../lib/records'
import { useTrip } from '../../lib/useTrip'
import { useStops } from '../../lib/useStops'
import { newMomentLink, useMoments } from '../../lib/useRecords'
import { Stars, ZoomBar } from './shared'

function shift(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function TodayView() {
  const { date: param } = useParams()
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const moments = useMoments()
  const [hits, setHits] = useState<PlaceHit[] | undefined>()
  const [finding, setFinding] = useState('')
  const [note, setNote] = useState('')
  const today = todayIso()
  const date = param ?? today
  const day = trip ? dayForDate(trip, days, date) : undefined
  const planned = useStops(day?.id)
  if (loading || !trip) return null

  const where = whereOn(trip, days, date)
  const list = moments.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time))
  const places = list.filter((m) => m.place)
  const album = list.find((m) => !m.place)
  const photoCount = list.reduce((n, m) => n + m.photoIds.length, 0)
  // Planned stops not recorded yet, one tap away from a record.
  const toRecord = planned.filter((st) => st.kind !== 'move' && !places.some((m) => m.stopId === st.id || m.place === st.name))

  async function findNearby() {
    setFinding('위치를 찾는 중…')
    try {
      const pos = await here()
      setFinding('근처 장소를 찾는 중…')
      setHits((await nearbyPlaces(pos.lat, pos.lng)).slice(0, 8))
      setFinding('')
    } catch {
      setFinding('위치를 못 가져왔어요. 위치 권한을 켜거나 장소를 직접 추가하세요.')
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const photos = await savePhotos(files, date)
    const saved = fileIntoAlbums(photos, moments, (d) => whereOn(trip!, days, d))
    await db.moments.bulkPut(saved)
    const elsewhere = saved.filter((m) => m.date !== date).map((m) => formatShort(m.date))
    setNote(elsewhere.length ? `찍은 날짜에 맞춰 ${elsewhere.join(', ')}에도 넣었어요.` : '')
  }

  return (
    <div className="page record">
      <ZoomBar />
      <header className="today-head">
        <div className="day-nav">
          <button className="icon-btn" aria-label="전날" onClick={() => navigate(`/record/day/${shift(date, -1)}`)}>‹</button>
          <div className="eyebrow">{day ? `DAY ${day.order + 1} · ` : ''}{formatShort(date)}</div>
          <button className="icon-btn" aria-label="다음날" onClick={() => navigate(`/record/day/${shift(date, 1)}`)}>›</button>
        </div>
        <h1>{date === today ? '오늘' : formatShort(date)}{where.city ? ` ${where.city}에서` : ''}</h1>
        <div className="muted">{places.length}곳 · 사진 {photoCount}장</div>
      </header>

      {date === today && (
        <section className="card nearby">
          {!hits ? (
            <button className="btn wide" onClick={findNearby} disabled={!!finding && !finding.startsWith('위치를 못')}>📍 지금 근처 장소 찾기</button>
          ) : (
            <>
              <div className="nearby-title">지금 여기 근처예요. 누르면 바로 기록해요</div>
              <div className="chips">
                {hits.map((h) => <Link key={h.name} className="chip" to={newMomentLink(date, h)}>{h.name}{h.kind ? ` · ${h.kind}` : ''}</Link>)}
                {hits.length === 0 && <span className="muted">근처에 이름 있는 장소가 없어요.</span>}
              </div>
            </>
          )}
          {finding && <p className="muted">{finding}</p>}
        </section>
      )}

      {day && (
        <Link to={`/plan/${day.id}`} className="card link-card plan-link">
          <div className="eyebrow">계획에서 사진 넣기</div>
          <span>{toRecord.length > 0 ? `계획한 ${toRecord.length}곳에 바로 사진을 넣을 수 있어요. 장소를 다시 적을 필요 없어요.` : 'Day ' + (day.order + 1) + ' 계획에서 장소마다 사진을 넣어요.'}</span>
        </Link>
      )}

      {places.length > 0 && (
        <ol className="timeline">
          {places.map((m) => (
            <li key={m.id}>
              <span className="tl-time">{m.time}</span>
              <span className={`tl-dot${m.photoIds.length ? ' on' : ''}`} />
              <Link to={`/record/m/${m.id}`} className="tl-body">
                <span className="tl-top"><strong>{m.place}</strong><Stars value={m.rating} /></span>
                {m.caption && <span className="tl-caption">{m.caption}</span>}
                {m.photoIds.length > 0 ? (
                  <span className="tl-photos">
                    {m.photoIds.slice(0, 3).map((id) => <Thumb key={id} id={id} className="tl-photo" />)}
                    {m.photoIds.length > 3 && <span className="tl-more">+{m.photoIds.length - 3}</span>}
                  </span>
                ) : (
                  <span className="tl-empty">사진·별점 남기기</span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {album && album.photoIds.length > 0 && (
        <section className="album">
          <Link to={`/record/m/${album.id}`} className="album-head"><h2>그날 사진</h2><span className="muted">{album.photoIds.length}장 · 고치기</span></Link>
          <div className="photo-grid">
            {album.photoIds.map((id) => <Thumb key={id} id={id} className="grid-photo" />)}
          </div>
        </section>
      )}

      {list.length === 0 && <p className="muted empty-note">아직 기록이 없어요. 계획의 장소에 사진을 넣으면 여기에 모여요. 사진만 올려도 찍은 날짜에 맞춰 들어가요.</p>}
      {note && <p className="muted">{note}</p>}

      <div className="record-actions">
        <Link to={newMomentLink(date)} className="btn">계획에 없던 곳</Link>
        <label className="btn">
          사진만 올리기
          <input id="r-photos" type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
