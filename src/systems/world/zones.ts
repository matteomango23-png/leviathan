import { WORLD, ZONES } from '../../data/worldLayout';

/** Name of the zone at a world point. */
export function zoneAt(x: number, y: number): string {
  const z = ZONES.find((z) => x >= z.xMin && x < z.xMax && y >= z.yMin && y < z.yMax);
  return z ? z.name : '';
}

/** Depth in metres below the surface (0 at or above it). */
export function depthMetres(y: number): number {
  return Math.max(0, (y - WORLD.surfaceY) / WORLD.unitsPerMetre);
}
