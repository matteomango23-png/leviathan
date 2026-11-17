// The turret's shots and what they do (owner, 17 novembre 2026: "come arrivano contro la nave avversaria i botti"):
// the machine gun's glowing tracers, the shells in their arcs (theirs glowing red, so you see them come), white
// columns of sea where they fall, sparks where the bullets strike, fire and smoke where a shell bursts on a hull, the
// flash of the enemy's gun. Every effect stays where it happened at sea while you sail and turn. Look only.
import Phaser from 'phaser';
import { MACHINE_GUN } from '../../data/turret';
import { yourWay } from '../../systems/turret/darts';
import type { InsideEvent } from '../../systems/turret/inside';
import type { InsideState } from '../../systems/turret/insideState';
import { project, type Camera, type P3 } from '../../systems/turret/projection';
import type { SoftPuffs } from '../softPuffs';
import { through, type TurretColours } from './turretLook';

interface Fx {
  kind: 'splash' | 'sparks' | 'burst' | 'flash' | 'bigSplash' | 'deep' | 'thud';
  p: P3;
  t: number;
  life: number;
  seed: number;
}

/** A streak's tail drawn no farther than `most` pixels from its head: just out of the barrel, right by the glass, the
 *  perspective threw a tail across the whole view (owner, 17 novembre 2026: "spara dei colpi tutti verso destra"). */
function shortTail(
  head: { x: number; y: number },
  tail: { x: number; y: number },
  most: number,
): { x: number; y: number } {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy);
  if (len <= most) return tail;
  return { x: head.x + (dx / len) * most, y: head.y + (dy / len) * most };
}

/** Darts and tracers are not drawn nearer than this to the eye (m): there they would only be a smear. Tuning. */
const NEAR_M = 6;

/** How long each lasts (s). Tuning. */
const LIFE = { splash: 0.9, bigSplash: 1.8, sparks: 0.9, burst: 2.8, flash: 0.25, deep: 2.4, thud: 1.2 };

export class TurretFx {
  private fx: Fx[] = [];
  private readonly lines: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, box: Phaser.GameObjects.Container) {
    this.lines = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    box.add(this.lines);
  }

  /** The tracers' layer (TurretScene keeps it over the ship). */
  get layer(): Phaser.GameObjects.Graphics {
    return this.lines;
  }

  onEvents(events: InsideEvent[]): void {
    const add = (kind: Fx['kind'], p: P3): void => {
      this.fx.push({ kind, p: { ...p }, t: 0, life: LIFE[kind], seed: Math.random() * 10 });
    };
    for (const e of events) {
      if (e.type === 'splash') add(e.kind === 'mg' ? 'splash' : 'bigSplash', e.p);
      else if (e.type === 'hit' && e.target === 'foe') add(e.kind === 'mg' ? 'sparks' : 'burst', e.p);
      else if (e.type === 'dartHit') add('thud', e.p);
      else if (e.type === 'foeFlash' || e.type === 'foeShot') add('flash', e.p);
      else if (e.type === 'torpHit') {
        add('deep', e.p);
        add('bigSplash', { ...e.p, z: 0 });
      } else if (e.type === 'chargeBurst') {
        add('deep', e.p);
        // a shallow charge throws up a dome of sea
        if (e.p.z > -30) add('bigSplash', { ...e.p, z: 0 });
      }
    }
  }

  update(
    cam: Camera,
    c: TurretColours,
    d: InsideState,
    dt: number,
    lights: SoftPuffs,
    smoke: SoftPuffs,
  ): void {
    const g = this.lines.clear();
    const flat = { ...cam, roll: 0 };
    const at = (p: P3): { x: number; y: number; scale: number } | null => {
      const s = project(flat, { a: p.a - d.you.a, s: p.s - d.you.s, z: p.z });
      return s && { x: s.x - cam.w / 2, y: s.y - cam.h / 2, scale: s.scale };
    };
    // the rounds in the air (your tracers streak along their way as seen from aboard)
    const way = yourWay(d);
    for (const r of d.rounds) {
      const head = at(r.p);
      const k = r.kind === 'mg' && r.from === 'you' ? 1 : 0;
      const rv = { a: r.v.a - way.a * k, s: r.v.s - way.s * k, z: r.v.z };
      const back = at({ a: r.p.a - rv.a * 0.035, s: r.p.s - rv.s * 0.035, z: r.p.z - rv.z * 0.035 });
      if (!head || !back) continue;
      if (Math.hypot(r.p.a - d.you.a, r.p.s - d.you.s, r.p.z - cam.height) < NEAR_M) continue;
      const tail = shortTail(head, back, Math.max(24, head.scale * 6));
      if (r.kind === 'mg') {
        // a thin glowing streak: never a slab, even just out of the barrel
        const [lo, hi] = MACHINE_GUN.tracer;
        const width = Math.max(lo, Math.min(hi, head.scale * 0.16));
        g.lineStyle(width, 0xffd090, 0.95).lineBetween(tail.x, tail.y, head.x, head.y);
        g.lineStyle(width * 2.6, 0xff7a2a, 0.22).lineBetween(tail.x, tail.y, head.x, head.y);
      } else {
        const theirs = r.from !== 'you';
        const size = Math.max(5, Math.min(16, head.scale * 1.6));
        lights.puff(head.x, head.y, size, theirs ? 0xff4a2a : 0xffd27a, 0.9);
        smoke.puff(tail.x, tail.y, size * 0.8, 0x8a8580, 0.3);
      }
    }
    // torpedoes and their wakes of bubbles; charges sinking
    for (const tp of d.torpedoes) {
      tp.trail.forEach((q, i) => {
        if (i % 3) return;
        const s = at(q);
        if (s)
          smoke.puff(
            s.x,
            s.y,
            Math.max(2, Math.min(14, s.scale * 0.9)),
            0xdcecf0,
            0.45 * (i / tp.trail.length),
          );
      });
      const head = at(tp.p);
      if (head) {
        smoke.puff(head.x, head.y, Math.max(3, Math.min(18, head.scale * 0.8)), 0x101417, 0.95);
        if (tp.from !== 'you')
          lights.puff(head.x, head.y, Math.max(4, Math.min(20, head.scale)), 0xff3a20, 0.5);
      }
    }
    // the harpoon gun's darts: a steel streak along their way as seen from aboard, and the bubbles behind it
    for (const r of d.darts) {
      const head = at(r.p);
      const rel = { a: r.v.a - way.a, s: r.v.s - way.s, z: r.v.z };
      const back = at({ a: r.p.a - rel.a * 0.03, s: r.p.s - rel.s * 0.03, z: r.p.z - rel.z * 0.03 });
      if (!head || !back) continue;
      if (Math.hypot(r.p.a - d.you.a, r.p.s - d.you.s, r.p.z - cam.height) < NEAR_M) continue;
      const tail = shortTail(head, back, Math.max(14, head.scale * 2.5));
      g.lineStyle(Math.max(1, Math.min(3, head.scale * 0.1)), 0xcfe6ea, 0.9).lineBetween(
        tail.x,
        tail.y,
        head.x,
        head.y,
      );
      smoke.puff(tail.x, tail.y, Math.max(2, Math.min(10, back.scale * 0.6)), 0xdcecf0, 0.35);
    }
    for (const ch of d.charges) {
      const s = at(ch.p);
      if (s) smoke.puff(s.x, s.y, Math.max(3, Math.min(16, s.scale * 0.9)), 0x15120f, 0.95);
    }
    this.fx = this.fx.filter((f) => (f.t += dt) < f.life);
    for (const f of this.fx) {
      const s = at(f.p);
      if (!s) continue;
      const k = f.t / f.life;
      const dist = Math.hypot(f.p.a - d.you.a, f.p.s - d.you.s);
      const seen = Math.max(0.15, through(c, dist));
      const m = s.scale; // pixels per metre there
      if (f.kind === 'splash' || f.kind === 'bigSplash') {
        // a column of white sea thrown up and falling back
        const tall = (f.kind === 'bigSplash' ? 11 : 2.4) * m * Math.sin(Math.min(1, k * 1.4) * Math.PI);
        const wide = (f.kind === 'bigSplash' ? 2.6 : 0.8) * m;
        for (let i = 0; i < 4; i++)
          smoke.puff(
            s.x + (i - 1.5) * wide * 0.35,
            s.y - tall * (0.25 + i * 0.2),
            wide * (0.7 + i * 0.15),
            0xeaf3f6,
            0.65 * (1 - k) * seen,
          );
      } else if (f.kind === 'sparks') {
        // sparks and splinters flying off, falling; a little smoke stays where it struck
        const fly = Math.min(1, k * 2.5);
        for (let i = 0; i < 6; i++) {
          const a = f.seed + i * 1.1;
          const r = (0.5 + fly * 2.2) * m;
          const fall = fly * fly * 1.6 * m;
          g.lineStyle(Math.max(1, m * 0.12), i % 2 ? 0xffd890 : 0xfff2c8, Math.max(0, 1 - fly)).lineBetween(
            s.x + Math.cos(a) * r * 0.6,
            s.y + Math.sin(a) * r * 0.6 - m * 0.5 + fall,
            s.x + Math.cos(a) * r,
            s.y + Math.sin(a) * r - m * 0.5 + fall,
          );
        }
        lights.puff(s.x, s.y, 2 * m, 0xffb060, 0.9 * Math.max(0, 1 - k * 3));
        smoke.puff(s.x, s.y - k * 2.5 * m, (0.8 + k * 1.8) * m, 0x2a2622, 0.4 * (1 - k) * seen);
      } else if (f.kind === 'burst') {
        lights.puff(s.x, s.y, 7 * m * (0.6 + k), 0xff9a40, 0.95 * Math.max(0, 1 - k * 2));
        lights.puff(s.x, s.y, 3.4 * m, 0xfff0c0, 0.9 * Math.max(0, 1 - k * 5));
        for (let i = 0; i < 6; i++)
          smoke.puff(
            s.x + Math.sin(f.seed + i) * 2 * m,
            s.y - k * 9 * m - i * m,
            (2.5 + k * 5) * m,
            0x262220,
            0.5 * (1 - k),
          );
      } else if (f.kind === 'thud') {
        // a dart in the hull: a puff of bubbles and a dull flash
        lights.puff(s.x, s.y, 1.2 * m, 0xbfe4ff, 0.6 * Math.max(0, 1 - k * 4));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + f.seed;
          smoke.puff(
            s.x + Math.cos(a) * (0.5 + k * 2) * m,
            s.y - k * 3 * m + Math.sin(a) * m,
            (0.5 + k) * m,
            0xdcecf0,
            0.5 * (1 - k),
          );
        }
      } else if (f.kind === 'deep') {
        // under the water: a flash, then a ball of bubbles bursting and rising
        lights.puff(s.x, s.y, 6 * m, 0xfff0c0, 0.9 * Math.max(0, 1 - k * 4));
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + f.seed;
          const r = (2 + k * 9) * m;
          smoke.puff(
            s.x + Math.cos(a) * r,
            s.y + Math.sin(a) * r - k * 6 * m,
            (1 + k * 2) * m,
            0xdcecf0,
            0.6 * (1 - k),
          );
        }
      } else lights.puff(s.x, s.y, 4 * m, 0xffc060, 0.95 * (1 - k));
    }
  }
}
