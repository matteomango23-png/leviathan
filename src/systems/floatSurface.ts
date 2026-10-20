// The diver at the surface, like real water (owner, 20 ottobre 2026: "muro invisibile salendo; deve galleggiare come
// le bestie, senza saltare fuori; in tempesta sembra fluttuare tra un'onda e l'altra"). The surface is the wave over
// him, not a flat line; near it his push up fades and the water slows him, so he comes up, slows and floats with his
// head and shoulders out, rising and falling with the wave. He never leaves the water. Numbers in DIVER.float.
import { DIVER } from '../data/diver';

const F = DIVER.float;

interface FloatBody {
  y: number;
  vy: number;
}

/** How deep under the water line he is (units, > 0 under). */
const depthOf = (d: FloatBody, waterLine: number): number => d.y - waterLine;

/** How much of his push up is left: all of it below the band, none where he floats. */
export function floatPushShare(d: FloatBody, waterLine: number): number {
  const under = (depthOf(d, waterLine) - F.rest) / (F.band - F.rest);
  return Math.max(0, Math.min(1, under));
}

/** Near the surface, before he moves: slowed by the water, held at his floating depth (lifted to it when still). */
export function floatWater(d: FloatBody, waterLine: number, pushingDown: boolean, dt: number): void {
  const depth = depthOf(d, waterLine);
  if (depth >= F.band) return;
  d.vy -= d.vy * Math.min(1, F.drag * dt);
  if (depth < F.rest || !pushingDown) d.vy += F.spring * (F.rest - depth) * dt;
}

/** After he moved: never out of the water, even dashing. */
export function keepInWater(d: FloatBody, waterLine: number): void {
  if (d.y < waterLine) {
    d.y = waterLine;
    if (d.vy < 0) d.vy = 0;
  }
}

/** Near enough the surface to float there: the idle sinking stops. */
export const floating = (d: FloatBody, waterLine: number): boolean => depthOf(d, waterLine) < F.band;
