import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { dayDate, todayIso } from '../lib/dates'
import { CATEGORY_ICON, CATEGORY_LABEL, CURRENCIES, currencyOf, formatKrw, krwPerUnit } from '../lib/money'
import { useMoney } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import type { Expense, ExpenseCategory } from '../types'
import { useLeaveGuard } from '../components/useLeaveGuard'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ExpenseCategory[]

export default function ExpensePage() {
  const { expenseId } = useParams()
  const isNew = expenseId === 'new'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { trip, days, loading } = useTrip()
  const { expenses, methods, rates } = useMoney()
  const [draft, setDraft] = useState<Expense | undefined>()
  const [start, setStart] = useState<Expense | undefined>()
  const leave = useLeaveGuard(!!draft && JSON.stringify(draft) !== JSON.stringify(start))
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (loading || !trip || draft) return
    if (!isNew) {
      void db.expenses.get(expenseId ?? '').then((e) => {
        if (!e) return
        setDraft(e)
        setStart(e)
      })
      return
    }
    const today = todayIso()
    const todayDay = days.find((d) => dayDate(trip.startDate, d.order) === today)
    const last = expenses[0]
    // The packing list links here with the item already filled in.
    const category = params.get('category')
    const fresh: Expense = {
      id: newId(), tripId: TRIP_ID, date: today, amount: 0,
      currency: (todayDay && currencyOf(todayDay.country)) ?? last?.currency ?? 'KRW',
      krw: 0, category: category && category in CATEGORY_LABEL ? (category as ExpenseCategory) : 'food',
      payMethodId: last?.payMethodId ?? methods[0]?.id ?? '', memo: params.get('memo') ?? '',
    }
    setDraft(fresh)
    setStart(fresh)
  }, [loading, trip, isNew, expenseId, draft, days, expenses, methods, params])

  if (loading || !trip || !draft) return null
  const rate = krwPerUnit(draft.currency, rates)
  const set = (patch: Partial<Expense>) => setDraft({ ...draft, ...patch })

  async function save() {
    if (!draft || !draft.amount) return
    // A changed amount or currency is priced again; an untouched one keeps the rate it was entered at.
    const old = isNew ? undefined : await db.expenses.get(draft.id)
    const repriced = !old || old.amount !== draft.amount || old.currency !== draft.currency
    await db.expenses.put({ ...draft, krw: repriced ? Math.round(draft.amount * rate) : old.krw })
    leave.release()
    navigate('/money')
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    await db.expenses.delete(draft!.id)
    leave.release()
    navigate('/money')
  }

  return (
    <div className="page">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/money')} aria-label="뒤로">←</button>
        <h1>{isNew ? '지출 기록' : '지출 수정'}</h1>
      </header>

      <div className="amount-row">
        <input
          id="x-amount" className="amount-input" type="number" inputMode="decimal" placeholder="0" autoFocus={isNew}
          value={draft.amount || ''} onChange={(e) => set({ amount: Number(e.target.value) || 0 })}
        />
        <select id="x-cur" value={draft.currency} onChange={(e) => set({ currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {draft.currency !== 'KRW' && draft.amount > 0 && (
        <p className="muted">약 {formatKrw(draft.amount * rate)} (1 {draft.currency} = {rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원)</p>
      )}

      <div className="field">
        <span>카테고리</span>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className={draft.category === c ? 'chip active' : 'chip'} onClick={() => set({ category: c })}>
              {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>결제수단</span>
        <div className="chips">
          {methods.map((m) => (
            <button key={m.id} className={draft.payMethodId === m.id ? 'chip active' : 'chip'} onClick={() => set({ payMethodId: m.id })}>
              {m.kind === 'cash' ? '💵' : '💳'} {m.name}
            </button>
          ))}
          <Link to="/money/wallet" className="chip">+ 카드·현금 등록</Link>
        </div>
      </div>

      <label className="field"><span>날짜</span><input id="x-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} /></label>
      <label className="field"><span>메모</span><input id="x-memo" value={draft.memo} onChange={(e) => set({ memo: e.target.value })} placeholder="세비체, 호스텔 2박" /></label>

      <button className="btn primary wide" disabled={!draft.amount} onClick={save}>저장</button>
      {!isNew && <button className="btn danger" onClick={remove}>{confirmDelete ? '정말 삭제' : '삭제'}</button>}
    </div>
  )
}
