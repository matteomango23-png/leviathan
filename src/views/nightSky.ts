// The night sky (lot N1): soft stars coming out with the dark, the owner's painted moon crossing the sky through the
// night, and its faint glint shivering on the water under it. All of it over the darkness (the glow layer, in world
// units), so the stars shine in the black; placed from the screen (they are far away: no sliding). Look only.
import Phaser from 'phaser';
import { NIGHT } from '../data/daynight';
import { CAMERA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { phaseAt } from '../systems/dayNight';
import { hash2 } from '../systems/math';
import type { ViewInfo } from './backgroundView';
import { TEX } from './textures';

const GLINTS = 7;

export class NightSky {
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly moon: Phaser.GameObjects.Image | null = null;
  private readonly glints: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, glow: Phaser.GameObjects.Layer) {
    for (let i = 0; i < NIGHT.stars; i++) {
      const im = scene.add.image(0, 0, TEX.dot).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      glow.add(im);
      this.stars.push(im);
    }
    if (WORLD_ART_KEYS.includes(NIGHT.moonArt)) {
      this.moon = scene.add.image(0, 0, `world-${NIGHT.moonArt}`).setVisible(false);
      glow.add(this.moon);
    }
    for (let i = 0; i < GLINTS; i++) {
      const im = scene.add
        .image(0, 0, TEX.dot)
        .setTint(NIGHT.glintColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      glow.add(im);
      this.glints.push(im);
    }
  }

  /** @param night 0 by day … 1 at night; @param t the clock (where the moon is); @param clouds 0 … 1 */
  update(v: ViewInfo, night: number, t: number, clouds: number, time: number): void {
    const surface = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
    const skyTop = Math.min(0, v.h / 2 + (CAMERA.minY - v.cy) * v.zoom);
    const clear = night * (1 - clouds * 0.9);
    const px = v.h / 400;
    /** A point of the screen in the world (the glow layer). */
    const wx = (sx: number): number => v.cx + (sx - v.w / 2) / v.zoom;
    const wy = (sy: number): number => v.cy + (sy - v.h / 2) / v.zoom;
    this.stars.forEach((im, i) => {
      const h = 25 + hash2(i, 71) * 320; // units over the surface
      const y = surface - h * v.zoom;
      if (clear < 0.02 || y < skyTop || surface < 0) return void im.setVisible(false);
      const twinkle = 0.65 + 0.35 * Math.sin(time * (1 + hash2(i, 73) * 2) + i);
      // fainter near the horizon, where the air is thick
      const high = Math.min(1, h / 120);
      const size = ((1 + hash2(i, 74) * 1.6) * px) / v.zoom;
      im.setVisible(true)
        .setPosition(wx(hash2(i, 72) * v.w), wy(y))
        .setDisplaySize(size, size)
        .setAlpha(NIGHT.starAlpha * clear * twinkle * high);
    });
    // the moon: rises at dusk on the left, highest at midnight, sets at dawn on the right
    const p = phaseAt(t);
    const along = p.id === 'notte' ? p.u : p.id === 'alba' ? 1 : 0;
    const mx = v.w * (0.15 + 0.7 * along);
    const rise = NIGHT.moonRise[0] + (NIGHT.moonRise[1] - NIGHT.moonRise[0]) * Math.sin(Math.PI * along);
    const my = surface - rise * v.zoom;
    const shown = night > 0.02 && surface > 0;
    if (this.moon) {
      this.moon.setVisible(shown && my > skyTop);
      if (shown)
        this.moon
          .setPosition(wx(mx), wy(my))
          .setScale(NIGHT.moonWidth / this.moon.width)
          .setAlpha(night * (1 - clouds * 0.7));
    }
    // its glint on the water: soft streaks shivering just under the surface below it
    const gx = wx(mx);
    this.glints.forEach((im, i) => {
      if (!shown) return void im.setVisible(false);
      const flick = 0.5 + 0.5 * Math.sin(time * 3.1 + i * 1.9);
      const w = NIGHT.moonWidth * (1 - i / GLINTS) * 0.9;
      im.setVisible(true)
        .setPosition(gx + Math.sin(time * 1.3 + i * 2.3) * 3, WORLD.surfaceY + 2 + i * 3.5)
        .setDisplaySize(w, 2.2)
        .setAlpha(NIGHT.moonGlint * night * (1 - clouds * 0.8) * flick * (1 - i / GLINTS));
    });
  }
}
