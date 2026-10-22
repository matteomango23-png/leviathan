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
import { gameSize, isUpright } from './ui/orientation';
import { showRotateHint } from './ui/rotateHint';
import { initSplash } from './ui/splash';

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
 * The game's size in CSS pixels (ui/orientation.ts): the largest the phone reports, the whole screen from the Home
 * screen. The page, the game and the controls take it (style.css: --app-w, --app-h). Held upright the game sleeps
 * under a "gira il telefono" screen (ui/rotateHint.ts).
 */
let upright = false;
function screenCss(): { w: number; h: number } {
  const v = window.visualViewport;
  const d = document.documentElement;
  const m = {
    inner: { w: window.innerWidth, h: window.innerHeight },
    visual: v ? { w: v.width, h: v.height } : undefined,
    client: { w: d.clientWidth, h: d.clientHeight },
    screen: window.screen ? { w: window.screen.width, h: window.screen.height } : undefined,
    standalone: standalone(),
    touch: window.matchMedia?.('(pointer: coarse)').matches === true,
  };
  const { w, h } = gameSize(m);
  upright = isUpright(m);
  d.style.setProperty('--app-w', `${w}px`);
  d.style.setProperty('--app-h', `${h}px`);
  window.scrollTo(0, 0); // iOS can leave the page moved by a few pixels
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
    // held upright: the game sleeps under the "gira il telefono" screen, and wakes as it was
    if (showRotateHint(upright)) {
      if (upright) game.loop.sleep();
      else game.loop.wake();
    }
    if (upright) return;
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
// iOS updates its sizes late after a turn: once more a little later, and again
const settle = (): void => {
  onResize();
  window.setTimeout(onResize, 300);
  window.setTimeout(onResize, 900);
};
window.addEventListener('orientationchange', settle);
window.addEventListener('leviatano-entered', settle); // the first tap on the opening screen (ui/splash.ts)
document.addEventListener('visibilitychange', onResize);
game.events.once('ready', onResize);

registerOffline();
initSplash();

// Development only: lets the browser console inspect the running game.
if (import.meta.env.DEV) Object.assign(window, { __leviatano: game });
