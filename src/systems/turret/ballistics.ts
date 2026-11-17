// The rounds of the inside view (owner, 17 novembre 2026: "spari con questa mitragliatrice… tum tum tum"): the
// machine gun's tracers, fast and nearly flat; a gun's shells, slow and falling, to be led and lifted; the enemy's
// shells at you. Each flies in three dimensions until it strikes a hull — a thin wall along the ship, from its keel
// to its deck — or the sea. Where it strikes the hull is given as a point of the ship's picture (u stern → bow,
// v top → bottom), for the parts it hits (company/hullDamage.ts). Pure logic.
import { WEAPONS } from '../../data/company';
import { MACHINE_GUN, TURRET } from '../../data/turret';
import type { Rng } from '../math';
import type { InsideState, Round } from './insideState';
import type { P3 } from './projection';

/** A hull in the view (`id`: a vessel's, or 'you'): its middle, where its bow points (radians), length and beam (m), how deep its keel and how
 *  high its deck (m), and its picture's waterline (share of its height) and height (m). */
export interface DuelHull {
  id: number | 'you';
  a: number;
  s: number;
  heading: number;
  length: number;
  beam: number;
  keel: number;
  deck: number;
  waterline: number;
  picH: number;
}

export type RoundEvent =
  | { type: 'hit'; target: 'foe' | 'you'; foe: number; kind: Round['kind']; p: P3; u: number; v: number }
  | { type: 'splash'; kind: Round['kind']; p: P3 };

/** A round's speed (m/s), fall (m/s²) and reach (m): your gun's shells faster from the turret. */
function ballisticsOf(
  kind: Round['kind'],
  from: Round['from'],
): { speed: number; gravity: number; range: number } {
  if (kind === 'mg')
    return { speed: MACHINE_GUN.speed, gravity: MACHINE_GUN.gravity, range: MACHINE_GUN.rangeM };
  const w = WEAPONS[kind];
  const k = from === 'you' ? TURRET.gunSpeedMult : 1;
  return { speed: w.speed * k, gravity: w.gravity ?? 9.8, range: w.rangeM * 1.6 * k };
}

/** Where a round fired now from p along yaw/pitch would fall in the sea (the gun's mark on the water), or null if
 *  it flies out of reach first. */
export function landingOf(
  from: Round['from'],
  kind: Round['kind'],
  p: P3,
  yaw: number,
  pitch: number,
): P3 | null {
  const b = ballisticsOf(kind, from);
  const v = {
    a: Math.cos(pitch) * Math.cos(yaw) * b.speed,
    s: Math.cos(pitch) * Math.sin(yaw) * b.speed,
    z: Math.sin(pitch) * b.speed,
  };
  const q = { ...p };
  const dt = 0.02;
  for (let flown = 0; flown < b.range;) {
    v.z -= b.gravity * dt;
    q.a += v.a * dt;
    q.s += v.s * dt;
    q.z += v.z * dt;
    flown += Math.hypot(v.a, v.s, v.z) * dt;
    if (q.z <= 0) return { ...q, z: 0 };
  }
  return null;
}

/** Fires a round from p along yaw/pitch (radians), off by up to `spread` either way; `carry`: the ship's own speed
 *  along your course it adds (m/s). */
export function fireRound(
  d: InsideState,
  from: Round['from'],
  kind: Round['kind'],
  p: P3,
  yaw: number,
  pitch: number,
  spread: number,
  rng: Rng,
  carry: { a: number; s: number } = { a: 0, s: 0 },
): void {
  const b = ballisticsOf(kind, from);
  const y = yaw + (rng() * 2 - 1) * spread;
  const t = pitch + (rng() * 2 - 1) * spread;
  const v = b.speed;
  d.rounds.push({
    id: d.nextId++,
    from,
    kind,
    p: { ...p },
    v: {
      a: Math.cos(t) * Math.cos(y) * v + carry.a,
      s: Math.cos(t) * Math.sin(y) * v + carry.s,
      z: Math.sin(t) * v,
    },
    left: b.range,
  });
}

/** The pitch that lands a shell at speed v under gravity g at this distance, `rise` metres higher than it starts
 *  (lower: < 0), on the low arc; null: out of reach. */
export function lobPitch(dist: number, rise: number, v: number, g: number): number | null {
  const v2 = v * v;
  const root = v2 * v2 - g * (g * dist * dist + 2 * rise * v2);
  if (root < 0 || dist < 1) return null;
  return Math.atan((v2 - Math.sqrt(root)) / (g * dist));
}

/** Where along a hull a point is (m from its middle, bow > 0) and off its line (m). */
function local(h: DuelHull, p: { a: number; s: number }): { along: number; off: number } {
  const da = p.a - h.a;
  const ds = p.s - h.s;
  const c = Math.cos(h.heading);
  const s = Math.sin(h.heading);
  return { along: da * c + ds * s, off: -da * s + ds * c };
}

/** A round going from p0 to p1 strikes this hull? Its picture point (u, v) if so. */
export function strikes(h: DuelHull, p0: P3, p1: P3): { p: P3; u: number; v: number } | null {
  const l0 = local(h, p0);
  const l1 = local(h, p1);
  const half = h.beam / 2;
  let k: number | null = null;
  // through its side (the wall along it), or ending inside its beam
  if (Math.sign(l0.off) !== Math.sign(l1.off)) k = l0.off / (l0.off - l1.off);
  else if (Math.abs(l1.off) <= half) k = 1;
  if (k === null) return null;
  const p = { a: p0.a + (p1.a - p0.a) * k, s: p0.s + (p1.s - p0.s) * k, z: p0.z + (p1.z - p0.z) * k };
  const at = local(h, p);
  if (Math.abs(at.along) > h.length / 2 || p.z < -h.keel || p.z > h.deck) return null;
  return { p, u: 0.5 + at.along / h.length, v: h.waterline - p.z / h.picH };
}

/** The first of these hulls a step from p0 to p1 strikes, and where. */
export function strikesAny(
  hulls: DuelHull[],
  p0: P3,
  p1: P3,
): { hull: DuelHull; p: P3; u: number; v: number } | null {
  for (const h of hulls) {
    const hit = strikes(h, p0, p1);
    if (hit) return { hull: h, ...hit };
  }
  return null;
}

/** One step of every round: what it hit (yours strike the vessels, theirs you), or where it fell in the sea. */
export function stepRounds(d: InsideState, foes: DuelHull[], you: DuelHull, dt: number): RoundEvent[] {
  const out: RoundEvent[] = [];
  d.rounds = d.rounds.filter((r) => {
    const p0 = { ...r.p };
    r.v.z -= ballisticsOf(r.kind, r.from).gravity * dt;
    r.p.a += r.v.a * dt;
    r.p.s += r.v.s * dt;
    r.p.z += r.v.z * dt;
    r.left -= Math.hypot(r.p.a - p0.a, r.p.s - p0.s, r.p.z - p0.z);
    const hit = strikesAny(r.from === 'you' ? foes : [you], p0, r.p);
    if (hit) {
      const { hull, ...at } = hit;
      const foe = hull.id === 'you' ? -1 : hull.id;
      out.push({ type: 'hit', target: r.from === 'you' ? 'foe' : 'you', foe, kind: r.kind, ...at });
      return false;
    }
    if (r.p.z <= 0) {
      out.push({ type: 'splash', kind: r.kind, p: { ...r.p, z: 0 } });
      return false;
    }
    return r.left > 0;
  });
  return out;
}
