// Offline support: registers the service worker that stores the whole game on the device.
// A new version is applied when the app goes to the background (never in the middle of a dive):
// the game saves, reloads silently, and the next time you open it you have the update.
import { registerSW } from 'virtual:pwa-register';

/** A new version found this soon after opening is applied at once (the title screen is still up). */
const APPLY_AT_OPEN_MS = 8000;

export function registerOffline(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  let updateReady = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // found right after opening (nothing played yet): take the new version at once, so a fresh open always
      // shows the latest game instead of the copy stored on the phone
      if (performance.now() < APPLY_AT_OPEN_MS) void updateSW(true);
      else updateReady = true;
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && updateReady) {
      updateReady = false;
      // the World scene saves on the same event, before this reload happens
      setTimeout(() => void updateSW(true), 300);
    }
  });
}
