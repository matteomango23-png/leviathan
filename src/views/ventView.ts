// The air vents of the endless sea: a soft glow on the floor and a column of bubbles rising from it, so you can
// spot them from afar in the dark (swim into the column to breathe: systems/endlessLife.ts).
import Phaser from 'phaser';
import { ENDLESS } from '../data/endless';
import { hash2 } from '../systems/math';
import { stretchAt, ventsOf } from '../systems/world/endless';

const BUBBLES = 16;

export class VentView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.g);
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    if (view.right < ENDLESS.startX) return;
    const V = ENDLESS.vents;
    for (let k = stretchAt(view.x) - 1; k <= stretchAt(view.right) + 1; k++) {
      for (const v of ventsOf(k)) {
        if (v.x < view.x - 40 || v.x > view.right + 40 || v.y - V.height > view.bottom || v.y < view.y)
          continue;
        g.fillStyle(0x9fe8ff, 0.12);
        g.fillEllipse(v.x, v.y, V.radius * 2.2, 10);
        g.fillStyle(0xcff6ff, 0.18);
        g.fillEllipse(v.x, v.y - 2, V.radius * 0.9, 5);
        for (let i = 0; i < BUBBLES; i++) {
          const speed = 26 + hash2(i, k) * 22;
          const rise = (time * speed + hash2(i * 7, k) * V.height) % V.height;
          const wobble = Math.sin(time * 2.3 + i * 1.7) * (2 + rise * 0.03);
          const r = 0.8 + hash2(i * 3, k * 5) * 1.6 + rise * 0.004;
          const fade = 1 - rise / V.height;
          g.lineStyle(0.5, 0xdff8ff, 0.55 * fade);
          g.strokeCircle(v.x + (hash2(i, k * 3) - 0.5) * V.radius + wobble, v.y - rise, r);
        }
      }
    }
  }
}
