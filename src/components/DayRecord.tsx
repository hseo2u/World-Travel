import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { formatShort } from '../lib/dates'
import { savePhotos } from '../lib/photos'
import { fileIntoAlbums, whereOn } from '../lib/records'
import { newMomentLink, useMoments } from '../lib/useRecords'
import { useStops } from '../lib/useStops'
import { useTrip } from '../lib/useTrip'
import type { Day } from '../types'
import Thumb from './Thumb'

/** The rest of the day's record on its plan page: loose photos and places that were never planned. */
export default function DayRecord({ day, date }: { day: Day; date: string }) {
  const { trip, days } = useTrip()
  const moments = useMoments()
  const stops = useStops(day.id)
  const [note, setNote] = useState('')
  if (!trip) return null
  const todays = moments.filter((m) => m.date === date)
  const album = todays.find((m) => !m.place)
  const unplanned = todays.filter((m) => m.place && !m.stopId && !stops.some((s) => s.name === m.place))

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const photos = await savePhotos(files, date)
    const saved = fileIntoAlbums(photos, moments, (d) => whereOn(trip!, days, d))
    await db.moments.bulkPut(saved)
    const elsewhere = saved.filter((m) => m.date !== date).map((m) => formatShort(m.date))
    setNote(elsewhere.length ? `찍은 날짜에 맞춰 ${elsewhere.join(', ')}에도 넣었어요.` : '')
  }

  return (
    <section className="card day-record">
      <div className="ds-head">
        <h2>그날 사진</h2>
        {album && <Link className="btn small" to={`/record/m/${album.id}`}>고치기</Link>}
      </div>
      {album && album.photoIds.length > 0 ? (
        <div className="photo-grid">
          {album.photoIds.map((id) => <Thumb key={id} id={id} className="grid-photo" />)}
        </div>
      ) : (
        <p className="muted">장소마다 넣기 애매한 사진은 여기에 모아요. 찍은 날짜에 맞춰 들어가요.</p>
      )}
      {unplanned.length > 0 && (
        <ul className="plain-list">
          {unplanned.map((m) => (
            <li key={m.id}><Link to={`/record/m/${m.id}`}>📍 {m.place}{m.photoIds.length ? ` · 사진 ${m.photoIds.length}장` : ''}</Link></li>
          ))}
        </ul>
      )}
      {note && <p className="muted">{note}</p>}
      <div className="btn-row">
        <label className="btn">
          사진 올리기
          <input id="d-photos" type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        </label>
        <Link className="btn" to={newMomentLink(date)}>계획에 없던 곳 기록</Link>
      </div>
    </section>
  )
}
