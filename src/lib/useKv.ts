import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** A small record in the kv table, with a setter that merges one field at a time. */
export function useKv(key: string): [Record<string, string>, (field: string, value: string) => void] {
  const value = useLiveQuery(() => db.kv.get(key).then((r) => r?.value ?? {}), [key], {})
  const set = (field: string, v: string) =>
    void db.transaction('rw', db.kv, async () => {
      const cur = (await db.kv.get(key))?.value ?? {}
      await db.kv.put({ key, value: { ...cur, [field]: v } })
    })
  return [value, set]
}
