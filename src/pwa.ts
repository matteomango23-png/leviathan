// Offline support: registers the service worker that stores the whole game on the device.
// On an iPhone the game added to the home screen is rarely opened from scratch: it is resumed from the
// background, and a service worker only looks for a new version when the page loads. So the game also asks
// for one every time it comes back to the screen (and every half hour). A version found right after opening
// or coming back (nothing played yet) is applied at once: the game saves and reloads. One found later waits
// until the app goes to the background (never in the middle of a dive). (Owner, 3 ottobre 2026: "quando
// aggiorni il link non vedo le modifiche e lo devo eliminare, ma perdo il salvataggio".)
import { registerSW } from 'virtual:pwa-register';

/** A new version found this soon after opening or coming back is applied at once. */
const APPLY_SOON_MS = 8000;
/** How often to look for a new version while playing. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

export function registerOffline(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  let updateReady = false;
  let shownAt = performance.now();
  let reg: ServiceWorkerRegistration | undefined;
  const check = (): void => void reg?.update().catch(() => undefined); // offline: nothing to do
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      reg = r;
      if (r) setInterval(check, CHECK_EVERY_MS);
    },
    onNeedRefresh() {
      if (performance.now() - shownAt < APPLY_SOON_MS) void updateSW(true);
      else updateReady = true;
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // back on screen: look for a new version now
      shownAt = performance.now();
      if (updateReady) {
        updateReady = false;
        void updateSW(true);
      } else check();
      return;
    }
    if (updateReady) {
      updateReady = false;
      // the World scene saves on the same event, before this reload happens
      setTimeout(() => void updateSW(true), 300);
    }
  });
}
