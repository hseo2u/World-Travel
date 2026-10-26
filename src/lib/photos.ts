import { db, newId } from '../db'
import { readExif } from './exif'
import type { Photo } from '../types'

async function resize(file: Blob, max: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', quality))
}

function localStamp(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
  return d.toISOString().slice(0, 16)
}

function fallback(stamp: string, date?: string): string {
  return date ? `${date}T${stamp.slice(11)}` : stamp
}

/**
 * Saves picked photos, shrunk so months of them fit on a phone.
 * The capture time comes from the photo; without one, from `fallbackDate` (the day being viewed) or the file's date.
 */
export async function savePhotos(files: FileList | File[], fallbackDate?: string): Promise<Photo[]> {
  // Ask once so iOS keeps the photos instead of clearing site data.
  void navigator.storage?.persist?.()
  const out: Photo[] = []
  for (const f of [...files]) {
    if (!f.type.startsWith('image/')) continue
    const meta = await readExif(f)
    const photo: Photo = {
      id: newId(),
      blob: await resize(f, 1600, 0.85),
      thumb: await resize(f, 480, 0.8),
      taken: meta.taken ?? fallback(localStamp(f.lastModified || Date.now()), fallbackDate),
      lat: meta.lat,
      lng: meta.lng,
    }
    await db.photos.add(photo)
    out.push(photo)
  }
  return out
}
