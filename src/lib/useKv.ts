import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** A small record in the kv table. Pages edit a draft of it and put the whole record on save. */
export function useKv(key: string): Record<string, string> {
  return useLiveQuery(() => db.kv.get(key).then((r) => r?.value ?? {}), [key], {})
}
