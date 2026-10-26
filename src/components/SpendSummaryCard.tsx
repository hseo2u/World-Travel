import { formatKrw, type SpendSummary } from '../lib/money'
import type { Trip } from '../types'

export default function SpendSummaryCard({ trip, summary, compact = false }: { trip: Trip; summary: SpendSummary; compact?: boolean }) {
  const used = trip.budgetKrw ? summary.totalKrw / trip.budgetKrw : 0
  const left = trip.budgetKrw - summary.totalKrw
  return (
    <section className="card spend">
      <div className="spend-top">
        <div>
          <div className="eyebrow">지금까지 쓴 돈</div>
          <div className="spend-big">{formatKrw(summary.totalKrw)}</div>
        </div>
        <div className="spend-left">
          <div className="muted">예산 {formatKrw(trip.budgetKrw)}</div>
          <strong className={left < 0 ? 'over' : ''}>{left < 0 ? `${formatKrw(-left)} 초과` : `${formatKrw(left)} 남음`}</strong>
        </div>
      </div>
      <div className="bar big"><i className={used > 1 ? 'over' : ''} style={{ width: `${Math.min(used, 1) * 100}%` }} /></div>
      <div className="spend-stats">
        <span>여행 전 {formatKrw(summary.beforeKrw)}</span>
        <span>여행 중 {formatKrw(summary.duringKrw)}</span>
        {!compact && summary.perDayKrw > 0 && <span>하루 평균 {formatKrw(summary.perDayKrw)}</span>}
        {summary.todayKrw > 0 && <span>오늘 {formatKrw(summary.todayKrw)}</span>}
      </div>
    </section>
  )
}
