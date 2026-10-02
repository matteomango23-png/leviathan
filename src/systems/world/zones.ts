import { DELTA, WORLD, ZONES } from '../../data/worldLayout';
import { biomeAt } from './endless';

/** Name of the zone at a world point (out in the endless sea: the kind of stretch you are in). */
export function zoneAt(x: number, y: number): string {
  const b = biomeAt(x);
  if (b) return b.name;
  const z = ZONES.find((z) => x >= z.xMin && x < z.xMax && y >= z.yMin && y < z.yMax);
  return z ? z.name : '';
}

/** Depth in metres below the surface (0 at or above it). */
export function depthMetres(y: number): number {
  return Math.max(0, (y - WORLD.surfaceY) / WORLD.unitsPerMetre);
}

/** How murky the water is at a point, 0..1: full inside the Delta, fading out over DELTA.murkFade at its edges. */
export function murkAt(x: number, y: number): number {
  if (y < WORLD.surfaceY) return 0;
  const inside = Math.min(x - DELTA.x0, DELTA.x1 - x);
  return Math.max(0, Math.min(1, inside / DELTA.murkFade));
}
