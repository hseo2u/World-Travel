import { registerSW } from 'virtual:pwa-register'

// A home-screen app on iPhone can stay open for days and only looks for a new
// version on a cold start. Check again each time it comes back to the front;
// a new version found then reloads the app straight away (autoUpdate).
export function watchForUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update()
      })
    },
  })
}
