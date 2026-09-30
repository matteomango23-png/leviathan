// Offline support: registers the service worker that stores the whole game on the device.
// A new version is applied when the app goes to the background (never in the middle of a dive):
// the game saves, reloads silently, and the next time you open it you have the update.
import { registerSW } from 'virtual:pwa-register';

export function registerOffline(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  let updateReady = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
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
