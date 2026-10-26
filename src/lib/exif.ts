export interface PhotoMeta {
  /** 'YYYY-MM-DDTHH:mm' in the camera's local time */
  taken?: string
  lat?: number
  lng?: number
}

/**
 * Reads the capture time and GPS position from a JPEG's EXIF block.
 * Anything it cannot read is left out; other formats return {}.
 */
export async function readExif(file: Blob): Promise<PhotoMeta> {
  const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
  if (buf.byteLength < 4 || buf.getUint16(0) !== 0xffd8) return {}
  let p = 2
  while (p + 4 < buf.byteLength) {
    const marker = buf.getUint16(p)
    const size = buf.getUint16(p + 2)
    if (marker === 0xffe1 && buf.getUint32(p + 4) === 0x45786966) return parseTiff(buf, p + 10)
    if ((marker & 0xff00) !== 0xff00) break
    p += 2 + size
  }
  return {}
}

function parseTiff(v: DataView, base: number): PhotoMeta {
  const little = v.getUint16(base) === 0x4949
  const u16 = (o: number) => v.getUint16(base + o, little)
  const u32 = (o: number) => v.getUint32(base + o, little)
  const entries = (ifd: number) => {
    const out = new Map<number, { type: number; count: number; at: number }>()
    if (base + ifd + 2 > v.byteLength) return out
    const n = u16(ifd)
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12
      if (base + e + 12 > v.byteLength) break
      const type = u16(e + 2)
      const count = u32(e + 4)
      const bytes = count * ({ 2: 1, 3: 2, 4: 4, 5: 8 }[type] ?? 1)
      out.set(u16(e), { type, count, at: bytes > 4 ? u32(e + 8) : e + 8 })
    }
    return out
  }
  const ascii = (t?: { count: number; at: number }) => {
    if (!t) return undefined
    let s = ''
    for (let i = 0; i < t.count - 1 && base + t.at + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(base + t.at + i))
    return s
  }
  const degrees = (t?: { at: number }) => {
    if (!t || base + t.at + 24 > v.byteLength) return undefined
    const r = (i: number) => u32(t.at + i * 8) / (u32(t.at + i * 8 + 4) || 1)
    return r(0) + r(1) / 60 + r(2) / 3600
  }

  const ifd0 = entries(u32(4))
  const meta: PhotoMeta = {}
  const exifPtr = ifd0.get(0x8769)
  if (exifPtr) {
    const exif = entries(u32(exifPtr.at))
    // "2027:01:14 18:42:07"
    const m = ascii(exif.get(0x9003) ?? exif.get(0x9004))?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/)
    if (m) meta.taken = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`
  }
  const gpsPtr = ifd0.get(0x8825)
  if (gpsPtr) {
    const gps = entries(u32(gpsPtr.at))
    const lat = degrees(gps.get(2))
    const lng = degrees(gps.get(4))
    if (lat !== undefined && lng !== undefined && (lat || lng)) {
      meta.lat = ascii(gps.get(1)) === 'S' ? -lat : lat
      meta.lng = ascii(gps.get(3)) === 'W' ? -lng : lng
    }
  }
  return meta
}
