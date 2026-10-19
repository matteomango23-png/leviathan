// Entry point: creates the Phaser game at the device's full resolution (capped at 2×).
import Phaser from 'phaser';
import './ui/ui.css';
import './ui/helm.css';
import { CAMERA } from './data/diver';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { MenusScene } from './scenes/MenusScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { registerOffline } from './pwa';
import { loadGameFont } from './ui/fonts';

const dpr = (): number => Math.min(CAMERA.maxDpr, window.devicePixelRatio || 1);
// The page can start with no size (e.g. opened in the background): fall back, then resize when shown.
const size = (): { w: number; h: number } => {
  const css = screenCss();
  return { w: Math.max(64, Math.round(css.w * dpr())), h: Math.max(64, Math.round(css.h * dpr())) };
};

/** Opened from the Home screen the game fills the whole screen. */
const standalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia?.('(display-mode: standalone)').matches === true;

/**
 * The game's size in CSS pixels. Opened from the Home screen already in landscape, iOS can report (and lay out) a
 * page shorter than the screen and never correct it (owner, 11 and 19 ottobre: a band at the bottom, everything
 * squashed): there the whole screen is used, measured from `screen` in the window's orientation.
 */
function screenCss(): { w: number; h: number } {
  let w = window.innerWidth || 1280;
  let h = window.innerHeight || 720;
  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;
  if (standalone() && sw > 0 && sh > 0) {
    const landscape = w > h;
    w = Math.max(w, landscape ? Math.max(sw, sh) : Math.min(sw, sh));
    h = Math.max(h, landscape ? Math.min(sw, sh) : Math.max(sw, sh));
  }
  // the page, the game and the controls take that height too (style.css: --app-h)
  document.documentElement.style.setProperty('--app-h', `${h}px`);
  return { w, h };
}

void loadGameFont();
const { w, h } = size();
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  backgroundColor: '#02070c',
  scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr() },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  disableContextMenu: true,
  banner: false,
  scene: [BootScene, TitleScene, WorldScene, UIScene, MenusScene, BattleScene],
});

let resizeTimer = 0;
const onResize = (): void => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const s = size();
    game.scale.resize(s.w, s.h);
    game.scale.setZoom(1 / dpr());
  }, 60);
};
window.addEventListener('resize', onResize);
window.visualViewport?.addEventListener('resize', onResize);
window.addEventListener('pageshow', onResize);
// opened from the Home screen already in landscape, iOS can report the wrong size first and never fire a resize (owner,
// 11 ottobre: a black band at the bottom): a cheap look every second, resizing only if the screen really changed
window.setInterval(() => {
  const s = size();
  if (Math.abs(s.w - game.scale.width) > 2 || Math.abs(s.h - game.scale.height) > 2) onResize();
}, 1000);
window.addEventListener('orientationchange', onResize);
document.addEventListener('visibilitychange', onResize);
game.events.once('ready', onResize);

registerOffline();

// Development only: lets the browser console inspect the running game.
if (import.meta.env.DEV) Object.assign(window, { __leviatano: game });
