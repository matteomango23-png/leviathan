// Shells, torpedoes and depth charges on their way (owner, 17 novembre 2026): a shell flies in an arc and bursts on
// what it hits or on the water; a torpedo runs straight under the water until it hits or runs out; a charge sinks to
// its depth and bursts there. A burst hurts every hull of the other side within its blast. Numbers in data/company.ts
// WEAPONS. Pure logic.
import { WEAPONS, type WeaponId } from '../../data/company';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { Rng } from '../math';
import { metres, type CompanyState, type Shot } from './enemyState';

/** A hull that can be hit: its box in the world and what a hit does to it. */
export interface Hittable {
  side: 'you' | 'enemy';
  box: { x0: number; x1: number; y0: number; y1: number };
  hit: (damage: number) => void;
}

/** The angle to throw a shell at speed v (units/s) under gravity g (units/s²) from a to b, the low arc; null: out of
 *  reach. */
export function lobAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  v: number,
  g: number,
): number | null {
  const dx = b.x - a.x;
  const dy = a.y - b.y; // up > 0
  const ax = Math.abs(dx);
  const v2 = v * v;
  const root = v2 * v2 - g * (g * ax * ax + 2 * dy * v2);
  if (root < 0 || ax < 1) return null;
  const up = Math.atan((v2 - Math.sqrt(root)) / (g * ax)); // radians above the horizon
  return dx >= 0 ? -up : Math.PI + up; // screen angle (y down)
}

/** Fires a shell from a at b; false when b is out of reach. */
export function fireShell(
  c: CompanyState,
  weapon: WeaponId,
  from: Shot['from'],
  a: { x: number; y: number },
  b: { x: number; y: number },
  rng: Rng,
): boolean {
  const w = WEAPONS[weapon];
  const v = metres(w.speed);
  const angle = lobAngle(a, b, v, metres(w.gravity ?? 0));
  if (angle === null || Math.abs(b.x - a.x) > metres(w.rangeM)) return false;
  const off = (rng() * 2 - 1) * (w.spread ?? 0);
  c.shots.push({
    id: c.nextId++,
    weapon,
    from,
    x: a.x,
    y: a.y,
    vx: Math.cos(angle + off) * v,
    vy: Math.sin(angle + off) * v,
    left: 0,
    fuseY: 0,
  });
  return true;
}

/** How steeply a torpedo may run up or down to its target (radians off the level). Tuning. */
const TORPEDO_SLOPE = 0.35;

/** Fires a torpedo from a, ahead (face) and straight towards b's depth, no steeper than TORPEDO_SLOPE. */
export function fireTorpedo(
  c: CompanyState,
  from: Shot['from'],
  a: { x: number; y: number },
  b: { x: number; y: number },
  face: 1 | -1,
): void {
  const w = WEAPONS.siluro;
  const v = metres(w.speed);
  const slope = Math.max(
    -TORPEDO_SLOPE,
    Math.min(TORPEDO_SLOPE, Math.atan2(b.y - a.y, Math.abs(b.x - a.x) || 1)),
  );
  c.shots.push({
    id: c.nextId++,
    weapon: 'siluro',
    from,
    x: a.x,
    y: a.y,
    vx: face * Math.cos(slope) * v,
    vy: Math.sin(slope) * v,
    left: metres(w.rangeM),
    fuseY: 0,
  });
}

/** Rolls a depth charge off the stern at a; it bursts at fuseY (world y), no deeper than its reach. */
export function dropCharge(
  c: CompanyState,
  from: Shot['from'],
  a: { x: number; y: number },
  fuseY: number,
): void {
  const w = WEAPONS.carica;
  const deepest = WORLD.surfaceY + metres(w.rangeM);
  c.shots.push({
    id: c.nextId++,
    weapon: 'carica',
    from,
    x: a.x,
    y: a.y,
    vx: 0,
    vy: metres(w.speed),
    left: 0,
    fuseY: Math.min(fuseY, deepest),
  });
}

const inside = (b: Hittable['box'], x: number, y: number, pad = 0): boolean =>
  x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;

/** A burst at (x, y): every hull of the other side within the blast is hit. */
function burst(s: Shot, targets: Hittable[], events: GameEvent[], onWater: boolean): void {
  const w = WEAPONS[s.weapon];
  const pad = metres(w.blastM);
  let hit = false;
  for (const t of targets) {
    if (t.side === s.from || !inside(t.box, s.x, s.y, pad)) continue;
    t.hit(w.damage);
    hit = true;
  }
  events.push({ type: 'shotBurst', x: s.x, y: s.y, weapon: s.weapon, hit, water: onWater && !hit });
}

/** Moves every shot one step; each bursts on a hull of the other side, on the water (a shell), at the end of its run
 *  (a torpedo) or at its depth (a charge). */
export function stepShots(c: CompanyState, targets: Hittable[], dt: number, events: GameEvent[]): void {
  c.shots = c.shots.filter((s) => {
    const w = WEAPONS[s.weapon];
    if (s.weapon === 'siluro') s.left -= Math.abs(s.vx) * dt;
    if (w.kind === 'shell') s.vy += metres(w.gravity ?? 0) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const struck = targets.some((t) => t.side !== s.from && inside(t.box, s.x, s.y));
    const done =
      struck ||
      (w.kind === 'shell' && s.y >= WORLD.surfaceY) ||
      (w.kind === 'torpedo' && s.left <= 0) ||
      (w.kind === 'charge' && s.y >= s.fuseY);
    if (done) burst(s, targets, events, w.kind === 'shell' && s.y >= WORLD.surfaceY);
    return !done;
  });
}
