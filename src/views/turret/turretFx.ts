// The turret's shots and what they do (owner, 17 novembre 2026: "come arrivano contro la nave avversaria i botti"):
// the machine gun's glowing tracers, the shells in their arcs (theirs glowing red, so you see them come), white
// columns of sea where they fall, sparks where the bullets strike, fire and smoke where a shell bursts on a hull, the
// flash of the enemy's gun. Every effect stays where it happened at sea while you sail and turn. Look only.
import Phaser from 'phaser';
import type { DuelEvent } from '../../systems/turret/duel';
import type { DuelState } from '../../systems/turret/duelState';
import { project, type Camera, type P3 } from '../../systems/turret/projection';
import type { SoftPuffs } from '../softPuffs';
import { through, type TurretColours } from './turretLook';

interface Fx {
  kind: 'splash' | 'sparks' | 'burst' | 'flash' | 'bigSplash';
  p: P3;
  t: number;
  life: number;
  seed: number;
}

/** How long each lasts (s). Tuning. */
const LIFE = { splash: 0.9, bigSplash: 1.6, sparks: 0.35, burst: 2.2, flash: 0.25 };

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

  onEvents(events: DuelEvent[]): void {
    const add = (kind: Fx['kind'], p: P3): void => {
      this.fx.push({ kind, p: { ...p }, t: 0, life: LIFE[kind], seed: Math.random() * 10 });
    };
    for (const e of events) {
      if (e.type === 'splash') add(e.kind === 'mg' ? 'splash' : 'bigSplash', e.p);
      else if (e.type === 'hit' && e.target === 'foe') add(e.kind === 'mg' ? 'sparks' : 'burst', e.p);
      else if (e.type === 'foeFlash' || e.type === 'foeShot') add('flash', e.p);
    }
  }

  update(cam: Camera, c: TurretColours, d: DuelState, dt: number, lights: SoftPuffs, smoke: SoftPuffs): void {
    const g = this.lines.clear();
    const flat = { ...cam, roll: 0 };
    const at = (p: P3): { x: number; y: number; scale: number } | null => {
      const s = project(flat, { a: p.a - d.you.a, s: p.s - d.you.s, z: p.z });
      return s && { x: s.x - cam.w / 2, y: s.y - cam.h / 2, scale: s.scale };
    };
    // the rounds in the air
    for (const r of d.rounds) {
      const head = at(r.p);
      const tail = at({ a: r.p.a - r.v.a * 0.035, s: r.p.s - r.v.s * 0.035, z: r.p.z - r.v.z * 0.035 });
      if (!head || !tail) continue;
      if (r.kind === 'mg') {
        // a thin glowing streak: never a slab, even just out of the barrel
        const width = Math.max(1, Math.min(3, head.scale * 0.12));
        g.lineStyle(width, 0xffd090, 0.95).lineBetween(tail.x, tail.y, head.x, head.y);
        g.lineStyle(width * 2.6, 0xff7a2a, 0.22).lineBetween(tail.x, tail.y, head.x, head.y);
      } else {
        const theirs = r.from === 'foe';
        const size = Math.max(5, Math.min(16, head.scale * 1.6));
        lights.puff(head.x, head.y, size, theirs ? 0xff4a2a : 0xffd27a, 0.9);
        smoke.puff(tail.x, tail.y, size * 0.8, 0x8a8580, 0.3);
      }
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
        for (let i = 0; i < 4; i++) {
          const a = f.seed + i * 1.7;
          const r = (0.4 + k * 1.6) * m;
          g.lineStyle(Math.max(1, m * 0.12), 0xffd890, 1 - k).lineBetween(
            s.x,
            s.y,
            s.x + Math.cos(a) * r,
            s.y + Math.sin(a) * r - k * m,
          );
        }
        lights.puff(s.x, s.y, 1.5 * m, 0xffb060, 0.8 * (1 - k));
      } else if (f.kind === 'burst') {
        lights.puff(s.x, s.y, 5 * m * (0.6 + k), 0xff9a40, 0.95 * Math.max(0, 1 - k * 2));
        lights.puff(s.x, s.y, 2.4 * m, 0xfff0c0, 0.9 * Math.max(0, 1 - k * 5));
        for (let i = 0; i < 4; i++)
          smoke.puff(
            s.x + Math.sin(f.seed + i) * 2 * m,
            s.y - k * 9 * m - i * m,
            (2.5 + k * 5) * m,
            0x262220,
            0.5 * (1 - k),
          );
      } else lights.puff(s.x, s.y, 4 * m, 0xffc060, 0.95 * (1 - k));
    }
  }
}
