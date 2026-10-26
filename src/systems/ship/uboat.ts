// The U-Boats (block 4c, owner 9 ottobre 2026): the ship itself dives, with the helm's dive lever, down to its
// model's depth (data/fleet.ts `dive`), its whole hull stopping against rock. Under water it slips beneath the ice
// sheet; its air lasts its model's seconds (a warning 30 s before); then whoever is aboard loses hearts (sail.ts;
// owner, 24 ottobre: it no longer rises by itself), and only empty it rises, breaking the ice if it is under it. It
// refills its air afloat. Pure logic; ship.ts calls it every step.
import { SHIP } from '../../data/ship';
import { SHIP_SHAPES } from '../../data/sprites.generated';
import { TILE, WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { shipDraft, shipHeight, shipHull, shipPoint, shipSpan } from './geometry';
import { shipArt, shipModel, shipPicture } from './model';
import { breakIce, type BrokenIce } from './surface';
import { widenIceBreak } from '../world/iceSheet';

interface DiveShip {
  hop?: number;
  hopV?: number;
  model: string;
  x: number;
  face: 1 | -1;
  dive: number;
  air: number;
  speed: number;
  aboard: boolean;
  broken: BrokenIce[];
  hatches: { open: boolean; t: number }[];
}

/** Under water (deeper than counts as afloat). */
export const submerged = (s: { dive?: number }): boolean => (s.dive ?? 0) > SHIP.dive.afloatBelow;

/**
 * How far into its dive, 0 (afloat) … 1 (its whole picture under): the swell fades, the light under the hull turns
 * into the headlight's cone, gradually (owner, 9 ottobre: they snapped).
 */
export const diveShare = (s: { model: string; dive?: number }): number =>
  Math.max(0, Math.min(1, (s.dive ?? 0) / Math.max(1, shipHeight(s) * shipPicture(s).waterline)));

/** The deepest it goes: its keel at its model's depth (units under its floating line). */
export function maxDive(s: { model: string }): number {
  const d = shipModel(s).dive;
  return d ? Math.max(0, d.maxDepthM * WORLD.unitsPerMetre - shipDraft(s)) : 0;
}

/** Its keel's depth, in metres. */
export const keelDepthM = (s: { model: string; dive?: number }): number =>
  ((s.dive ?? 0) + shipDraft(s)) / WORLD.unitsPerMetre;

const outlines = new Map<string, [number, number][]>();

/** The edge cells of a ship picture's outline (shares of its frame): the solid cells next to an empty one. */
function outline(key: string): [number, number][] | null {
  const hit = outlines.get(key);
  if (hit) return hit;
  const mask = SHIP_SHAPES[key];
  if (!mask) return null;
  const rows = mask.length;
  const cols = mask[0]!.length;
  const at = (q: number, r: number): boolean => mask[r]?.[q] === '1';
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let q = 0; q < cols; q++)
      if (at(q, r) && !(at(q - 1, r) && at(q + 1, r) && at(q, r - 1) && at(q, r + 1)))
        out.push([(q + 0.5) / cols, (r + 0.5) / rows]);
  outlines.set(key, out);
  return out;
}

/** Would it, at this x and dive, run into rock (or the ice sheet)? Under water with the whole outline of its picture,
 *  towers and keel (owner, 24 ottobre: only the middle of the hull bumped); afloat never (its lanes: hullAground). */
export function hullBlocked(map: TileMap, s: DiveShip, x: number, dive: number): boolean {
  if (dive <= SHIP.dive.afloatBelow) return false;
  const pose = { ...s, x, dive };
  const edge = outline(shipArt(s).closed);
  if (!edge) return shipHull(pose).some((p) => map.hitCircle(p.x, p.y, p.r * 0.9));
  return edge.some(([u, v]) => {
    const p = shipPoint(pose, u, v);
    return map.solidAt(p.x, p.y);
  });
}

/**
 * Under water its hull breaks the ice it touches (owner, 25 ottobre: just under the surface it stuck on an iceberg
 * and wore its hull): the ice tiles under its outline at (x, dive) go, the painted sheet in whole columns and
 * pillars (as when a ship breaks it afloat). Returns the tiles broken (to redraw them).
 */
export function smashIce(map: TileMap, s: DiveShip, x: number, dive: number): number[] {
  if (dive <= SHIP.dive.afloatBelow) return [];
  const pose = { ...s, x, dive };
  const edge = outline(shipArt(s).closed);
  const pts = edge ? edge.map(([u, v]) => shipPoint(pose, u, v)) : shipHull(pose);
  const hit: number[] = [];
  // the tile under each point of its outline and those round it (the rock's soft outline reaches into the next
  // tile: ice left beside it would still stop the hull)
  for (const p of pts) {
    if (!map.solidAt(p.x, p.y)) continue;
    const tx = Math.floor(p.x / map.tileSize);
    const ty = Math.floor(p.y / map.tileSize);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (map.get(tx + dx, ty + dy) !== TILE.ice) continue;
        map.set(tx + dx, ty + dy, TILE.water);
        hit.push(map.tileIndex(tx + dx, ty + dy));
      }
  }
  if (!hit.length) return [];
  const all = [...hit, ...widenIceBreak(map, hit)];
  for (const i of all) s.broken.push({ i, t: SHIP.refreezeSeconds });
  return all;
}

/** Afloat, would its keel at this x run onto the seabed or a coast? (The ice it breaks: not that.) */
export function hullAground(map: TileMap, s: DiveShip, x: number): boolean {
  return shipHull({ ...s, x, dive: 0 }).some((p) =>
    [
      [0, 0],
      [0, 0.9],
      [0.9, 0],
      [-0.9, 0],
    ].some(([dx, dy]) => {
      const t = map.tileAtPoint(p.x + dx! * p.r, p.y + dy! * p.r);
      return t !== TILE.water && t !== TILE.ice;
    }),
  );
}

/** Out of the water after a fast rise: up, then its weight brings it back down, a splash. */
export function stepHop(s: DiveShip, dt: number, events: GameEvent[]): void {
  if (s.hopV === undefined || s.hop === undefined) return;
  s.hopV -= SHIP.hop.gravity * dt;
  s.hop += s.hopV * dt;
  if (s.hop > 0) return;
  events.push({ type: 'breachSplash', x: s.x, y: WORLD.surfaceY, speed: -s.hopV });
  s.hop = undefined;
  s.hopV = undefined;
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
  if (s.air <= 0 && submerged(s) && !s.aboard)
    rate = -D.emergencyRise; // left empty, it comes up
  // with a hatch open it stays where it is (owner, 9 ottobre: it went up and down with them open)
  else if (helm && s.hatches.every((h) => !h.open && h.t === 0))
    rate = helm.dive > 0 ? helm.dive * m.sinkSpeed : helm.dive * m.riseSpeed;
  if (rate > 0 && !submerged(s) && s.air < D.minAir) rate = 0;
  if (rate === 0) return out;
  const deepest = maxDive(s);
  let next = Math.max(0, Math.min(deepest, s.dive + rate * dt));
  if (rate > 0 && next >= deepest && s.dive < deepest) events.push({ type: 'diveTooDeep' });
  // ice in the way breaks (only rock stops it)
  const smashed = smashIce(map, s, s.x, next);
  if (smashed.length) {
    out.push(...smashed);
    events.push({ type: 'iceCracked', x: s.x, speed: Math.abs(rate) });
  }
  // coming up fast it leaves the water a little (stepHop)
  if (rate < 0 && next <= 0 && s.dive > 0) {
    const H = SHIP.hop;
    const over = -rate - H.minSpeed;
    if (over > 0) {
      s.hopV = Math.min(over * H.keep, Math.sqrt(2 * H.gravity * H.maxShare * shipHeight(s)));
      s.hop = 0;
      events.push({ type: 'breach', x: s.x, y: WORLD.surfaceY });
    }
  }
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
