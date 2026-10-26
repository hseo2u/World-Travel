import { useState } from 'react'

/**
 * Edits stay on screen until the user presses save. Until the first change the
 * draft simply mirrors the saved value; `key` starts a fresh draft (another record).
 */
export function useDraft<T extends object>(saved: T | undefined, key: string) {
  const [state, setState] = useState<{ key: string; value: T } | null>(null)
  const mine = state?.key === key ? state.value : undefined
  const draft = mine ?? saved
  const dirty = mine !== undefined && JSON.stringify(mine) !== JSON.stringify(saved)
  const set = (patch: Partial<T>) => setState({ key, value: { ...(draft as T), ...patch } })
  const reset = () => setState(null)
  return { draft, set, dirty, reset }
}
