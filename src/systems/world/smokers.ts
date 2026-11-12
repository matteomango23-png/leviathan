// The black smokers of the trenches (lot M4, owner 12 novembre 2026: "il fondale vivo"): painted chimneys of black
// rock on the floor of the Grandi fosse and the Abisso, each mouth breathing a plume of hot black water. Swimming in
// a plume burns (a heart every ENDLESS.smokers.burnEvery seconds); in a vehicle nothing happens. Placed by the seed,
// like the air vents (endless.ts ventsOf), never on one. Pure logic.
import { ENDLESS } from '../../data/endless';
import { TILE } from '../../data/worldLayout';
import { PROP_ART } from '../../data/worldArt';
import { hash2 } from '../math';
import type { GameEvent } from '../events';
import { hurtDiver, type Hurtable } from '../diver';
import { endlessTile, ventsOf } from './endless';
import { biomeOf, stretchAt } from './stretches';

export interface Smoker {
  x: number;
  /** The floor under its middle. */
  y: number;
  /** Which picture (PROP_ART.smokers). */
  art: number;
}

const cache = new Map<number, Smoker[]>();

/** The first rock going down at x: the floor, or a mound on it. */
function floorAt(x: number): number {
  let y = 120;
  while (y < ENDLESS.maxFloorY + 200 && endlessTile(x, y) !== TILE.rock) y += 4;
  return y - 4;
}

/** The smokers of a stretch: only where the trench biome is, on its floor, clear of the vents. */
export function smokersOf(k: number): Smoker[] {
  if (k < 0) return [];
  const hit = cache.get(k);
  if (hit) return hit;
  const S = ENDLESS.smokers;
  const out: Smoker[] = [];
  if (biomeOf(k).id === S.biome) {
    const x0 = ENDLESS.startX + k * ENDLESS.stretch + ENDLESS.blend / 2;
    const span = ENDLESS.stretch - ENDLESS.blend;
    const vents = ventsOf(k);
    for (let i = 0; i < S.perStretch; i++) {
      // the deepest of a few places (the bottom of the trench), never by a vent nor on another smoker
      let best: Smoker | null = null;
      for (let t = 0; t < S.tries; t++) {
        const x = x0 + hash2(k * 7.3 + i * 17 + t * 1.9, ENDLESS.seed + 57) * span;
        if (vents.some((v) => Math.abs(v.x - x) < S.clearOfVent)) continue;
        if (out.some((o) => Math.abs(o.x - x) < S.clearOfVent)) continue;
        const y = floorAt(x);
        if (!best || y > best.y)
          best = { x, y, art: Math.floor(hash2(k + i * 3.1, 91) * PROP_ART.smokers.length) };
      }
      if (best) out.push(best);
    }
  }
  cache.set(k, out);
  return out;
}

/** A smoker's picture size (units) and where its mouths are, standing with its bottom at `bottom`. */
export function smokerMouths(s: Smoker, bottom: number): { x: number; y: number }[] {
  const def = PROP_ART.smokers[s.art]!;
  const h = def.width * def.aspect;
  return def.mouths.map(([u, v]) => ({ x: s.x + (u - 0.5) * def.width, y: bottom - h + v * h }));
}

/** Is this point in the hot plume of a smoker's mouth? (its picture stands with its bottom on the floor) */
export function inPlume(x: number, y: number): boolean {
  if (x < ENDLESS.startX) return false;
  const S = ENDLESS.smokers;
  const k = stretchAt(x);
  for (const kk of [k - 1, k, k + 1])
    for (const s of smokersOf(kk))
      for (const m of smokerMouths(s, s.y)) {
        const up = m.y - y;
        if (up < -4 || up > S.plumeHeight) continue;
        if (Math.abs(x - m.x) < S.plumeRadius + up * S.plumeGrow) return true;
      }
  return false;
}

/** Swimming in a plume: a heart now and then (`timer.burn` counts down between them). */
export function stepSmokers(
  diver: Hurtable & { x: number; y: number },
  inVehicle: boolean,
  dt: number,
  timer: { burn?: number },
  events: GameEvent[],
): void {
  timer.burn = Math.max(0, (timer.burn ?? 0) - dt);
  if (diver.dead || inVehicle || !inPlume(diver.x, diver.y) || timer.burn > 0) return;
  timer.burn = ENDLESS.smokers.burnEvery;
  events.push({ type: 'smokerBurn' });
  hurtDiver(diver, 1, events);
}
