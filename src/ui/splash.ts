// The opening screen (owner, 21 ottobre 2026: "una schermata di caricamento… in modo che appena si apre il menu è tutto
// a posto"; the music of the menu was never heard, as the first tap was the one choosing a game): it is in index.html,
// there before any script; its tap wakes the sound (audio/soundEngine.ts listens to every tap) so the menu's music
// plays, the screen is measured again (main.ts), and it fades away as soon as the title menu is ready.
import pkg from '../../package.json';
import { assetUrl } from '../data/assets';
import { SPLASH } from '../data/diver';

let ready = false;
let entered = false;
/** When its tap came (performance.now()), for the guard of the menu under it. */
let enteredAt: number | null = null;

/** Whether a tap at `now` is still the one that opened the game (it must not press the menu under it). */
export function isGuarded(at: number | null, now: number): boolean {
  return at !== null && now - at < SPLASH.guardMs;
}

/** Whether a tap now belongs to the opening screen's (ui/titleMenu.ts ignores it). */
export const splashGuard = (): boolean => isGuarded(enteredAt, performance.now());

const root = (): HTMLElement | null => document.getElementById('splash');

function maybeHide(): void {
  const s = root();
  if (!s || !ready || !entered) return;
  s.classList.add('gone');
  window.setTimeout(() => s.remove(), 700);
}

/** Wires the opening screen's tap (main.ts, at start). */
export function initSplash(): void {
  const s = root();
  if (!s) return;
  const v = s.querySelector('.splash-version');
  if (v) v.textContent = `Versione ${pkg.version}`;
  // the owner's picture, once it is in the game (npm run art: art-inbox/splash.jpg → public/ui/splash.webp)
  const art = s.querySelector<HTMLElement>('.splash-art');
  const img = new Image();
  img.onload = (): void => {
    if (art) art.style.backgroundImage = `url('${img.src}')`;
  };
  const url = assetUrl('ui/splash.webp');
  if (url.includes('?h=')) img.src = url; // only once it is in the game (a known picture has its hash)
  const tap = s.querySelector('.splash-tap');
  // the click the phone sends after the tap stays here: it would press the title menu's button under it
  s.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  s.addEventListener('pointerup', () => {
    if (entered) return;
    entered = true;
    enteredAt = performance.now();
    window.dispatchEvent(new Event('leviatano-entered'));
    if (!ready && tap) tap.textContent = 'Caricamento…';
    maybeHide();
  });
}

/** The title menu is ready (TitleScene): the screen goes once you have tapped it. */
export function splashReady(): void {
  ready = true;
  maybeHide();
}
