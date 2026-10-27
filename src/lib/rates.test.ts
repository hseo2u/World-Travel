import { describe, expect, it } from 'vitest'
import { ratesToWrite } from './rates'

describe('ratesToWrite', () => {
  const feed = { USD: 1 / 1400, PEN: 1 / 375, KRW: 1 }

  it('fills in rates the traveller never set', () => {
    const out = ratesToWrite(feed, [], '2027-01-12')
    expect(out.find((r) => r.currency === 'USD')).toEqual({ currency: 'USD', krwPerUnit: 1400, updated: '2027-01-12', source: 'auto' })
    expect(out.some((r) => r.currency === 'KRW')).toBe(false)
  })

  it('keeps a recent exchange rate and replaces it after 30 days', () => {
    const own = [{ currency: 'PEN', krwPerUnit: 380, updated: '2027-01-10', source: 'exchange' as const }]
    expect(ratesToWrite(feed, own, '2027-01-20').some((r) => r.currency === 'PEN')).toBe(false)
    expect(ratesToWrite(feed, own, '2027-02-15').find((r) => r.currency === 'PEN')?.krwPerUnit).toBe(375)
  })

  it('treats an old rate saved before sources existed as the traveller’s own', () => {
    const own = [{ currency: 'USD', krwPerUnit: 1350, updated: '2027-01-01' }]
    expect(ratesToWrite(feed, own, '2027-01-05').some((r) => r.currency === 'USD')).toBe(false)
  })
})
