import { useState } from 'react'
import { formatKrw } from '../lib/money'
import type { Slice } from '../lib/stats'

const R = 52
const C = 2 * Math.PI * R
// Each slice gives up this much arc so neighbours sit apart on the card colour.
const GAP = 2

/** A donut of where the money went, with a list that doubles as legend and table. */
export default function SpendDonut({ slices }: { slices: Slice[] }) {
  const [on, setOn] = useState('')
  const total = slices.reduce((n, s) => n + s.krw, 0)
  if (!total) return null
  const picked = slices.find((s) => s.key === on)
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((n, s) => n + (s.krw / total) * C, 0))
  return (
    <div className="donut-wrap">
      <div className="donut" onPointerLeave={() => setOn('')}>
        <svg viewBox="0 0 140 140" role="img" aria-label={slices.map((s) => `${s.label} ${pct(s.krw, total)}`).join(', ')}>
          {slices.map((s, i) => {
            const len = (s.krw / total) * C
            const dash = slices.length > 1 ? Math.max(len - GAP, 0.5) : len
            return (
              <circle
                key={s.key} className={`seg${on === s.key ? ' on' : ''}`} cx="70" cy="70" r={R}
                stroke={`var(--s${s.slot})`} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-starts[i]}
                onPointerEnter={() => setOn(s.key)} onClick={() => setOn(on === s.key ? '' : s.key)}
              />
            )
          })}
        </svg>
        <div className="donut-center">
          <strong>{formatKrw(picked?.krw ?? total)}</strong>
          <span>{picked ? `${picked.label} · ${pct(picked.krw, total)}` : '합계'}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((s) => (
          <li key={s.key}>
            <button className={on === s.key ? 'on' : ''} onClick={() => setOn(on === s.key ? '' : s.key)}>
              <i style={{ background: `var(--s${s.slot})` }} />
              <span className="lbl">{s.label}</span>
              <span className="val"><b>{pct(s.krw, total)}</b>{formatKrw(s.krw)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function pct(n: number, total: number) {
  const p = (n / total) * 100
  return p < 1 ? '1% 미만' : `${Math.round(p)}%`
}
