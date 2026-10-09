// The sea against a hull (owner, 9 ottobre 2026: his clips of a tanker breaking the waves and a boat landing nose
// first): white spray thrown up and forward where a bow buries itself in the water, and the water in front of the
// hull, cut by the wave itself (not a straight line) so the hull sinks into the sea's real surface. Look only.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { rampColor } from '../systems/math';
import { seaHeight, type SeaNow } from '../systems/sea';

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
}

const GRAVITY = 59;
const LIFE = 1.4;

export class SeaFx {
  private drops: Drop[] = [];
  private due = 0;

  constructor(private readonly g: Phaser.GameObjects.Graphics) {}

  /**
   * Spray at a buried bow: `plunge` how deep (units), `speed` the hull's (units/s, toward `face`), `scale` its size
   * (1: a 180-unit ship).
   */
  spray(x: number, plunge: number, speed: number, face: 1 | -1, scale: number, dt: number): void {
    const power = Math.min(1, plunge / (6 * scale)) * Math.min(1, 0.3 + speed / 200);
    this.due += power * 220 * dt;
    while (this.due >= 1 && this.drops.length < 500) {
      this.due -= 1;
      const up = (40 + 120 * power) * (0.6 + Math.random() * 0.6) * Math.sqrt(scale);
      this.drops.push({
        x: x + (Math.random() - 0.5) * 10 * scale,
        y: WORLD.surfaceY - 2,
        vx: face * speed * (0.3 + Math.random() * 0.5) + (Math.random() - 0.5) * 40,
        vy: -up,
        r: (0.6 + Math.random() * 1.4) * Math.sqrt(scale),
        age: 0,
      });
    }
  }

  /** The drops fly and fall; drawn on the graphics given (over the hull). */
  update(dt: number): void {
    const g = this.g;
    for (const d of this.drops) {
      d.age += dt;
      d.vy += GRAVITY * dt;
      d.vx *= Math.exp(-1.5 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    this.drops = this.drops.filter((d) => d.age < LIFE && d.y < WORLD.surfaceY + 20);
    for (const d of this.drops) {
      const a = (1 - d.age / LIFE) * 0.9;
      g.fillStyle(0xffffff, a).fillCircle(d.x, d.y, d.r * (1 + d.age * 0.6));
    }
  }
}

/**
 * The sea in front of a hull, from x0 to x1: from the wave's surface down to `bottom`, the colour of the water near
 * the surface, half see-through, so what is under the waves looks under water whatever their shape.
 */
export function waterOver(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  x1: number,
  bottom: number,
  time: number,
  sea: SeaNow,
): void {
  const c = rampColor(SEA.waterByY, WORLD.surfaceY + 12);
  g.fillStyle(Phaser.Display.Color.GetColor(c[0], c[1], c[2]), 0.55);
  const step = 4;
  for (let x = x0; x < x1; x += step) {
    const a = WORLD.surfaceY - seaHeight(x, time, sea, sea.water);
    const b = WORLD.surfaceY - seaHeight(Math.min(x1, x + step), time, sea, sea.water);
    const xe = Math.min(x1, x + step);
    if (bottom <= Math.min(a, b)) continue;
    g.fillTriangle(x, a, xe, b, xe, bottom);
    g.fillTriangle(x, a, xe, bottom, x, bottom);
  }
}
