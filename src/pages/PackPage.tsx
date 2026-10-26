import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, TRIP_ID } from '../db'
import { ensurePackList, groupPack, ON_TRIP_GROUP, PACK_TEMPLATE } from '../lib/pack'
import type { PackItem } from '../types'

export default function PackPage() {
  const navigate = useNavigate()
  const items = useLiveQuery(() => db.packItems.where('tripId').equals(TRIP_ID).toArray(), [], [] as PackItem[])
  const [name, setName] = useState('')
  const [group, setGroup] = useState(ON_TRIP_GROUP)
  const [editing, setEditing] = useState(false)
  useEffect(() => void ensurePackList(), [])

  const done = items.filter((i) => i.done).length
  const groups = groupPack(items)
  const groupNames = [ON_TRIP_GROUP, ...new Set([...Object.keys(PACK_TEMPLATE), ...items.filter((i) => !i.onTrip).map((i) => i.group)])]

  async function add() {
    if (!name.trim()) return
    const onTrip = group === ON_TRIP_GROUP
    await db.packItems.add({ id: newId(), tripId: TRIP_ID, group, name: name.trim(), done: false, onTrip, created: new Date().toISOString() })
    setName('')
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">←</button>
        <h1>준비물</h1>
        <button className="btn small" onClick={() => setEditing(!editing)}>{editing ? '완료' : '편집'}</button>
      </header>

      <section className="card pack-progress">
        <div className="spend-top">
          <div>
            <div className="eyebrow">챙긴 것</div>
            <div className="spend-big">{done}<span className="muted"> / {items.length}</span></div>
          </div>
        </div>
        <div className="bar big"><i style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
      </section>

      <section className="card">
        <h2>추가하기</h2>
        <div className="inline-form">
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="여행 중에 필요해진 것 (예: 우비)" />
          <select id="p-group" value={group} onChange={(e) => setGroup(e.target.value)}>
            {groupNames.map((g) => <option key={g} value={g}>{g === ON_TRIP_GROUP ? '여행 중 필요' : g}</option>)}
          </select>
          <button className="btn" onClick={add}>추가</button>
        </div>
        <p className="muted">여행 중에 필요해진 물건은 산 다음 가계부에 "필요물품 구매"로 바로 넣을 수 있어요.</p>
      </section>

      {groups.map(([g, list]) => (
        <section key={g} className="pack-group">
          <h2>{g === ON_TRIP_GROUP ? '🛒 ' : ''}{g} <span className="muted">{list.filter((i) => i.done).length}/{list.length}</span></h2>
          {list.length === 0 && <p className="muted">아직 없어요. 현지에서 필요한 게 생기면 위에서 추가하세요.</p>}
          <ul className="booking-list">
            {list.map((it) => (
              <li key={it.id} className={`booking-row${it.done ? ' booked' : ''}`}>
                <button
                  className={`check-btn${it.done ? ' on' : ''}`}
                  aria-label={it.done ? '체크 해제' : '챙김으로 체크'}
                  onClick={() => db.packItems.update(it.id, { done: !it.done })}
                >
                  {it.done ? '✓' : ''}
                </button>
                <span className="booking-body booking-title">{it.name}</span>
                {it.onTrip && it.done && !editing && (
                  <Link className="btn small" to={`/money/new?category=supplies&memo=${encodeURIComponent(it.name)}`}>가계부에</Link>
                )}
                {editing && <button className="btn small" onClick={() => db.packItems.delete(it.id)}>삭제</button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
