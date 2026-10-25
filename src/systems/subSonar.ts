// What the submarine's sonar sees of the sea itself (owner, 24 ottobre 2026: "il radar del sottomarino deve captare
// fondali ed ostacoli vicini"): the edges of rock and ice around it, as dots on a grid of cells across its range, so
// a wall or the floor shows as a line of dots. Pure logic: ui/subScope.ts draws them.
import { TILE } from '../data/worldLayout';
import type { TileMap } from './world/tileMap';

export interface SonarEdge {
  /** Share of the range from the submarine (east > 0, down > 0). */
  x: number;
  y: number;
  ice: boolean;
}

/** The rock and ice edges within `range` units of (x, y), on a grid of `cells` across its diameter. */
export function sonarEdges(map: TileMap, x: number, y: number, range: number, cells: number): SonarEdge[] {
  const step = (2 * range) / cells;
  const out: SonarEdge[] = [];
  const solid = (px: number, py: number): boolean => map.tileAtPoint(px, py) !== TILE.water;
  for (let i = 0; i <= cells; i++)
    for (let j = 0; j <= cells; j++) {
      const dx = -range + i * step;
      const dy = -range + j * step;
      if (dx * dx + dy * dy > range * range) continue;
      const px = x + dx;
      const py = y + dy;
      if (!solid(px, py)) continue;
      // an edge: open water next to it
      if (solid(px + step, py) && solid(px - step, py) && solid(px, py + step) && solid(px, py - step))
        continue;
      out.push({ x: dx / range, y: dy / range, ice: map.tileAtPoint(px, py) === TILE.ice });
    }
  return out;
}
