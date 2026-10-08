// What the ship meets at the surface: the ends of its waters (Porto Fango to the west, the end of the known sea to
// the east, nothing in between: owner, 5 ottobre) and the ice sheet (it breaks it; the channel freezes again later,
// far from you). The broken ice is not saved: a new session finds the sheet whole.
import { SHIP } from '../../data/ship';
import { ENDLESS } from '../../data/endless';
import { PORTO_FANGO } from '../../data/economy';
import { TILE, WORLD } from '../../data/worldLayout';
import type { TileMap } from '../world/tileMap';

/** Where the sea ends: the ship stops here. */
export const SEA_END_X = ENDLESS.maxX - ENDLESS.endWall - 40;
/** The ship's waters begin at the trading harbour of Porto Fango (owner, 5 ottobre): it goes no farther west. */
export const SHIP_WEST_X = PORTO_FANGO.shipDock - 20;

/** Is there ice under the hull between x0 and x1 (down to the keel, `draft` units under the surface)? */
export function iceIn(map: TileMap, x0: number, x1: number, draft = 25): boolean {
  const T = map.tileSize;
  for (let ty = Math.floor(WORLD.surfaceY / T); ty * T <= WORLD.surfaceY + draft; ty++)
    for (let tx = Math.floor(x0 / T); tx * T <= x1; tx++) if (map.get(tx, ty) === TILE.ice) return true;
  return false;
}

/** A broken piece of the ice sheet, and how long before it may freeze again. */
export interface BrokenIce {
  i: number;
  t: number;
}

/** Breaks the ice under the hull between x0 and x1; returns the tiles broken now (to redraw them). */
export function breakIce(map: TileMap, x0: number, x1: number, broken: BrokenIce[], draft: number): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.floor(WORLD.surfaceY / T); ty * T <= WORLD.surfaceY + draft; ty++)
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
