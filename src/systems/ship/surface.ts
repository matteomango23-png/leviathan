// What the ship meets at the surface, read from the map: land and icebergs sticking out of the water (it sails round
// them, on the far lane), shallow water (it stops) and the ice sheet (it breaks it; the channel freezes again later,
// far from you). The broken ice is not saved: a new session finds the sheet whole.
import { SHIP } from '../../data/ship';
import { ENDLESS } from '../../data/endless';
import { LAYOUT, TILE, WORLD } from '../../data/worldLayout';
import { icebergsNear } from '../world/icebergs';
import type { TileMap } from '../world/tileMap';
import { SHIP_DRAFT } from './geometry';

/** West of this is the beach of Portofosco: there the shallow water stops the ship, it never sails round. */
export const COAST_X = LAYOUT.shoreX + 80;
/** East of this (the bay) rock close under the surface is sailed round too, like an island: it never stops you. */
export const BEACH_END = LAYOUT.bay.x0;

/** Where the sea ends: the ship stops here (the cliff past it is not sailed round). */
export const SEA_END_X = ENDLESS.maxX - ENDLESS.endWall - 40;

/** Does land, an iceberg or rock close under the surface stand in the way anywhere between x0 and x1? */
export function obstacleIn(map: TileMap, x0: number, x1Wanted: number): boolean {
  const from = Math.max(x0, COAST_X);
  const x1 = Math.min(x1Wanted, SEA_END_X);
  for (let x = from; x <= x1; x += 6)
    if (map.solidAt(x, WORLD.surfaceY - 3) || (x >= BEACH_END && shallowAt(map, x))) return true;
  if (from > x1) return false;
  return icebergsNear(from).some((b) => b.left < x1 && b.left + b.w > from && b.top < WORLD.surfaceY);
}

/** Rock (not ice: that it breaks) closer under the surface at x than the keel needs. */
export function shallowAt(map: TileMap, x: number): boolean {
  const need = WORLD.surfaceY + SHIP_DRAFT + SHIP.minUnderKeel;
  for (let y = WORLD.surfaceY; y <= need; y += 2)
    if (map.solidAt(x, y) && map.tileAtPoint(x, y) !== TILE.ice) return true;
  return false;
}

/** Is there ice under the hull between x0 and x1 (to the keel)? */
export function iceIn(map: TileMap, x0: number, x1: number): boolean {
  const T = map.tileSize;
  for (let ty = Math.floor(WORLD.surfaceY / T); ty * T <= WORLD.surfaceY + SHIP_DRAFT; ty++)
    for (let tx = Math.floor(x0 / T); tx * T <= x1; tx++) if (map.get(tx, ty) === TILE.ice) return true;
  return false;
}

/** A broken piece of the ice sheet, and how long before it may freeze again. */
export interface BrokenIce {
  i: number;
  t: number;
}

/** Breaks the ice under the hull between x0 and x1; returns the tiles broken now (to redraw them). */
export function breakIce(map: TileMap, x0: number, x1: number, broken: BrokenIce[]): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.floor(WORLD.surfaceY / T); ty * T <= WORLD.surfaceY + SHIP_DRAFT; ty++)
    for (let tx = Math.floor(x0 / T); tx * T <= x1; tx++) {
      if (map.get(tx, ty) !== TILE.ice) continue;
      map.set(tx, ty, TILE.water);
      const i = map.tileIndex(tx, ty);
      broken.push({ i, t: SHIP.refreezeSeconds });
      out.push(i);
    }
  return out;
}

/**
 * The channel freezes again: after its time, and only far from you and the ship (never on screen). Returns the
 * tiles frozen now (to redraw them).
 */
export function refreeze(
  map: TileMap,
  broken: BrokenIce[],
  dt: number,
  far: (x: number) => boolean,
): number[] {
  const out: number[] = [];
  for (let k = broken.length - 1; k >= 0; k--) {
    const b = broken[k]!;
    b.t -= dt;
    if (b.t > 0) continue;
    const { tx, ty } = map.tileOf(b.i);
    if (!far(tx * map.tileSize)) continue;
    map.set(tx, ty, TILE.ice);
    out.push(b.i);
    broken.splice(k, 1);
  }
  return out;
}
