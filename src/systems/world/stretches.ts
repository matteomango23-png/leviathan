// The stretches of the endless sea (split from endless.ts so the temples can find their place without a cycle):
// which kind each stretch is, and its natural floor.
import { BIOMES, ENDLESS, type BiomeDef } from '../../data/endless';
import { WORLD } from '../../data/worldLayout';
import { clamp, hash2, smoothstep } from '../math';

/** Index of the stretch at x (0 = the first one past the hand-made world; -1 before it). */
export const stretchAt = (x: number): number => Math.floor((x - ENDLESS.startX) / ENDLESS.stretch);

/** Distance from the coast in km at x (the beach is at the start of the world). */
export const kmFromCoast = (x: number): number => Math.max(0, x / WORLD.unitsPerMetre / 1000);

const cache = new Map<number, BiomeDef>();

/** The kind of a stretch: the first one is always open sea (it blends out of the Mare di Ghiaccio). */
export function biomeOf(k: number): BiomeDef {
  if (k <= 0) return BIOMES[0]!;
  const hit = cache.get(k);
  if (hit) return hit;
  const km = kmFromCoast(ENDLESS.startX + (k + 0.5) * ENDLESS.stretch);
  const weights = BIOMES.map((b) => Math.max(0, b.weight + b.weightPerKm * km));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = hash2(k * 7.3 + ENDLESS.seed, ENDLESS.seed * 0.37) * total;
  let pick = BIOMES[0]!;
  for (let i = 0; i < BIOMES.length; i++) {
    r -= weights[i]!;
    if (r <= 0) {
      pick = BIOMES[i]!;
      break;
    }
  }
  // never the same kind three times in a row
  if (k > 1 && biomeOf(k - 1).id === pick.id && biomeOf(k - 2).id === pick.id)
    pick = BIOMES[(BIOMES.indexOf(pick) + 1) % BIOMES.length]!;
  cache.set(k, pick);
  return pick;
}

/** The kind of sea at a world x (null on the hand-made coast). */
export const biomeAt = (x: number): BiomeDef | null => (x < ENDLESS.startX ? null : biomeOf(stretchAt(x)));

/** The floor of one stretch at x, before blending. */
export function stretchFloor(k: number, x: number): number {
  if (k < 0) return ENDLESS.firstFloorY;
  const b = biomeOf(k);
  let y = b.floorY + ENDLESS.deepenPerKm * kmFromCoast(x);
  for (const w of b.waves) y += Math.sin(x * w.freq + k * 1.7) * w.amp;
  const t = b.trench;
  if (t) {
    // a trench in the middle: steep walls down to its floor
    const u = (x - (ENDLESS.startX + k * ENDLESS.stretch)) / ENDLESS.stretch;
    const edge = (1 - t.width) / 2;
    const into = Math.min(u - edge, 1 - edge - u) / 0.06;
    if (into > 0) y += (t.floorY - y) * smoothstep(clamp(into, 0, 1));
  }
  return Math.min(ENDLESS.maxFloorY, y);
}

/** The natural sea floor (world y) at x: each stretch blends into the next over ENDLESS.blend. */
export function naturalFloor(x: number): number {
  const k = stretchAt(x);
  const u = x - (ENDLESS.startX + k * ENDLESS.stretch);
  const h = ENDLESS.blend / 2;
  // the first stretch starts exactly at the hand-made floor (no step where the coast ends)
  if (k === 0 && u < ENDLESS.blend) return mix(ENDLESS.firstFloorY, stretchFloor(0, x), u / ENDLESS.blend);
  if (u < h) return mix(stretchFloor(k - 1, x), stretchFloor(k, x), 0.5 + u / ENDLESS.blend);
  if (u > ENDLESS.stretch - h)
    return mix(stretchFloor(k, x), stretchFloor(k + 1, x), (u - (ENDLESS.stretch - h)) / ENDLESS.blend);
  return stretchFloor(k, x);
}
const mix = (a: number, b: number, t: number): number => a + (b - a) * smoothstep(clamp(t, 0, 1));
