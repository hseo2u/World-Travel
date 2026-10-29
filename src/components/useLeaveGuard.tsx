import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Holds the user back from leaving a screen with unsaved changes, whether by
 * the back button or a tab. Call `release()` right before navigating after a
 * save or delete. `onDiscard` cleans up when the user leaves anyway.
 */
export function useLeaveGuard(dirty: boolean, onDiscard?: () => Promise<void> | void) {
  const released = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !released.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) released.current = false
  }, [dirty])

  async function leave() {
    await onDiscard?.()
    blocker.proceed?.()
  }

  const sheet = blocker.state === 'blocked' ? (
    <div className="sheet-backdrop" role="presentation" onClick={() => blocker.reset?.()}>
      <div className="sheet" role="alertdialog" aria-labelledby="leave-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="leave-title">저장하지 않고 나갈까요?</h2>
        <p className="muted">바꾼 내용은 저장되지 않아요.</p>
        <div className="sheet-actions">
          <button className="btn" onClick={() => blocker.reset?.()}>계속 고치기</button>
          <button className="btn danger" onClick={() => void leave()}>저장 안 하고 나가기</button>
        </div>
      </div>
    </div>
  ) : null

  return {
    sheet,
    release: () => { released.current = true },
  }
}
