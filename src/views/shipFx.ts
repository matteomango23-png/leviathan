// Effects around the ship (owner, 8 ottobre 2026): smoke from the stacks like a steam train (drawn behind the
// ship), the wave breaking on the bow, and shards of ice flung up while the bow breaks the sheet. Look only.
import Phaser from 'phaser';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { shipArt, shipLength, shipPicture, shipTopSpeed } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';

export class ShipFx {
  /** The puffs in the air (look only), and how many each stack owes (a fraction of a puff carried over). */
  private puffs: { x: number; y: number; vy: number; r: number; age: number; seed: number }[] = [];
  private readonly smokeDue: number[] = [];
  /** Shards of ice in the air or floating (look only), and the fraction of a shard owed. */
  private shards: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    size: number;
    age: number;
  }[] = [];
  private shardDue = 0;

  /** @param back drawn behind the ship (the smoke) @param front over it (the wave, the shards) */
  constructor(
    private readonly back: Phaser.GameObjects.Graphics,
    private readonly front: Phaser.GameObjects.Graphics,
  ) {}

  /**
   * Smoke from the stacks while the engine runs, like a steam train: each puff is born at the stack and then stays
   * in the air (only rising and drifting with the wind), so when the ship sails the puffs left behind make a long
   * trail; they swell and fade from near black to grey. The throttle makes more of them; off, none are born and the
   * last ones fade away.
   */
  smoke(s: ShipState, at: (u: number, v: number) => { x: number; y: number }, dt: number): void {
    this.back.clear();
    const S = SHIP.smoke;
    const scale = shipLength(s) / 180; // bigger ships, bigger smoke
    if (s.engineOn) {
      const rate = S.idleRate + (S.fullRate - S.idleRate) * s.prop;
      for (const [i, st] of (shipArt(s).stacks ?? []).entries()) {
        this.smokeDue[i] = (this.smokeDue[i] ?? 0) + rate * st.size * dt;
        const base = at(st.u, st.v);
        while ((this.smokeDue[i] ?? 0) >= 1 && this.puffs.length < S.max) {
          this.smokeDue[i]! -= 1;
          this.puffs.push({
            x: base.x + (Math.random() - 0.5) * 2,
            y: base.y,
            vy: -S.lift * (0.7 + 0.6 * s.prop) * (0.8 + Math.random() * 0.4),
            r: S.size * st.size * scale * (0.5 + 0.5 * s.prop) * (0.8 + Math.random() * 0.4), // more gas, bigger puffs
            age: 0,
            seed: Math.random() * 10,
          });
        }
      }
    }
    for (const p of this.puffs) {
      p.age += dt / S.life;
      p.x += S.wind * dt;
      p.y += p.vy * dt;
      p.vy *= Math.exp(-S.liftDrag * dt);
    }
    this.puffs = this.puffs.filter((p) => p.age < 1);
    // oldest first, so the young dark puffs at the stack are drawn on top
    for (const p of this.puffs) {
      const r = p.r * (1 + p.age * S.swell);
      const shade = Math.round(0x26 + (0x7a - 0x26) * Math.min(1, p.age * 1.6));
      const color = (shade << 16) | ((shade - 2) << 8) | (shade - 6);
      const alpha = S.alpha * (1 - p.age) * Math.min(1, p.age * 12);
      this.back.fillStyle(color, alpha);
      // a little cloud of three overlapping lumps, not a single disc
      for (let k = 0; k < 3; k++) {
        const a = p.seed + k * 2.1;
        this.back.fillCircle(p.x + Math.cos(a) * r * 0.45, p.y + Math.sin(a) * r * 0.3, r * (0.75 + 0.1 * k));
      }
    }
  }

  /**
   * The wave breaking on the bow (owner, 8 ottobre: one puff of foam was not enough): the water pushed up into a
   * mound along the front of the hull, rippling, its crest white with foam, and spray thrown forward and up. All of
   * it grows with the speed.
   */
  bowWave(s: ShipState, bow: number, y: number, k: number, planing: number, time: number): void {
    const g = this.front;
    const f = s.face;
    const scale = shipLength(s) / 180;
    const len = (18 + 70 * k) * scale; // how far back along the hull the mound runs
    const H = (2 + 14 * k) * Math.sqrt(scale); // its height at the bow
    const height = (t: number): number => {
      const swell = Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)); // up at the bow, down along the hull
      const ripple = 1 + 0.18 * Math.sin(t * 11 - time * 9) + 0.08 * Math.sin(t * 23 + time * 14);
      return H * swell * ripple;
    };
    const N = 30; // points along the crest: close enough for the foam to read as one frothing line
    const crest: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      crest.push({ x: bow + f * 2 - f * t * len, y: y - height(t) });
    }
    // the mound of water, green-blue and see-through
    g.fillStyle(0x9fc8d4, 0.45 * Math.min(1, k * 1.6));
    g.fillPoints(
      [{ x: bow + f * 3, y }, ...crest, { x: bow - f * len, y: y + 1 }].map(
        (p) => new Phaser.Math.Vector2(p.x, p.y),
      ),
      true,
    );
    // its crest: foam that froths and breaks, thicker near the bow
    for (const [i, p] of crest.entries()) {
      const t = i / N;
      const froth = 0.6 + 0.4 * Math.sin(time * 13 + i * 1.9);
      g.fillStyle(0xf4fbfc, (0.75 - 0.5 * t) * Math.min(1, k * 1.8) * froth);
      g.fillCircle(p.x, p.y + 0.4, (1.2 + 2.4 * k * (1 - t)) * Math.sqrt(scale));
    }
    // spray thrown forward and up, falling back (each drop's flight comes from the time)
    const drops = Math.round(6 + 22 * k + 10 * planing);
    for (let i = 0; i < drops; i++) {
      const seed = (i * 0.618) % 1;
      const t = (time * (1.4 + k) + seed) % 1;
      const fly = t * 0.7;
      const vx = f * (8 + 45 * k) * (0.4 + seed);
      const vy = -(15 + 55 * k) * (0.5 + ((i * 0.37) % 1));
      const px = bow + f * 2 + vx * fly;
      const py = y - H * 0.5 + vy * fly + 0.5 * 140 * fly * fly;
      if (py > y + 1) continue;
      g.fillStyle(0xffffff, 0.75 * (1 - t) * Math.min(1, k * 2));
      g.fillCircle(px, py, (0.5 + 0.9 * k * (1 - t)) * Math.sqrt(scale));
    }
  }

  /**
   * Shards of ice flung up while the bow breaks the sheet (owner, 8 ottobre): they tumble, fall back and float a
   * moment on the water, then melt away.
   */
  iceShards(s: ShipState, dt: number): void {
    const g = this.front;
    const k = Math.min(1, s.speed / shipTopSpeed(s));
    if (s.iceT > 0 && s.speed > 2) {
      const nose = s.x + s.face * shipLength(s) * (shipPicture(s).bowU - 0.5); // the bow at the water
      this.shardDue += (25 + 70 * k) * dt;
      while (this.shardDue >= 1 && this.shards.length < 160) {
        this.shardDue -= 1;
        this.shards.push({
          x: nose - s.face * Math.random() * 12,
          y: WORLD.surfaceY - 1,
          vx: s.face * (15 + 70 * k) * Math.random() + (Math.random() - 0.5) * 30,
          vy: -(30 + 80 * k) * (0.3 + Math.random() * 0.7),
          rot: Math.random() * 6.3,
          vr: (Math.random() - 0.5) * 14,
          size: 1.2 + Math.random() * 2.6,
          age: 0,
        });
      }
    }
    const G = 240; // units/s² down
    for (const p of this.shards) {
      p.age += dt;
      if (p.y < WORLD.surfaceY || p.vy < 0) {
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      } else {
        // on the water: it floats, drifting a little
        p.y = WORLD.surfaceY;
        p.vx *= Math.exp(-3 * dt);
        p.x += p.vx * dt;
      }
    }
    this.shards = this.shards.filter((p) => p.age < 2.2);
    for (const p of this.shards) {
      const a = Math.min(1, (2.2 - p.age) / 0.8);
      const pts = [0, 2.2, 4.1].map((q, i) => {
        const r = p.size * (i === 1 ? 0.7 : 1);
        return new Phaser.Math.Vector2(p.x + Math.cos(p.rot + q) * r, p.y + Math.sin(p.rot + q) * r);
      });
      g.fillStyle(0xe6f6fc, 0.9 * a).fillPoints(pts, true);
      g.lineStyle(0.4, 0x8fbccc, 0.8 * a).strokePoints(pts, true);
    }
  }
}
