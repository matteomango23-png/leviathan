// The water itself (owner, 21 ottobre 2026: "l'acqua deve essere semplicemente un filtro sopra che altera leggermente
// sul bluastro quello che sta sotto, e più vai in profondità / acqua torbida più diventa tutto scuro… deve essere una
// cosa graduale"). One multiply layer in front of everything in the world (rock, beasts, diver, fish, hulls, kelp)
// under the real waves (sea.ts seaHeight, the waves the surface is painted with): just under them it barely tints,
// deeper it turns blue-green and darker, band after band, the same whether you look from above or from below. Murky
// water browns and darkens it. Above the waves (spray, a leaping beast's back) nothing changes.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { filterColor } from '../systems/waterTint';
import { seaHeight, troughDepth, type SeaNow } from '../systems/sea';

const F = SEA.filter;

export class WaterFilter {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics().setBlendMode(Phaser.BlendModes.MULTIPLY);
    layer.add(this.g);
  }

  /** @param view the world in view; @param murk 0 … 1 murky water (clarity.ts) */
  update(
    view: { x: number; y: number; width: number; height: number },
    time: number,
    sea: SeaNow,
    murk: number,
  ): void {
    const g = this.g;
    g.clear();
    const x0 = Math.floor(view.x / F.step) * F.step - F.step;
    const x1 = view.x + view.width + F.step;
    const y1 = view.y + view.height + F.band;
    if (y1 < WORLD.surfaceY - troughDepth(sea)) return; // all sky
    const fill = (y: number): void => {
      const [r, gg, b] = filterColor(y, murk);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gg, b), 1);
    };
    // the band the waves move in: column by column, from the wave down to where the even bands start
    const even = WORLD.surfaceY + troughDepth(sea);
    for (let x = x0; x < x1; x += F.step) {
      const line = WORLD.surfaceY - seaHeight(x + F.step / 2, time, sea, sea.water);
      for (let y = line; y < even; y += F.band) {
        fill(y);
        g.fillRect(x, y, F.step, Math.min(F.band, even - y));
      }
    }
    // below the waves: whole bands across the view
    for (let y = Math.max(even, view.y - F.band); y < y1; y += F.band) {
      fill(y);
      g.fillRect(x0, y, x1 - x0, F.band);
    }
  }
}
