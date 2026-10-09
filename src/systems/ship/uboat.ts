// The U-Boats (block 4c, owner 9 ottobre 2026): the ship itself dives, with the helm's dive lever, down to its
// model's depth (data/fleet.ts `dive`), its whole hull stopping against rock. Under water it slips beneath the ice
// sheet; its air lasts its model's seconds (a warning 30 s before), then it rises by itself, breaking the ice if it
// is under it, and refills its air afloat. Pure logic; ship.ts calls it every step.
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { shipDraft, shipHull, shipSpan } from './geometry';
import { shipModel } from './model';
import { breakIce, type BrokenIce } from './surface';

interface DiveShip {
  model: string;
  x: number;
  face: 1 | -1;
  dive: number;
  air: number;
  speed: number;
  broken: BrokenIce[];
}

/** Under water (deeper than counts as afloat). */
export const submerged = (s: { dive?: number }): boolean => (s.dive ?? 0) > SHIP.dive.afloatBelow;

/** The deepest it goes: its keel at its model's depth (units under its floating line). */
export function maxDive(s: { model: string }): number {
  const d = shipModel(s).dive;
  return d ? Math.max(0, d.maxDepthM * WORLD.unitsPerMetre - shipDraft(s)) : 0;
}

/** Its keel's depth, in metres. */
export const keelDepthM = (s: { model: string; dive?: number }): number =>
  ((s.dive ?? 0) + shipDraft(s)) / WORLD.unitsPerMetre;

/** Would its hull, at this x and dive, run into rock (or the ice sheet)? Afloat it never does (its own lanes). */
export function hullBlocked(map: TileMap, s: DiveShip, x: number, dive: number): boolean {
  if (dive <= SHIP.dive.afloatBelow) return false;
  return shipHull({ ...s, x, dive }).some((p) => map.hitCircle(p.x, p.y, p.r * 0.9));
}

/** The air it starts with. */
export const fullAir = (s: { model: string }): number => shipModel(s).dive?.airSeconds ?? 0;

/**
 * One step of the dive: the lever (`helm`, null when nobody is at the helm: it holds its depth), the air and, when
 * it is gone, the rise. Returns the ice tiles it broke on an emergency rise.
 */
export function stepDive(
  map: TileMap,
  s: DiveShip,
  helm: HelmState | null,
  dt: number,
  events: GameEvent[],
): number[] {
  const m = shipModel(s).dive;
  if (!m) {
    s.dive = 0;
    return [];
  }
  const D = SHIP.dive;
  const out: number[] = [];
  // the air: it runs out under water, it fills again afloat
  const was = s.air;
  if (submerged(s)) s.air = Math.max(0, s.air - dt);
  else s.air = Math.min(m.airSeconds, s.air + D.refill * dt);
  if (was > D.warnAt && s.air <= D.warnAt && submerged(s)) events.push({ type: 'diveAir' });
  if (was > 0 && s.air <= 0 && submerged(s)) events.push({ type: 'diveSurfacing' });

  // up or down: the lever, or a rise with no air left; afloat it dives again only with some air (owner's rule: it
  // has to come up and breathe)
  let rate = 0;
  if (s.air <= 0 && submerged(s)) rate = -D.emergencyRise;
  else if (helm) rate = helm.dive > 0 ? helm.dive * m.sinkSpeed : helm.dive * m.riseSpeed;
  if (rate > 0 && !submerged(s) && s.air < D.minAir) rate = 0;
  if (rate === 0) return out;
  const deepest = maxDive(s);
  let next = Math.max(0, Math.min(deepest, s.dive + rate * dt));
  if (rate > 0 && next >= deepest && s.dive < deepest) events.push({ type: 'diveTooDeep' });
  if (hullBlocked(map, s, s.x, next)) {
    if (rate < 0 && s.air <= 0) {
      // out of air under the ice: it breaks through (the sheet and any ice its hull touches)
      const { x0, x1 } = shipSpan(s);
      out.push(...breakIce(map, x0, x1, s.broken, next + shipDraft(s) + 4));
      if (hullBlocked(map, s, s.x, next)) next = s.dive;
    } else next = s.dive;
  }
  s.dive = next;
  return out;
}
