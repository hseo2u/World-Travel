import { db } from '../db'
import { daysBetween, todayIso } from './dates'
import { CURRENCIES } from './money'
import type { Rate } from '../types'

// A free, keyless feed with every currency on the route (PEN, BOB, ARS, MAD …).
const FEED = 'https://open.er-api.com/v6/latest/KRW'
const KV = 'rates-auto'
/** A rate from a real exchange or typed in by hand is trusted this long before the feed replaces it. */
export const KEEP_OWN_DAYS = 30

/**
 * Which stored rates the feed should replace: its own, and the traveller's once they are
 * older than KEEP_OWN_DAYS. `perKrw` is the feed's "units per 1 KRW".
 */
export function ratesToWrite(perKrw: Record<string, number>, stored: Rate[], today: string): Rate[] {
  const byCur = new Map(stored.map((r) => [r.currency, r]))
  return CURRENCIES.flatMap((c) => {
    const v = perKrw[c]
    if (c === 'KRW' || !v) return []
    const own = byCur.get(c)
    if (own && own.source !== 'auto' && daysBetween(own.updated, today) < KEEP_OWN_DAYS) return []
    return [{ currency: c, krwPerUnit: Math.round((1 / v) * 10000) / 10000, updated: today, source: 'auto' as const }]
  })
}

/** Fetches today's rates at most once a day, when online. Failures are quiet: the old rates stay. */
export async function refreshRates(force = false): Promise<boolean> {
  if (!navigator.onLine) return false
  const today = todayIso()
  const last = (await db.kv.get(KV))?.value.at
  if (!force && last === today) return false
  try {
    const res = await fetch(FEED)
    if (!res.ok) return false
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> }
    if (body.result !== 'success' || !body.rates) return false
    const write = ratesToWrite(body.rates, await db.rates.toArray(), today)
    await db.transaction('rw', db.rates, db.kv, async () => {
      await db.rates.bulkPut(write)
      await db.kv.put({ key: KV, value: { at: today } })
    })
    return true
  } catch {
    return false
  }
}
