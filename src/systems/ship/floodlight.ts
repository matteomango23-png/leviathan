// The floodlights of the top U-Boats and submarines (owner, 15 ottobre 2026: "mi trovo con l'Ocean Nightmare a 100 m
// e vedo solo davanti"): under water their beams light the sea ahead of and under the hull, as far as the model's
// floodlightM (data/fleet.ts, data/submarine.ts), less in murky water. Beams, not round spots (lot N1b, owner 13
// novembre 2026: the round lights lit the whole sea blue at night, against the rule of no circles). Pure logic.
import { WORLD } from '../../data/worldLayout';
import { subModel, type SubState } from '../subState';
import { shipDraft } from './geometry';
import { shipLength, shipModel } from './model';
import type { ShipState } from './ship';
import { diveShare } from './uboat';

/** How much the murk shortens the floodlights (share of their reach at the murkiest). Tuning. */
const FLOOD_MURK = 0.6;
/** Ahead and a little down (radians under the level), and their width against the diver's lamp. Tuning. */
const AHEAD = 0.28;
const AHEAD_WIDTH = 0.55;
const DOWN_SHARE = 0.6;
const DOWN_WIDTH = 0.8;

/** A light's beam in the dark: from a point, along an angle (radians), this long and this wide (1: the lamp's). */
export interface Beam {
  x: number;
  y: number;
  angle: number;
  len: number;
  width: number;
}

const ahead = (face: 1 | -1): number => (face > 0 ? AHEAD : Math.PI - AHEAD);

/** A diving U-Boat: a beam ahead from its bow and one down from its belly. */
export function floodBeams(s: ShipState, murk: number): Beam[] {
  const m = shipModel(s).floodlightM;
  const dive = diveShare(s);
  if (!s.owned || !m || dive <= 0) return [];
  const len = m * WORLD.unitsPerMetre * dive * (1 - FLOOD_MURK * murk);
  const y = WORLD.surfaceY + s.dive + shipDraft(s) * 0.4;
  const bow = s.x + s.face * shipLength(s) * 0.42;
  return [
    { x: bow, y, angle: ahead(s.face), len, width: AHEAD_WIDTH },
    { x: s.x, y: y + shipDraft(s) * 0.4, angle: Math.PI / 2, len: len * DOWN_SHARE, width: DOWN_WIDTH },
  ];
}

/** Your submarine under water, if its model has floodlights: a beam ahead of it. */
export function subFloodBeams(sub: SubState, murk: number): Beam[] {
  const m = subModel(sub.model).floodlightM;
  if (!sub.owned || !sub.aboard || !m || sub.y <= WORLD.surfaceY) return [];
  return [
    {
      x: sub.x,
      y: sub.y,
      angle: ahead(sub.face),
      len: m * WORLD.unitsPerMetre * (1 - FLOOD_MURK * murk),
      width: AHEAD_WIDTH,
    },
  ];
}
