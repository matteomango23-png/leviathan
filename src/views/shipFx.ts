// Effects around the ship (owner, 8 ottobre 2026): smoke from the stacks like a steam train (drawn behind the
// ship) and shards of ice flung up while the bow breaks the sheet. Look only.
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
    // the stacks smoke whenever the engine runs; reactors (Poseidon) only while it pushes (owner, 9 ottobre: their
    // fiery picture is gone, smoke instead); a stack under the sea surface (a U-Boat diving) never does
    const sources = s.engineOn
      ? (shipArt(s).stacks ?? [])
          .map((st) => ({ ...at(st.u, st.v), size: st.size * (st.reactor ? s.prop : 1) }))
          .filter((p) => p.y < WORLD.surfaceY && p.size > 0.02)
      : [];
    this.puff(sources, s.prop, shipLength(s) / 180, dt);
  }

  /**
   * The puffs: born at each source (x, y, size), more and bigger with `push` (0…1), then drifting and fading.
   * @param scale how big the vehicle is (1 = a 180-unit ship)
   */
  puff(sources: { x: number; y: number; size: number }[], push: number, scale: number, dt: number): void {
    this.back.clear();
    const S = SHIP.smoke;
    const rate = S.idleRate + (S.fullRate - S.idleRate) * push;
    for (const [i, src] of sources.entries()) {
      this.smokeDue[i] = (this.smokeDue[i] ?? 0) + rate * src.size * dt;
      while ((this.smokeDue[i] ?? 0) >= 1 && this.puffs.length < S.max) {
        this.smokeDue[i]! -= 1;
        this.puffs.push({
          x: src.x + (Math.random() - 0.5) * 2,
          y: src.y,
          vy: -S.lift * (0.7 + 0.6 * push) * (0.8 + Math.random() * 0.4),
          r: S.size * src.size * scale * (0.5 + 0.5 * push) * (0.8 + Math.random() * 0.4), // more gas, bigger puffs
          age: 0,
          seed: Math.random() * 10,
        });
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
