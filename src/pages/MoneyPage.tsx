import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cashBalances, CATEGORY_ICON, CATEGORY_LABEL, formatKrw, formatMoney, summarize } from '../lib/money'
import { formatShort, todayIso } from '../lib/dates'
import { useMoney } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import SpendSummaryCard from '../components/SpendSummaryCard'
import SpendDonut from '../components/SpendDonut'
import SpendCalendar from '../components/SpendCalendar'
import SpendPeriod from '../components/SpendPeriod'
import CashBars from '../components/CashBars'
import { byCategory, byCountry } from '../lib/stats'

export default function MoneyPage() {
  const { trip, days, loading } = useTrip()
  const { expenses, methods, exchanges, counts, rates } = useMoney()
  const [split, setSplit] = useState<'category' | 'country' | 'period'>('category')
  const [picked, setPicked] = useState(todayIso)
  const [month, setMonth] = useState(() => todayIso().slice(0, 7))
  if (loading || !trip) return null

  const summary = summarize(trip, expenses, todayIso(), days.length)
  const methodName = new Map(methods.map((m) => [m.id, m.name]))
  const list = expenses.filter((e) => e.date === picked)
  const cash = [...cashBalances(exchanges, expenses, methods, counts).entries()].filter(([, n]) => Math.abs(n) > 0.004)

  return (
    <div className="page">
      <header className="page-head">
        <h1>가계부</h1>
        <Link to="/money/wallet" className="btn small">카드·현금·환율</Link>
      </header>

      <SpendSummaryCard trip={trip} summary={summary} />

      <Link to="/money/wallet" className="card link-card cash-card">
        <div className="eyebrow">지갑 현금</div>
        {cash.length > 0 ? <CashBars balances={cash} rates={rates} /> : <span>가진 현금 적어두기 ›</span>}
      </Link>

      <Link to="/money/new" className="btn primary wide">+ 지출 기록</Link>

      {(expenses.length > 0 || exchanges.length > 0) && (
        <section className="card donut-card">
          <div className="ds-head">
            <h2>어디에 썼나</h2>
            <div className="seg" role="tablist">
              <button role="tab" aria-selected={split === 'category'} className={split === 'category' ? 'on' : ''} onClick={() => setSplit('category')}>항목별</button>
              <button role="tab" aria-selected={split === 'country'} className={split === 'country' ? 'on' : ''} onClick={() => setSplit('country')}>나라별</button>
              <button role="tab" aria-selected={split === 'period'} className={split === 'period' ? 'on' : ''} onClick={() => setSplit('period')}>기간별</button>
            </div>
          </div>
          {split === 'period'
            ? <SpendPeriod trip={trip} expenses={expenses} exchanges={exchanges} />
            : <SpendDonut key={split} slices={split === 'category' ? byCategory(expenses) : byCountry(expenses, trip, days)} />}
        </section>
      )}

      <SpendCalendar expenses={expenses} month={month} selected={picked} onMonth={setMonth} onSelect={setPicked} />

      <section className="expense-day">
        <div className="country-head">
          {formatShort(picked)} {picked < trip.startDate ? '· 여행 전' : ''}
          <span className="muted"> · {formatKrw(list.reduce((n, e) => n + e.krw, 0))}</span>
        </div>
        {list.length > 0 ? (
          <ul className="expense-list">
            {list.map((e) => (
              <li key={e.id}>
                <Link to={`/money/${e.id}`} className="expense-row">
                  <span className="expense-icon">{CATEGORY_ICON[e.category]}</span>
                  <span className="expense-body">
                    <strong>{e.memo || CATEGORY_LABEL[e.category]}</strong>
                    <span className="muted">{methodName.get(e.payMethodId) ?? '결제수단 없음'}</span>
                  </span>
                  <span className="expense-amt">
                    <strong>{formatMoney(e.amount, e.currency)}</strong>
                    {e.currency !== 'KRW' && <span className="muted">{formatKrw(e.krw)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">이 날은 기록한 지출이 없어요. <Link to={`/money/new?date=${picked}`}>이 날짜로 기록하기</Link></p>
        )}
      </section>
      {expenses.length === 0 && <p className="muted">아직 기록한 지출이 없어요. 항공권이나 보험처럼 여행 전에 쓴 돈부터 넣어보세요.</p>}
    </div>
  )
}
