// The endless open sea (tappa 11): past ENDLESS.startX the tile map asks this generator for its tiles, a chunk
// of columns at a time. The sea is cut into stretches of one kind each (BIOMES), chosen from a fixed seed: the
// same sea every time, nothing to save. The floor blends from one stretch to the next and gets deeper with
// distance; mounds, kelp, corals, ice and trenches depend on the kind of stretch.
import { ENDLESS, type BiomeDef } from '../../data/endless';
import { TILE, WORLD, type TileValue } from '../../data/worldLayout';
import { fbm, hash2 } from '../math';
import { icebergsOfStretch, inIceberg, nearIceberg } from './icebergs';
import { biomeOf, naturalFloor, stretchAt } from './stretches';
import { floorNearTemple, templeAtX, templeBottomAt, templeTileAt, templeVentAt } from './templeSite';

export { biomeAt, biomeOf, kmFromCoast, stretchAt } from './stretches';

/** The sea floor (world y) at x: the natural one, bent to meet a sunken temple near one. */
export const endlessFloor = (x: number): number => floorNearTemple(x, naturalFloor(x));

interface Mound {
  x: number;
  y: number;
  rx: number;
  ry: number;
}
const moundCache = new Map<number, Mound[]>();

/** The rock mounds of a stretch, standing on its floor (fixed by the seed). */
export function moundsOf(k: number): Mound[] {
  const hit = moundCache.get(k);
  if (hit) return hit;
  const b = biomeOf(k);
  const out: Mound[] = [];
  const x0 = ENDLESS.startX + k * ENDLESS.stretch;
  for (let i = 0; i < b.mounds.count; i++) {
    const h = (n: number): number => hash2(k * 13.1 + i * 3.7 + n, ENDLESS.seed + n * 5.3);
    const x = x0 + ENDLESS.blend / 2 + h(1) * (ENDLESS.stretch - ENDLESS.blend);
    const rx = b.mounds.rx[0] + h(2) * (b.mounds.rx[1] - b.mounds.rx[0]);
    const ry = b.mounds.ry[0] + h(3) * (b.mounds.ry[1] - b.mounds.ry[0]);
    if (!templeAtX(x, rx + 40)) out.push({ x, y: endlessFloor(x) - ry * 0.3, rx, ry }); // not on a temple
  }
  moundCache.set(k, out);
  return out;
}

/** Is there ice at this point (a Banchisa stretch: the ceiling, minus its holes, and the pillars)? */
function isIce(b: BiomeDef, k: number, x: number, y: number): boolean {
  const ice = b.ice;
  if (!ice || y < WORLD.surfaceY) return false;
  const u = x - (ENDLESS.startX + k * ENDLESS.stretch);
  if (u < ENDLESS.blend / 2 || u > ENDLESS.stretch - ENDLESS.blend / 2) return false; // open water at its ends
  const inHole = ((u % ice.holeEvery) + ice.holeEvery) % ice.holeEvery < ice.holeWidth;
  if (y < ice.ceilingY && !inHole) return true;
  for (let i = 0; i < ice.pillars; i++) {
    const px =
      ENDLESS.startX +
      k * ENDLESS.stretch +
      ENDLESS.blend / 2 +
      hash2(k * 3.1 + i, 77) * (ENDLESS.stretch - ENDLESS.blend);
    const dx = (x - px) / (6 + hash2(i, k) * 8);
    const dy = (y - ice.ceilingY) / (16 + hash2(k, i) * 22);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

/** The tile at a point of the endless sea. */
export function endlessTile(x: number, y: number): TileValue {
  if (y < WORLD.surfaceY) return TILE.water;
  const temple = templeTileAt(x, y);
  if (temple !== null) return temple;
  const k = stretchAt(x);
  const b = biomeOf(k);
  if (b.ice && inIceberg(icebergsOfStretch(k), x, y)) return TILE.ice;
  if (isIce(b, k, x, y) && !nearIceberg(icebergsOfStretch(k), x)) return TILE.ice; // no old ice by the painted ones
  const n = (fbm(x * WORLD.noiseScale, y * WORLD.noiseScale) - 0.5) * WORLD.noiseAmp;
  if (y > endlessFloor(x) + n * b.noise) return TILE.rock;
  for (const m of moundsOf(k)) {
    const dx = (x - m.x) / m.rx;
    const dy = (y - m.y) / m.ry;
    if (dx * dx + dy * dy < 1 + n * 0.6) return TILE.rock;
  }
  return TILE.water;
}

/** Fills a chunk of columns (tx0 … tx0 + cols - 1, all rows), column by column: rock deep under the floor
 *  is filled without asking the noise. */
export function generateChunk(tx0: number, cols: number, rows: number, T: number): Uint8Array {
  const out = new Uint8Array(cols * rows);
  for (let c = 0; c < cols; c++) {
    const x = (tx0 + c) * T + T / 2;
    const k = stretchAt(x);
    const deepest = Math.max(endlessFloor(x) + biomeOf(k).noise * WORLD.noiseAmp + T, templeBottomAt(x) ?? 0);
    for (let ty = 0; ty < rows; ty++) {
      const y = ty * T + T / 2;
      out[ty * cols + c] = y > deepest ? TILE.rock : endlessTile(x, y);
    }
  }
  return out;
}

const isGround = (t: TileValue): boolean => t === TILE.rock || t === TILE.temple || t === TILE.gate;

/** The air vents of a stretch: on its floor (or a mound), where it is not too deep to reach. */
const ventCache = new Map<number, { x: number; y: number }[]>();

export function ventsOf(k: number): { x: number; y: number }[] {
  if (k < 0) return [];
  const hit = ventCache.get(k);
  if (hit) return hit;
  const V = ENDLESS.vents;
  const out: { x: number; y: number }[] = [];
  const x0 = ENDLESS.startX + k * ENDLESS.stretch + ENDLESS.blend / 2;
  const span = ENDLESS.stretch - ENDLESS.blend;
  // the first rock going down from under the ice (the floor, or a mound standing on it)
  const floorAt = (x: number): number => {
    let y = 120;
    while (y < ENDLESS.maxFloorY + 200 && !isGround(endlessTile(x, y))) y += 4;
    return y - 4;
  };
  for (let i = 0; i < V.perStretch; i++) {
    // a few places along the stretch (fixed by the seed): the shallowest one (not at the bottom of a trench)
    let best: { x: number; y: number } | null = null;
    for (let t = 0; t < V.tries; t++) {
      const x = x0 + hash2(k * 5.9 + i * 13 + t * 1.3, ENDLESS.seed + 31) * span;
      const y = floorAt(x);
      if (!best || y < best.y) best = { x, y };
    }
    out.push(best!);
  }
  ventCache.set(k, out);
  return out;
}

/** The vent whose bubble column you are in, if any. */
export function ventAt(x: number, y: number): { x: number; y: number } | null {
  if (x < ENDLESS.startX) return null;
  const inTemple = templeVentAt(x, y);
  if (inTemple) return inTemple;
  const V = ENDLESS.vents;
  const k = stretchAt(x);
  for (const kk of [k - 1, k, k + 1])
    for (const v of ventsOf(kk))
      if (Math.abs(x - v.x) < V.radius && y < v.y + 10 && y > v.y - V.height) return v;
  return null;
}
