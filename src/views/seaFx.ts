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
 * The sea in front of a hull, from x0 to x1: just under the wave's surface, the colour of the water near the
 * surface, half see-through and fading with depth and towards the hull's ends (owner, 9 ottobre: a flat block of
 * another colour under the boats), so the hull looks sunk in the water whatever the waves' shape. Its edges follow
 * the wave: no straight line anywhere.
 */
export function waterOver(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  x1: number,
  bottom: number,
  time: number,
  sea: SeaNow,
  strength = 1,
): void {
  const c = rampColor(SEA.waterByY, WORLD.surfaceY + 12);
  const colour = Phaser.Display.Color.GetColor(c[0], c[1], c[2]);
  const step = 4;
  const bands = 6;
  const band = 2.5; // units each
  const span = Math.max(1, x1 - x0);
  const ends = span * 0.15;
  for (let x = x0; x < x1; x += step) {
    const xe = Math.min(x1, x + step);
    const a = WORLD.surfaceY - seaHeight(x, time, sea, sea.water);
    const b = WORLD.surfaceY - seaHeight(xe, time, sea, sea.water);
    const mid = (x + xe) / 2;
    const edge = Math.min(1, Math.min(mid - x0, x1 - mid) / ends);
    for (let j = 0; j < bands; j++) {
      const top = j * band;
      if (Math.min(a, b) + top >= bottom) break;
      const alpha = 0.5 * strength * edge * (1 - j / bands);
      if (alpha < 0.01) continue;
      g.fillStyle(colour, alpha);
      g.fillTriangle(x, a + top, xe, b + top, xe, b + top + band);
      g.fillTriangle(x, a + top, xe, b + top + band, x, a + top + band);
    }
  }
}
