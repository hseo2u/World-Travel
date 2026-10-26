import { describe, expect, it } from 'vitest'
import gps from './fixtures/gps.jpg?inline'
import timeOnly from './fixtures/time-only.jpg?inline'
import { readExif } from './exif'

const blob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

describe('readExif', () => {
  it('reads capture time and southern/western GPS', async () => {
    const meta = await readExif(await blob(gps))
    expect(meta.taken).toBe('2027-02-14T05:20')
    expect(meta.lat).toBeCloseTo(-20.1338, 3)
    expect(meta.lng).toBeCloseTo(-67.4891, 3)
  })

  it('leaves position out when the photo has none', async () => {
    expect(await readExif(await blob(timeOnly))).toEqual({ taken: '2027-02-14T09:40' })
  })

  it('returns nothing for a file that is not a JPEG', async () => {
    expect(await readExif(new Blob(['not an image']))).toEqual({})
  })
})
