// Planting a painted piece on the sea floor (owner, 25 ottobre: "tutte le cose che metti devono essere ben piantate
// al terreno"): its bottom goes to the deepest floor under its whole width, so no edge hangs over a slope, and the
// piece is drawn behind the terrain, so the rock hides what goes into it. On a slope too steep it is drawn smaller
// rather than sunk too far.
import type { TileMap } from '../systems/world/tileMap';

/** How much of its height a piece may sink into the floor at most; how many points of the floor it looks at. */
const MAX_SINK = 0.45;
const SAMPLES = 9;
/** The share of its width that stands on the floor (a painted piece's base tapers off at its two ends). */
const FOOT = 0.8;

/** The floor under x, from a little above y (the first rock surface going down). */
const floorAt = (map: TileMap, x: number, y: number): number => map.floorBelow(x, y - 40);

/**
 * Where a piece `width` wide and `height` tall (units) goes standing on the floor near (x, y): the y of its bottom
 * and the scale to draw it at (1, or less on a steep slope).
 */
export function plant(
  map: TileMap,
  x: number,
  y: number,
  width: number,
  height: number,
): { bottom: number; scale: number } {
  const centre = floorAt(map, x, y);
  let scale = 1;
  for (let tries = 0; tries < 4; tries++) {
    const w = width * scale * FOOT;
    let deepest = centre;
    for (let i = 0; i < SAMPLES; i++)
      deepest = Math.max(deepest, floorAt(map, x - w / 2 + (i / (SAMPLES - 1)) * w, y));
    if (deepest - centre <= height * scale * MAX_SINK) return { bottom: deepest + 1, scale };
    scale *= 0.85;
  }
  return { bottom: centre + height * scale * MAX_SINK, scale };
}
