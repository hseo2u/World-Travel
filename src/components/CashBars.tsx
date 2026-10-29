import type { ReactNode } from 'react'
import { formatKrw, formatMoney, krwPerUnit } from '../lib/money'
import type { Rate } from '../types'

interface Props {
  balances: [string, number][]
  rates: Rate[]
  /** Something to put at the end of each row, such as a fix button */
  extra?: (currency: string) => ReactNode
  note?: (currency: string) => ReactNode
}

/** Cash per currency as bars, sized by what each is worth in won so they compare at a glance. */
export default function CashBars({ balances, rates, extra, note }: Props) {
  const rows = balances
    .map(([c, n]) => ({ c, n: Math.round(n * 100) / 100, krw: n * krwPerUnit(c, rates) }))
    .sort((a, b) => b.krw - a.krw)
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.krw)))
  const total = rows.reduce((s, r) => s + r.krw, 0)
  return (
    <div className="cash-bars">
      <div className="cash-total"><span className="muted">합치면 약</span> <strong>{formatKrw(total)}</strong></div>
      <ul>
        {rows.map((r) => (
          <li key={r.c} className="cash-bar-row">
            <span className="cash-cur">{r.c}</span>
            <span className="cash-bar-main">
              <span className="cash-bar-top">
                <strong className={r.n < 0 ? 'over' : ''}>{formatMoney(r.n, r.c)}</strong>
                {r.c !== 'KRW' && <span className="muted">≈ {formatKrw(r.krw)}</span>}
              </span>
              <span className="bar"><i className={r.n < 0 ? 'over' : ''} style={{ width: `${(Math.abs(r.krw) / max) * 100}%` }} /></span>
              {note && <span className="muted cash-note">{note(r.c)}</span>}
            </span>
            {extra?.(r.c)}
          </li>
        ))}
      </ul>
    </div>
  )
}
