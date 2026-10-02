// Shape of the Re Corallo's amphitheatre (ARENA in data/chapter3.ts): a stepped bowl carved into the reef floor,
// open to the sea above, with solid rock under its terraces.
import { ARENA } from '../../data/chapter3';

/** The floor of the bowl at x (world y), or null outside it: deeper towards the middle, in terraces. */
export function arenaFloor(x: number): number | null {
  const u = Math.abs(x - ARENA.x) / ARENA.rx;
  if (u >= 1) return null;
  const tier = Math.ceil((1 - u) * ARENA.tiers);
  return ARENA.y0 + (ARENA.depth * tier) / ARENA.tiers;
}

/** Open water of the bowl (and the water kept clear over its rim). */
export function inArena(x: number, y: number): boolean {
  const f = arenaFloor(x);
  return f !== null && y > ARENA.y0 - ARENA.clearAbove && y < f;
}

/** The rock under the terraces (so no cave ever opens into the bowl from below). */
export function inArenaShell(x: number, y: number): boolean {
  const f = arenaFloor(x);
  return f !== null && y >= f && y < ARENA.y0 + ARENA.depth + 30;
}

/** Inside the bowl, below its rim: where the Re Corallo fights you. */
export const inArenaBowl = (x: number, y: number, margin = 0): boolean =>
  Math.abs(x - ARENA.x) < ARENA.rx - margin && y > ARENA.y0 + margin && y < ARENA.y0 + ARENA.depth;
