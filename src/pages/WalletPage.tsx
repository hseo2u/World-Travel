import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { formatShort, todayIso } from '../lib/dates'
import { KEEP_OWN_DAYS, refreshRates } from '../lib/rates'
import { cashBalances, CURRENCIES, formatMoney, krwPerUnit, rateFromExchange } from '../lib/money'
import { useMoney } from '../lib/useData'
import type { PayKind, Rate } from '../types'

export default function WalletPage() {
  const [rateMsg, setRateMsg] = useState('')
  const navigate = useNavigate()
  const { expenses, methods, exchanges, rates } = useMoney()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PayKind>('card')
  const [cashCur, setCashCur] = useState('USD')
  const [ex, setEx] = useState({ fromCurrency: 'USD', fromAmount: '', toCurrency: 'PEN', toAmount: '', place: '' })

  const balances = [...cashBalances(exchanges, expenses, methods).entries()].filter(([, n]) => Math.abs(n) > 0.004)
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
        <h2>결제수단</h2>
        <ul className="plain-list">
          {methods.map((m) => (
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
        {balances.length > 0 && (
          <div className="balances">
            <span className="muted">현금 잔액</span>
            {balances.map(([c, n]) => <strong key={c} className={n < 0 ? 'over' : ''}>{formatMoney(Math.round(n * 100) / 100, c)}</strong>)}
          </div>
        )}
        {balances.some(([, n]) => n < 0) && (
          <p className="muted">잔액이 마이너스인 통화는 처음 들고 간 현금이 빠져 있어서 그래요. 한국에서 바꾼 달러도 KRW → USD 환전으로 기록해 주세요.</p>
        )}
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
