// Under the water in the turret's duel (owner, 17 novembre 2026: "siluri… li porti su e giù"; "deve funzionare
// anche sott'acqua"): your guided torpedo turns towards where the turret points, up and down too; the enemy U-Boat's
// run straight at where you were; the hunting ship's depth charges sink to your depth and burst there. Numbers in
// data/turret.ts TORPEDO_GUIDE and data/company.ts WEAPONS.carica. Pure logic.
import { WEAPONS } from '../../data/company';
import { TORPEDO_GUIDE, UNDERWATER } from '../../data/turret';
import { strikes, type DuelHull } from './ballistics';
import type { DuelState, Torpedo } from './duelState';
import { wrapAngle, type P3 } from './projection';

export type UnderEvent =
  | { type: 'torpHit'; target: 'foe' | 'you'; p: P3; u: number; v: number }
  | { type: 'torpLost'; p: P3 }
  | { type: 'chargeBurst'; p: P3; hit: boolean };

/** Launches a torpedo from p along yaw/pitch. */
export function launchTorpedo(d: DuelState, from: Torpedo['from'], p: P3, yaw: number, pitch: number): void {
  d.torpedoes.push({ id: d.nextId++, from, p: { ...p }, yaw, pitch, left: TORPEDO_GUIDE.rangeM, trail: [] });
}

/** Rolls a depth charge off at p, to burst at the depth `fuse` (z below 0). */
export function dropCharge(d: DuelState, p: P3, fuse: number): void {
  d.charges.push({ id: d.nextId++, p: { ...p, z: 0 }, fuse: Math.max(-UNDERWATER.maxDepthM, fuse) });
}

/** A step of every torpedo and charge: what struck what. Your torpedo keeps to the line of the turret's aim (from
 *  your eye along its yaw and pitch), like a wire-guided one: it steers to the point of that line just ahead of it. */
export function stepUnder(
  d: DuelState,
  foe: DuelHull,
  you: DuelHull,
  aim: { yaw: number; pitch: number; from: P3 },
  dt: number,
): UnderEvent[] {
  const out: UnderEvent[] = [];
  const T = TORPEDO_GUIDE;
  d.torpedoes = d.torpedoes.filter((t) => {
    if (t.from === 'you') {
      // the wire: it steers to the aim's line a little ahead of where it is, no faster than it can turn
      const along = Math.hypot(t.p.a - aim.from.a, t.p.s - aim.from.s) + 15;
      const goal = {
        a: aim.from.a + Math.cos(aim.yaw) * along,
        s: aim.from.s + Math.sin(aim.yaw) * along,
        z: aim.from.z + Math.tan(aim.pitch) * along,
      };
      const wantYaw = Math.atan2(goal.s - t.p.s, goal.a - t.p.a);
      const wantPitch = Math.atan2(goal.z - t.p.z, Math.hypot(goal.a - t.p.a, goal.s - t.p.s));
      const most = T.turn * dt;
      t.yaw = wrapAngle(t.yaw + Math.max(-most, Math.min(most, wrapAngle(wantYaw - t.yaw))));
      t.pitch += Math.max(-most, Math.min(most, wantPitch - t.pitch));
    }
    const v = t.from === 'you' ? T.speed : T.foeSpeed;
    const p0 = { ...t.p };
    t.p.a += Math.cos(t.pitch) * Math.cos(t.yaw) * v * dt;
    t.p.s += Math.cos(t.pitch) * Math.sin(t.yaw) * v * dt;
    // it runs under the water, never out of it, never too deep
    t.p.z = Math.max(-UNDERWATER.maxDepthM, Math.min(-T.depthMin, t.p.z + Math.sin(t.pitch) * v * dt));
    t.left -= v * dt;
    t.trail.push({ ...t.p });
    if (t.trail.length > 30) t.trail.shift();
    const hit = strikes(t.from === 'you' ? foe : you, p0, t.p);
    if (hit) {
      out.push({ type: 'torpHit', target: t.from === 'you' ? 'foe' : 'you', ...hit });
      return false;
    }
    if (t.left <= 0) {
      out.push({ type: 'torpLost', p: t.p });
      return false;
    }
    return true;
  });
  const C = WEAPONS.carica;
  d.charges = d.charges.filter((c) => {
    c.p.z -= C.speed * dt;
    if (c.p.z > c.fuse) return true;
    const near =
      Math.hypot(c.p.a - you.a, c.p.s - you.s, c.p.z - (you.deck - you.keel) / 2) <= C.blastM + you.beam;
    out.push({ type: 'chargeBurst', p: c.p, hit: near });
    return false;
  });
  return out;
}
