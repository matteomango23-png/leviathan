// Where the hulls are for the Compagnia's battles (company/): a ship's box from deck to keel, its middle, and your
// ship as the Compagnia perceives it. Pure logic.
import { WORLD } from '../../data/worldLayout';
import { nightness } from '../dayNight';
import type { GameState } from '../newGame';
import { shipDraft, shipPoint } from '../ship/geometry';
import { shipModel, shipPicture, shipTopSpeed } from '../ship/model';
import type { Quarry } from './detection';

export type Pose = { x: number; face: 1 | -1; dive?: number; model: string };
export type Box = { x0: number; x1: number; y0: number; y1: number };

/** A hull's box in the world: deck to keel, nearly stern to bow. */
export function hullBox(p: Pose): Box {
  const a = shipPoint(p, 0.06, shipPicture(p).deckY);
  const b = shipPoint(p, 0.94, 0);
  return {
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    y0: a.y,
    y1: WORLD.surfaceY + (p.dive ?? 0) + shipDraft(p),
  };
}

export const middle = (b: Box): { x: number; y: number } => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

/** Metres under the sea's surface (0 above it). */
export const metresUnder = (y: number): number => Math.max(0, (y - WORLD.surfaceY) / WORLD.unitsPerMetre);

/** Your ship as the Compagnia perceives it. */
export function quarryOf(g: GameState): Quarry {
  const s = g.ship;
  const night = nightness(g.day);
  return {
    ...middle(hullBox(s)),
    depthM: metresUnder(WORLD.surfaceY + s.dive),
    speedShare: Math.min(1, s.speed / Math.max(1, shipTopSpeed(s))),
    engineOn: s.engineOn,
    silent: !!s.silent,
    // by night its deck lights and headlight shine; the light under the hull always does
    lightsOn: !s.silent && (s.lightOn || night > 0.2),
    halfM: shipModel(s).lengthM / 2,
  };
}
