// The echo of a Glaciale in your pack (systems/pack.ts; owner, 21 ottobre 2026): a ring spreads from it, and the wild
// beasts it finds near you light up for a moment with a ring round them, over the darkness (the glow layer), so you
// see where they are even in the black of the deep.
import Phaser from 'phaser';

interface Ring {
  x: number;
  y: number;
  r: number;
  grow: number;
  t: number;
  life: number;
}

const COLOR = 0xa9dcff; // the Glaciale's colour (data/rules.ts TYPES)

export class EchoView {
  private readonly g: Phaser.GameObjects.Graphics;
  private rings: Ring[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.g);
  }

  /** The echo leaves the companion at (x, y) and finds these beasts. */
  ping(x: number, y: number, found: readonly { x: number; y: number; r: number }[]): void {
    this.rings.push({ x, y, r: 6, grow: 260, t: 0, life: 1.1 });
    for (const f of found)
      this.rings.push({ x: f.x, y: f.y, r: Math.max(8, f.r), grow: 14, t: -0.25, life: 1.6 });
  }

  update(dt: number): void {
    const g = this.g;
    g.clear();
    this.rings = this.rings.filter((r) => (r.t += dt) < r.life);
    for (const r of this.rings) {
      if (r.t < 0) continue;
      const k = r.t / r.life;
      g.lineStyle(1.5, COLOR, 0.7 * (1 - k));
      g.strokeCircle(r.x, r.y, r.r + r.grow * r.t);
    }
  }
}
