// The looks of the different kinds of move (data/moveAnims.ts; owner, 22 ottobre 2026): jaws snapping shut on the
// other, a sweeping cut, a shot flying across, rings of force breaking over it, waves sent at it, a glow swelling round
// the one that grows stronger. In the move type's colour; the hit itself stays TypeFx's.
import Phaser from 'phaser';

interface Fx {
  kind: 'jaws' | 'sweep' | 'shot' | 'rings' | 'aura' | 'waves';
  x: number;
  y: number;
  /** Where a shot or waves go. */
  tx: number;
  ty: number;
  size: number;
  color: number;
  t: number;
  life: number;
  dir: number;
}

export class MoveFx {
  private readonly g: Phaser.GameObjects.Graphics;
  private fx: Fx[] = [];

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  }

  private add(
    kind: Fx['kind'],
    x: number,
    y: number,
    size: number,
    color: number,
    life: number,
    more = {},
  ): void {
    this.fx.push({ kind, x, y, tx: x, ty: y, size, color, t: life, life, dir: 1, ...more });
  }

  /** Two rows of teeth closing on (x, y). */
  jaws(x: number, y: number, size: number, color: number): void {
    this.add('jaws', x, y, size * 0.5, color, 0.32);
  }

  /** A wide curved cut across (x, y), sweeping the way `dir` (1 right, −1 left). */
  sweep(x: number, y: number, size: number, color: number, dir: number): void {
    this.add('sweep', x, y, size * 0.55, color, 0.34, { dir });
  }

  /** A bright shot from (x, y) to (tx, ty), there in `seconds`. */
  shot(x: number, y: number, tx: number, ty: number, size: number, color: number, seconds: number): void {
    this.add('shot', x, y, size * 0.09, color, seconds, { tx, ty });
  }

  /** Rings of force breaking outwards at (x, y). */
  rings(x: number, y: number, size: number, color: number): void {
    for (let i = 0; i < 3; i++) this.add('rings', x, y, size * (0.4 + i * 0.25), color, 0.45 + i * 0.12);
  }

  /** A glow swelling round the one at (x, y). */
  aura(x: number, y: number, size: number, color: number): void {
    this.add('aura', x, y, size * 0.55, color, 0.7);
  }

  /** Arcs sent from (x, y) to (tx, ty) (a roar, a cloud, a spell), there in `seconds`. */
  waves(x: number, y: number, tx: number, ty: number, size: number, color: number, seconds: number): void {
    this.add('waves', x, y, size * 0.3, color, seconds, { tx, ty });
  }

  update(dt: number): void {
    const g = this.g.clear();
    this.fx = this.fx.filter((f) => (f.t -= dt) > 0);
    for (const f of this.fx) {
      const k = 1 - f.t / f.life; // 0 → 1
      const fade = 1 - k;
      if (f.kind === 'jaws') {
        // the upper and lower rows of teeth close, then a flash
        const gap = f.size * 0.6 * Math.max(0, 1 - k * 2.2);
        g.lineStyle(f.size * 0.07, f.color, 0.9 * fade);
        for (const s of [-1, 1]) {
          g.beginPath();
          g.arc(
            f.x,
            f.y + s * (gap + f.size * 0.35),
            f.size * 0.7,
            s < 0 ? 0.25 : Math.PI + 0.25,
            s < 0 ? Math.PI - 0.25 : -0.25,
            false,
          );
          g.strokePath();
          for (let i = -2; i <= 2; i++)
            g.fillStyle(0xffffff, 0.85 * fade).fillTriangle(
              f.x + i * f.size * 0.22 - f.size * 0.05,
              f.y + s * (gap + f.size * 0.02),
              f.x + i * f.size * 0.22 + f.size * 0.05,
              f.y + s * (gap + f.size * 0.02),
              f.x + i * f.size * 0.22,
              f.y + s * (gap - f.size * 0.12),
            );
        }
      } else if (f.kind === 'sweep') {
        // the lower part of a circle whose centre is above the beast: the cut sweeps across its body
        const r = f.size * 0.8;
        const a0 = f.dir > 0 ? 2.6 : 0.55;
        const span = -1.9 * Math.min(1, k * 3) * f.dir;
        g.lineStyle(f.size * 0.12 * fade, f.color, 0.85 * fade);
        g.beginPath();
        g.arc(f.x, f.y - r * 0.85, r, a0, a0 + span, f.dir > 0);
        g.strokePath();
      } else if (f.kind === 'shot') {
        const x = f.x + (f.tx - f.x) * k;
        const y = f.y + (f.ty - f.y) * k - Math.sin(k * Math.PI) * f.size * 2;
        for (let i = 0; i < 5; i++) {
          const b = Math.max(0, k - i * 0.04);
          g.fillStyle(f.color, 0.5 * (1 - i / 5)).fillCircle(
            f.x + (f.tx - f.x) * b,
            f.y + (f.ty - f.y) * b - Math.sin(b * Math.PI) * f.size * 2,
            f.size * (1 - i * 0.15),
          );
        }
        g.fillStyle(0xffffff, 0.9).fillCircle(x, y, f.size * 0.55);
      } else if (f.kind === 'rings') {
        g.lineStyle(f.size * 0.1 * fade, f.color, 0.8 * fade);
        g.strokeEllipse(f.x, f.y, f.size * 2.4 * k, f.size * 1.1 * k);
      } else if (f.kind === 'aura') {
        const r = f.size * (0.8 + k * 0.5);
        g.fillStyle(f.color, 0.16 * Math.sin(k * Math.PI)).fillCircle(f.x, f.y, r);
        g.lineStyle(f.size * 0.05, f.color, 0.6 * Math.sin(k * Math.PI)).strokeCircle(f.x, f.y, r * 0.9);
      } else {
        // three arcs riding from the one to the other
        for (let i = 0; i < 3; i++) {
          const b = Math.min(1, Math.max(0, k * 1.3 - i * 0.15));
          if (b <= 0 || b >= 1) continue;
          const x = f.x + (f.tx - f.x) * b;
          const y = f.y + (f.ty - f.y) * b;
          const face = Math.atan2(f.ty - f.y, f.tx - f.x);
          g.lineStyle(f.size * 0.15, f.color, 0.75 * (1 - b));
          g.beginPath();
          g.arc(x, y, f.size * (0.6 + b * 0.8), face - 0.8, face + 0.8, false);
          g.strokePath();
        }
      }
    }
  }
}
