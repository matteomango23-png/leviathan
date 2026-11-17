// The shots at sea (systems/company/ordnance.ts): a shell's dark round with its smoke behind it, a torpedo's wake of
// bubbles, a depth charge's barrel going down; the flash at the gun's mouth, and the bursts — fire and smoke over the
// water, a white column where a shell falls in the sea, a ball of bubbles under it. Their flashes light the dark
// (glowSpots for views/lightView.ts). Look only.
import Phaser from 'phaser';
import { WORLD } from '../data/worldLayout';
import { HALO_TEX, TEX } from './textures';
import type { CompanyState } from '../systems/company/enemyState';
import type { GameEvent } from '../systems/events';

interface Burst {
  x: number;
  y: number;
  t: number;
  /** 'fire' on a hull or the air, 'water' where a shell fell in the sea, 'deep' under the water; 'muzzle': a shot. */
  kind: 'fire' | 'water' | 'deep' | 'muzzle';
  size: number;
}

/** How long each burst lasts (s) and how big it is (units). Tuning. */
const LIFE = { fire: 1.6, water: 1.4, deep: 2.2, muzzle: 0.25 };
const SIZE = { cannoncino: 5, cannone: 7, siluro: 12, carica: 14 } as const;

/** Soft rounds of smoke or light: the lamp's halo picture (a gradient to nothing), tinted, from a pool reused every
 *  frame. Never a drawn disc with an edge (the owner's rule of no circles of code). */
class SoftPuffs {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly add: boolean,
  ) {}

  begin(): void {
    this.used = 0;
  }

  puff(x: number, y: number, r: number, color: number, alpha: number): void {
    if (alpha <= 0.005 || r <= 0) return;
    let im = this.pool[this.used];
    if (!im) {
      im = this.scene.add.image(0, 0, TEX.halo);
      if (this.add) im.setBlendMode(Phaser.BlendModes.ADD);
      this.layer.add(im);
      this.pool.push(im);
    }
    this.used++;
    im.setVisible(true)
      .setPosition(x, y)
      .setScale(r / HALO_TEX.radius)
      .setTint(color)
      .setAlpha(Math.min(1, alpha));
  }

  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }
}

export class OrdnanceView {
  private readonly g: Phaser.GameObjects.Graphics;
  private bursts: Burst[] = [];
  private readonly smoke: SoftPuffs;
  private readonly flare: SoftPuffs;
  /** Where each shot has been lately (its smoke or bubbles). */
  private readonly trails = new Map<number, { x: number; y: number }[]>();

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, glowLayer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
    this.smoke = new SoftPuffs(scene, layer, false);
    this.flare = new SoftPuffs(scene, glowLayer, true);
  }

  /** What the game's events add: a flash at the gun, a burst where a shot ends. */
  onEvent(e: GameEvent): void {
    if (e.type === 'shotFired' && e.weapon !== 'carica' && e.weapon !== 'siluro')
      this.bursts.push({ x: e.x, y: e.y, t: 0, kind: 'muzzle', size: SIZE[e.weapon] });
    else if (e.type === 'shotBurst') {
      const deep = e.y > WORLD.surfaceY + 4;
      const kind = deep ? 'deep' : e.water ? 'water' : 'fire';
      this.bursts.push({ x: e.x, y: e.y, t: 0, kind, size: SIZE[e.weapon] * (e.hit ? 1.4 : 1) });
    }
  }

  update(c: CompanyState, dt: number): void {
    const g = this.g.clear();
    this.smoke.begin();
    this.flare.begin();
    const live = new Set<number>();
    for (const s of c.shots) {
      live.add(s.id);
      const trail = this.trails.get(s.id) ?? [];
      trail.push({ x: s.x, y: s.y });
      if (trail.length > 14) trail.shift();
      this.trails.set(s.id, trail);
      if (s.weapon === 'siluro') {
        trail.forEach((p, i) =>
          g
            .fillStyle(0xd8eef2, 0.45 * (i / trail.length))
            .fillCircle(p.x - Math.sign(s.vx) * i * 0.4, p.y - 1, 0.5 + i * 0.05),
        );
        g.fillStyle(0x1c2226, 1).fillEllipse(s.x, s.y, 7, 1.6);
      } else if (s.weapon === 'carica') {
        g.fillStyle(0x2b2620, 1).fillRect(s.x - 1.2, s.y - 1.6, 2.4, 3.2);
        if (s.y > WORLD.surfaceY)
          g.fillStyle(0xd8eef2, 0.4).fillCircle(s.x + Math.sin(s.y) * 1.5, s.y - 4, 0.6);
      } else {
        // a glowing tracer with its smoke behind: seen from afar, by day and by night
        trail.forEach((p, i) =>
          this.smoke.puff(p.x, p.y, 1.5 + (trail.length - i) * 0.15, 0x8a8580, 0.5 * (i / trail.length)),
        );
        this.flare.puff(s.x, s.y, 4, 0xffb060, 0.9);
        g.fillStyle(0x15120f, 1).fillCircle(s.x, s.y, 1.4);
      }
    }
    for (const id of this.trails.keys()) if (!live.has(id)) this.trails.delete(id);
    this.bursts = this.bursts.filter((b) => (b.t += dt) < LIFE[b.kind]);
    for (const b of this.bursts) this.drawBurst(b);
    this.smoke.end();
    this.flare.end();
  }

  private drawBurst(b: Burst): void {
    const k = b.t / LIFE[b.kind];
    const g = this.g;
    if (b.kind === 'muzzle') {
      this.flare.puff(b.x, b.y, b.size * 0.5 * (1 + k), 0xffd27a, 0.7 * (1 - k));
      this.smoke.puff(b.x, b.y - k * 3, b.size * 0.4 * (1 + 2 * k), 0x9a948c, 0.3 * (1 - k));
      return;
    }
    if (b.kind === 'water') {
      // a white column of sea thrown up, falling back
      const up = b.size * 2.2 * Math.sin(Math.min(1, k * 1.3) * Math.PI);
      for (let i = 0; i < 6; i++) {
        const dx = (i - 2.5) * b.size * 0.12;
        g.fillStyle(0xe8f3f6, 0.5 * (1 - k)).fillEllipse(
          b.x + dx,
          WORLD.surfaceY - (up * (1 - Math.abs(dx) / b.size)) / 2,
          b.size * 0.25,
          up,
        );
      }
      return;
    }
    if (b.kind === 'deep') {
      // a ball of bubbles bursting and rising
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = b.size * (0.3 + k);
        g.fillStyle(0xd8eef2, 0.5 * (1 - k)).fillCircle(
          b.x + Math.cos(a) * r,
          b.y + Math.sin(a) * r - k * b.size,
          0.8 + k,
        );
      }
      this.flare.puff(b.x, b.y, b.size, 0xffe0a0, 0.45 * Math.max(0, 1 - k * 4));
      return;
    }
    // fire and smoke on a hull or in the air
    this.flare.puff(b.x, b.y, b.size * (0.7 + k), 0xffa040, 0.75 * Math.max(0, 1 - k * 2.5));
    this.flare.puff(b.x, b.y, b.size * 0.45, 0xfff0c0, 0.8 * Math.max(0, 1 - k * 5));
    for (let i = 0; i < 5; i++) {
      const dx = Math.sin(b.x + i * 2.3) * b.size * 0.5;
      this.smoke.puff(
        b.x + dx,
        b.y - k * b.size * 1.8 - i,
        b.size * (0.3 + k * 0.7),
        0x2a2622,
        0.4 * (1 - k),
      );
    }
  }

  /** The bursts' flashes light the dark round them (views/lightView.ts). */
  glowSpots(): { x: number; y: number; r: number; a: number }[] {
    return this.bursts
      .filter((b) => b.kind !== 'water' && b.t < 0.5)
      .map((b) => ({ x: b.x, y: b.y, r: b.size * 5, a: 0.8 * (1 - b.t / 0.5) }));
  }
}
