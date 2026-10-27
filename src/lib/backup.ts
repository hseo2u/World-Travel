import { db } from '../db'

// Everything the app keeps, in one file. Photos and documents are Blobs in
// IndexedDB, so they travel as base64 inside the JSON.
const APP = 'world-travel'
const FORMAT = 1

interface BlobJson {
  __blob: string
  type: string
}

export interface BackupFile {
  app: typeof APP
  format: number
  created: string
  tables: Record<string, unknown[]>
}

export interface BackupSummary {
  created: string
  counts: Record<string, number>
}

export const BACKUP_KV = 'backup'

export async function makeBackup(): Promise<Blob> {
  const tables: Record<string, unknown[]> = {}
  for (const t of db.tables) tables[t.name] = await Promise.all((await t.toArray()).map(encode))
  const file: BackupFile = { app: APP, format: FORMAT, created: new Date().toISOString(), tables }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export async function readBackup(file: Blob): Promise<BackupFile> {
  let data: BackupFile
  try {
    data = JSON.parse(await file.text()) as BackupFile
  } catch {
    throw new Error('백업 파일을 읽을 수 없어요. 이 앱에서 만든 .json 파일인지 확인해 주세요.')
  }
  if (data?.app !== APP || typeof data.tables !== 'object') throw new Error('이 앱의 백업 파일이 아니에요.')
  if (data.format > FORMAT) throw new Error('더 새 버전의 앱에서 만든 백업이에요. 앱을 새로고침한 뒤 다시 해보세요.')
  return data
}

export function summarize(data: BackupFile): BackupSummary {
  return { created: data.created, counts: Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.length])) }
}

/** Replaces everything on this phone with the backup. */
export async function restoreBackup(data: BackupFile): Promise<void> {
  const known = db.tables.filter((t) => t.name in data.tables)
  const rows = new Map<string, unknown[]>()
  for (const t of known) rows.set(t.name, data.tables[t.name].map(decode))
  await db.transaction('rw', known, async () => {
    for (const t of known) {
      await t.clear()
      await t.bulkPut(rows.get(t.name)!)
    }
  })
}

async function encode(row: unknown): Promise<unknown> {
  if (row instanceof Blob) return { __blob: await toBase64(row), type: row.type } satisfies BlobJson
  if (Array.isArray(row)) return Promise.all(row.map(encode))
  if (row && typeof row === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) out[k] = await encode(v)
    return out
  }
  return row
}

function decode(row: unknown): unknown {
  if (Array.isArray(row)) return row.map(decode)
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>
    if (typeof o.__blob === 'string' && typeof o.type === 'string') return fromBase64(o.__blob, o.type)
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, decode(v)]))
  }
  return row
}

async function toBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(s: string, type: string): Blob {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Days since the last backup, or undefined if there never was one. */
export function daysSince(iso: string | undefined, now = Date.now()): number | undefined {
  if (!iso) return undefined
  return Math.floor((now - Date.parse(iso)) / 86_400_000)
}
