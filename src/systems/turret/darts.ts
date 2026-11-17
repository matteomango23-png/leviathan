// The harpoon gun under the water (owner, 17 novembre 2026: under the water only the torpedo worked, "non so se è un
// problema"): long darts fired while held, straight and quick but soon spent, trailing bubbles; each strikes a hull
// it meets under the water. Numbers in data/turret.ts HARPOON_GUN. Pure logic.
import { HARPOON_GUN } from '../../data/turret';
import type { Rng } from '../math';
import { strikesAny, type DuelHull } from './ballistics';
import type { InsideState } from './insideState';
import type { P3 } from './projection';

export type DartEvent = { type: 'dartHit'; foe: number; p: P3; u: number; v: number };

/** Your ship's own way (m/s along the plane): a dart leaves with it, so from aboard it flies straight where you aim
 *  (owner, 17 novembre 2026: without it, sailing fast, the slow darts fell back and all seemed to veer aside). */
export const yourWay = (d: InsideState): { a: number; s: number } => ({
  a: Math.cos(d.you.heading) * d.you.speed,
  s: Math.sin(d.you.heading) * d.you.speed,
});

/** Fires a dart from p along yaw/pitch, a little off, carried by your ship's way. */
export function fireDart(d: InsideState, p: P3, yaw: number, pitch: number, rng: Rng): void {
  const H = HARPOON_GUN;
  const y = yaw + (rng() * 2 - 1) * H.spread;
  const t = pitch + (rng() * 2 - 1) * H.spread;
  const way = yourWay(d);
  d.darts.push({
    id: d.nextId++,
    p: { ...p },
    v: {
      a: Math.cos(t) * Math.cos(y) * H.speed + way.a,
      s: Math.cos(t) * Math.sin(y) * H.speed + way.s,
      z: Math.sin(t) * H.speed,
    },
    left: H.rangeM,
  });
}

/** A step of every dart: the hulls they strike; spent, or out of the water, they are gone. */
export function stepDarts(d: InsideState, foes: DuelHull[], dt: number): DartEvent[] {
  const out: DartEvent[] = [];
  d.darts = d.darts.filter((r) => {
    const p0 = { ...r.p };
    r.p.a += r.v.a * dt;
    r.p.s += r.v.s * dt;
    r.p.z += r.v.z * dt;
    r.left -= Math.hypot(r.p.a - p0.a, r.p.s - p0.s, r.p.z - p0.z);
    const hit = strikesAny(foes, p0, r.p);
    if (hit && hit.hull.id !== 'you') {
      out.push({ type: 'dartHit', foe: hit.hull.id, p: hit.p, u: hit.u, v: hit.v });
      return false;
    }
    return r.left > 0 && r.p.z < 0;
  });
  return out;
}
