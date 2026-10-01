// The look of a hit, by the type of the move: Predatore claw slashes, Tempesta lightning from above,
// Glaciale ice shards and a frost ring, Abissale ink that swirls in with glowing sparks, Corazzato shock
// rings and flying rock. Always a flash of light and sparks in the type's colour.
import Phaser from 'phaser';
import { TYPES, type MoveTypeId } from '../../data/rules';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  color: number;
  shape: 'dot' | 'shard' | 'rock' | 'ink';
  gravity: number;
  spin: number;
}

interface Mark {
  kind: 'slash' | 'bolt' | 'ring';
  x: number;
  y: number;
  t: number;
  life: number;
  size: number;
  color: number;
  angle: number;
  points?: Phaser.Math.Vector2[];
}

export const typeColor = (type: MoveTypeId): number =>
  type === 'variabile' ? 0xffffff : Phaser.Display.Color.HexStringToColor(TYPES[type].color).color;

export class TypeFx {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private marks: Mark[] = [];

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(17);
  }

  private spray(x: number, y: number, n: number, speed: number, p: Partial<Particle>): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = (p.life ?? 0.5) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        t: life,
        life,
        size: (p.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: p.color ?? 0xffffff,
        shape: p.shape ?? 'dot',
        gravity: p.gravity ?? 0,
        spin: Math.random() * 6,
      });
    }
  }

  private bolt(x: number, y: number, size: number, color: number): void {
    const points: Phaser.Math.Vector2[] = [];
    let px = x + (Math.random() - 0.5) * size * 0.8;
    const top = y - size * 2.2;
    for (let k = 0; k <= 9; k++) {
      points.push(new Phaser.Math.Vector2(px, top + ((y - top) * k) / 9));
      px += (Math.random() - 0.5) * size * 0.35;
    }
    points[points.length - 1] = new Phaser.Math.Vector2(x, y);
    this.marks.push({ kind: 'bolt', x, y, t: 0.32, life: 0.32, size, color, angle: 0, points });
  }

  /** The hit on a beast at (x, y) whose picture is `size` pixels tall. */
  impact(type: MoveTypeId, x: number, y: number, size: number, crit: boolean): void {
    const color = typeColor(type);
    const s = size * 0.5;
    const n = crit ? 1.6 : 1;
    this.marks.push({ kind: 'ring', x, y, t: 0.3, life: 0.3, size: s * 0.5, color: 0xffffff, angle: 0 });
    if (type === 'predatore' || type === 'variabile')
      for (let i = -1; i <= 1; i++)
        this.marks.push({
          kind: 'slash',
          x: x + i * s * 0.22,
          y: y + i * s * 0.05,
          t: 0.38,
          life: 0.38,
          size: s,
          color,
          angle: -0.9 + i * 0.08,
        });
    if (type === 'tempesta') for (let i = 0; i < 3; i++) this.bolt(x + (i - 1) * s * 0.3, y, s, color);
    if (type === 'glaciale') {
      this.marks.push({ kind: 'ring', x, y, t: 0.55, life: 0.55, size: s * 1.1, color, angle: 0 });
      this.spray(x, y, 14 * n, size * 1.4, { color: 0xe8f8ff, shape: 'shard', size: s * 0.09, life: 0.6 });
    }
    if (type === 'abissale') {
      this.spray(x, y, 10 * n, size * 0.5, { color: 0x05080c, shape: 'ink', size: s * 0.16, life: 0.9 });
      this.spray(x, y, 16 * n, size * 0.9, { color, size: s * 0.03, life: 0.7 });
    }
    if (type === 'corazzato') {
      for (const k of [0.8, 1.3])
        this.marks.push({
          kind: 'ring',
          x,
          y: y + s * 0.3,
          t: 0.5 * k,
          life: 0.5 * k,
          size: s * k,
          color,
          angle: 0,
        });
      this.spray(x, y, 12 * n, size * 1.2, {
        color: 0x6b5a44,
        shape: 'rock',
        size: s * 0.07,
        life: 0.8,
        gravity: size * 3,
      });
    }
    this.spray(x, y, 18 * n, size * 1.6, { color, size: Math.max(2, s * 0.025), life: 0.45 });
  }

  /** A glint rising slowly around a rare beast (gold for legendaries, pale for albinos, red for alphas). */
  sparkle(x: number, y: number, size: number, color: number): void {
    this.spray(x, y, 1, size * 0.04, {
      color,
      size: Math.max(1.5, size * 0.009),
      life: 1.6,
      gravity: -size * 0.06,
    });
  }

  /** A little trail of bubbles behind a beast that lunges. */
  trail(x: number, y: number, size: number): void {
    this.spray(x, y, 6, size * 0.3, { color: 0xdff8ff, size: Math.max(1.5, size * 0.012), life: 0.5 });
  }

  update(dt: number): void {
    const g = this.g.clear();
    const glow = this.glow.clear();
    this.marks = this.marks.filter((m) => (m.t -= dt) > 0);
    for (const m of this.marks) {
      const k = 1 - m.t / m.life; // 0 → 1
      if (m.kind === 'slash') {
        // a bright cut that opens fast and fades
        const len = m.size * Math.min(1, k * 4);
        const dx = Math.cos(m.angle) * len;
        const dy = Math.sin(m.angle) * len;
        glow.lineStyle(m.size * 0.09 * (1 - k), m.color, 0.9 * (1 - k));
        glow.lineBetween(m.x - dx / 2, m.y - dy / 2, m.x + dx / 2, m.y + dy / 2);
        g.lineStyle(m.size * 0.025 * (1 - k), 0xffffff, 1 - k);
        g.lineBetween(m.x - dx / 2, m.y - dy / 2, m.x + dx / 2, m.y + dy / 2);
      } else if (m.kind === 'bolt' && m.points) {
        const flicker = Math.random() < 0.75 ? 1 : 0.3;
        glow.lineStyle(m.size * 0.1, m.color, 0.7 * (1 - k) * flicker);
        glow.strokePoints(m.points);
        g.lineStyle(m.size * 0.025, 0xffffff, (1 - k) * flicker);
        g.strokePoints(m.points);
      } else if (m.kind === 'ring') {
        glow.lineStyle(m.size * 0.08 * (1 - k), m.color, 0.8 * (1 - k));
        glow.strokeEllipse(m.x, m.y, m.size * 2 * k, m.size * 0.9 * k);
      }
    }
    this.particles = this.particles.filter((p) => (p.t -= dt) > 0);
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.vx *= 1 - dt * 2.5;
      p.vy *= p.gravity ? 1 : 1 - dt * 2.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 8;
      const a = Math.min(1, (p.t / p.life) * 1.6);
      if (p.shape === 'dot') {
        glow.fillStyle(p.color, a);
        glow.fillCircle(p.x, p.y, p.size);
      } else if (p.shape === 'ink') {
        g.fillStyle(p.color, a * 0.7);
        g.fillCircle(p.x, p.y, p.size * (1.6 - a * 0.6));
      } else {
        const r = p.size;
        const c = Math.cos(p.spin) * r;
        const s = Math.sin(p.spin) * r;
        g.fillStyle(p.color, a);
        if (p.shape === 'shard')
          g.fillTriangle(p.x - c, p.y - s, p.x + c, p.y + s, p.x - s * 0.3, p.y + c * 0.3);
        else g.fillRect(p.x - r / 2, p.y - r / 2, r, r);
      }
    }
  }
}
