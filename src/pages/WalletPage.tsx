import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { formatShort, todayIso } from '../lib/dates'
import { KEEP_OWN_DAYS, refreshRates } from '../lib/rates'
import { cashBalances, cashFlows, CURRENCIES, formatMoney, krwPerUnit, rateFromExchange } from '../lib/money'
import { useMoney } from '../lib/useData'
import CashBars from '../components/CashBars'
import type { PayKind, Rate } from '../types'

export default function WalletPage() {
  const [rateMsg, setRateMsg] = useState('')
  const navigate = useNavigate()
  const { expenses, methods, exchanges, rates, counts } = useMoney()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PayKind>('card')
  const [cashCur, setCashCur] = useState('USD')
  const [count, setCount] = useState({ amount: '', currency: 'USD' })
  const [ex, setEx] = useState({ fromCurrency: 'USD', fromAmount: '', toCurrency: 'PEN', toAmount: '', place: '' })

  const balances = [...cashBalances(exchanges, expenses, methods, counts).entries()].filter(([, n]) => Math.abs(n) > 0.004)
  const lastCount = (cur: string) => counts.filter((c) => c.currency === cur).sort((a, b) => b.at - a.at)[0]

  async function saveCount() {
    const amount = Number(count.amount)
    if (!count.amount.trim() || !Number.isFinite(amount) || amount < 0) return
    const flowAt = cashFlows(exchanges, expenses, methods).get(count.currency) ?? 0
    await db.cashCounts.add({ id: newId(), tripId: TRIP_ID, date: todayIso(), currency: count.currency, amount, flowAt, at: Date.now() })
    setCount({ ...count, amount: '' })
  }
  const usedCurrencies = [...new Set(['USD', ...expenses.map((e) => e.currency), ...exchanges.map((x) => x.toCurrency)])].filter((c) => c !== 'KRW')

  async function addMethod() {
    if (!name.trim()) return
    await db.payMethods.add({ id: newId(), name: name.trim(), kind, currency: kind === 'cash' ? cashCur : undefined })
    setName('')
  }

  async function addExchange() {
    const fromAmount = Number(ex.fromAmount)
    const toAmount = Number(ex.toAmount)
    if (!fromAmount || !toAmount) return
    const record = { id: newId(), tripId: TRIP_ID, date: todayIso(), ...ex, fromAmount, toAmount }
    await db.transaction('rw', db.exchanges, db.rates, async () => {
      await db.exchanges.add(record)
      // The rate actually received is better than any estimate.
      await db.rates.put({ currency: ex.toCurrency, krwPerUnit: rateFromExchange(record, rates), updated: record.date, source: 'exchange' })
    })
    setEx({ ...ex, fromAmount: '', toAmount: '', place: '' })
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/money')} aria-label="뒤로">←</button>
        <h1>카드·현금·환율</h1>
      </header>

      <section className="card">
        <h2>지금 가진 현금</h2>
        {balances.length > 0 ? (
          <CashBars
            balances={balances}
            rates={rates}
            note={(c) => {
              const last = lastCount(c)
              return last ? `${formatShort(last.date)}에 ${formatMoney(last.amount, c)} 세어봄` : '환전·지출 기록으로 계산'
            }}
            extra={(c) => {
              const n = balances.find(([x]) => x === c)![1]
              return <button className="btn small" onClick={() => setCount({ amount: String(Math.max(0, Math.round(n * 100) / 100)), currency: c })}>고치기</button>
            }}
          />
        ) : (
          <p className="muted">아직 적어둔 현금이 없어요.</p>
        )}
        <div className="inline-form">
          <input id="c-amt" type="number" inputMode="decimal" placeholder="1500" value={count.amount} onChange={(e) => setCount({ ...count, amount: e.target.value })} />
          <select id="c-cur" value={count.currency} onChange={(e) => setCount({ ...count, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn primary" onClick={saveCount}>저장</button>
        </div>
        <p className="muted">한국에서 들고 가는 달러처럼 지금 지갑에 있는 돈을 통화별로 적어두세요. 그다음부터는 환전하거나 현금으로 쓴 만큼 알아서 늘고 줄어요. 여행 중에 세어보고 다시 적으면 그 금액부터 새로 계산해요.</p>
        {balances.some(([, n]) => n < 0) && (
          <p className="muted">마이너스인 통화는 들고 있던 현금이 빠져 있어서 그래요. 위에서 지금 가진 금액을 적어주세요.</p>
        )}
      </section>

      <section className="card">
        <h2>결제수단</h2>
        <ul className="plain-list">
          {methods.filter((m) => m.id !== 'cash').map((m) => (
            <li key={m.id}>
              <span>{m.kind === 'cash' ? '💵' : '💳'} {m.name}{m.currency ? ` (${m.currency})` : ''}</span>
              <button className="btn small" onClick={() => db.payMethods.delete(m.id)}>삭제</button>
            </li>
          ))}
        </ul>
        <div className="chips">
          <button className={kind === 'card' ? 'chip active' : 'chip'} onClick={() => setKind('card')}>카드</button>
          <button className={kind === 'cash' ? 'chip active' : 'chip'} onClick={() => setKind('cash')}>현금</button>
        </div>
        <div className="inline-form">
          <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'card' ? '트래블월렛 VISA' : '현금 지갑'} />
          {kind === 'cash' && (
            <select id="w-cur" value={cashCur} onChange={(e) => setCashCur(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button className="btn" onClick={addMethod}>추가</button>
        </div>
        <p className="muted">카드 번호는 저장하지 않아요. 알아볼 수 있는 이름만 적어주세요.</p>
      </section>

      <section className="card">
        <h2>환전</h2>
        <div className="inline-form exchange-form">
          <div className="pair">
          <input id="x-from-amt" type="number" inputMode="decimal" placeholder="200" value={ex.fromAmount} onChange={(e) => setEx({ ...ex, fromAmount: e.target.value })} />
          <select id="x-from-cur" value={ex.fromCurrency} onChange={(e) => setEx({ ...ex, fromCurrency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          </div>
          <span>→</span>
          <div className="pair">
          <input id="x-to-amt" type="number" inputMode="decimal" placeholder="740" value={ex.toAmount} onChange={(e) => setEx({ ...ex, toAmount: e.target.value })} />
          <select id="x-to-cur" value={ex.toCurrency} onChange={(e) => setEx({ ...ex, toCurrency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          </div>
        </div>
        <div className="inline-form">
          <input id="x-place" value={ex.place} onChange={(e) => setEx({ ...ex, place: e.target.value })} placeholder="환전한 곳 (리마 미라플로레스 환전소)" />
          <button className="btn" onClick={addExchange}>환전 기록</button>
        </div>
        <ul className="plain-list">
          {exchanges.map((x) => (
            <li key={x.id}>
              <span>{formatShort(x.date)} · {formatMoney(x.fromAmount, x.fromCurrency)} → {formatMoney(x.toAmount, x.toCurrency)}{x.place ? ` · ${x.place}` : ''}</span>
              <button className="btn small" onClick={() => db.exchanges.delete(x.id)}>삭제</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="ds-head">
          <h2>환율 (1단위 = 원)</h2>
          <button className="btn small" onClick={async () => setRateMsg((await refreshRates(true)) ? '오늘 환율로 바꿨어요.' : '지금은 환율을 받아오지 못했어요.')}>새로 받기</button>
        </div>
        {rateMsg && <p className="muted" role="status">{rateMsg}</p>}
        <p className="muted">인터넷이 되면 하루 한 번 환율을 새로 받아와요. 환전을 기록하거나 직접 고친 값은 {KEEP_OWN_DAYS}일 동안 그대로 쓰고, 그 뒤엔 다시 자동 환율로 돌아가요.</p>
        <ul className="plain-list">
          {usedCurrencies.map((c) => (
            <li key={c}>
              <span>{c} <span className="muted rate-src">{rateNote(rates.find((r) => r.currency === c))}</span></span>
              <input
                id={`rate-${c}`} className="rate-input" type="number" inputMode="decimal"
                key={krwPerUnit(c, rates)} defaultValue={Math.round(krwPerUnit(c, rates) * 100) / 100}
                onBlur={(e) => Number(e.target.value) > 0 && db.rates.put({ currency: c, krwPerUnit: Number(e.target.value), updated: todayIso(), source: 'manual' })}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function rateNote(r: Rate | undefined): string {
  if (!r) return '추정치'
  const when = formatShort(r.updated)
  if (r.source === 'auto') return `자동 · ${when}`
  if (r.source === 'exchange') return `환전 · ${when}`
  return `직접 · ${when}`
}
