// Entry point: creates the Phaser game at the device's full resolution (capped at 2×).
import Phaser from 'phaser';
import './ui/ui.css';
import { CAMERA } from './data/diver';
import { BootScene } from './scenes/BootScene';
import { MenusScene } from './scenes/MenusScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { registerOffline } from './pwa';

const dpr = (): number => Math.min(CAMERA.maxDpr, window.devicePixelRatio || 1);
// The page can start with no size (e.g. opened in the background): fall back, then resize when shown.
const size = (): { w: number; h: number } => ({
  w: Math.max(64, Math.round((window.innerWidth || 1280) * dpr())),
  h: Math.max(64, Math.round((window.innerHeight || 720) * dpr())),
});

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
  scene: [BootScene, WorldScene, UIScene, MenusScene],
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
window.addEventListener('orientationchange', onResize);
document.addEventListener('visibilitychange', onResize);
game.events.once('ready', onResize);

registerOffline();

// Development only: lets the browser console inspect the running game.
if (import.meta.env.DEV) Object.assign(window, { __leviatano: game });
