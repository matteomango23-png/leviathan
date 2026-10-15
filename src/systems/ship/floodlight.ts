// The floodlights of the top U-Boats and submarines (owner, 15 ottobre 2026: "mi trovo con l'Ocean Nightmare a 100 m
// e vedo solo davanti"): under water the sea round the hull is lit, as far as the model's floodlightM (data/fleet.ts,
// data/submarine.ts), less in murky water. Light spots for the darkness mask (views/lightView.ts). Pure logic.
import { WORLD } from '../../data/worldLayout';
import { subModel, type SubState } from '../subState';
import { shipDraft } from './geometry';
import { shipLength, shipModel } from './model';
import type { ShipState } from './ship';
import { diveShare } from './uboat';

/** How much the murk shortens the floodlights (share of their reach at the murkiest). Tuning. */
export const FLOOD_MURK = 0.6;

export interface LightSpot {
  x: number;
  y: number;
  r: number;
}

/** A diving U-Boat: three spots along its hull (a long hull lit end to end). */
export function floodSpots(s: ShipState, murk: number): LightSpot[] {
  const m = shipModel(s).floodlightM;
  const dive = diveShare(s);
  if (!s.owned || !m || dive <= 0) return [];
  const r = m * WORLD.unitsPerMetre * dive * (1 - FLOOD_MURK * murk);
  const y = WORLD.surfaceY + s.dive + shipDraft(s) * 0.4;
  const half = shipLength(s) * 0.35;
  return [-half, 0, half].map((dx) => ({ x: s.x + dx, y, r }));
}

/** Your submarine under water, if its model has floodlights. */
export function subFloodSpots(sub: SubState, murk: number): LightSpot[] {
  const m = subModel(sub.model).floodlightM;
  if (!sub.owned || !sub.aboard || !m || sub.y <= WORLD.surfaceY) return [];
  return [{ x: sub.x, y: sub.y, r: m * WORLD.unitsPerMetre * (1 - FLOOD_MURK * murk) }];
}
