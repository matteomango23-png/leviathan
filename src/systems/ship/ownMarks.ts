// Your own craft in the water, for the ship's sonar and chart (owner, 15 ottobre 2026: "nel sonar/radar della nave
// devo poter vedere anche i miei mezzi se sono in acqua"): the speedboat out of its hold, the submarine out, the
// drone on its round, the sphere on its way. Metres from the ship (east > 0) and depth. Pure logic.
import { WORLD } from '../../data/worldLayout';
import type { BoatState } from '../boat';
import type { SubState } from '../subState';
import type { GadgetsState } from './gadgets';
import type { ShipState } from './ship';

export type OwnKind = 'boat' | 'sub' | 'drone' | 'sphere';

export interface OwnMark {
  kind: OwnKind;
  /** One letter for the screen. */
  letter: string;
  name: string;
  dxM: number;
  depthM: number;
}

export interface OwnWorld {
  ship: ShipState;
  boat: BoatState;
  sub: SubState;
  gadgets: GadgetsState;
}

export function ownMarks(g: OwnWorld): OwnMark[] {
  const out: OwnMark[] = [];
  const M = WORLD.unitsPerMetre;
  const add = (kind: OwnKind, letter: string, name: string, x: number, y: number): void => {
    out.push({ kind, letter, name, dxM: (x - g.ship.x) / M, depthM: Math.max(0, (y - WORLD.surfaceY) / M) });
  };
  if (g.boat.owned && g.boat.bay === 'out') add('boat', 'M', 'Motoscafo', g.boat.x, WORLD.surfaceY);
  if (g.sub.owned && g.ship.bay !== 'docked') add('sub', 'S', 'Sottomarino', g.sub.x, g.sub.y);
  const r = g.gadgets.recon;
  if (r.phase !== 'idle') add('drone', 'D', 'Drone', r.x, r.y);
  const sp = g.gadgets.sphere;
  if (sp.phase !== 'dock') add('sphere', 'O', 'Sfera', sp.x, sp.y);
  return out;
}
