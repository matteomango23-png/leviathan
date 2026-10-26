// Never stuck in the rock (owner, 26 ottobre 2026: after the rescue flare a dived U-Boat came to Porto Fango at its
// depth, inside the seabed, and its submarine too: no way to take the ship back or change it). Bringing the ship in
// (the flare, a repair on loading, the pause menu's "Sono bloccato") puts it at a pier afloat, hatches shut, its
// submarine and boat in the hold, full air. Pure logic.
import { PORT, PORTO_FANGO, type PortDef } from '../../data/economy';
import { SUBMARINE } from '../../data/submarine';
import type { BoatState } from '../boat';
import { hits, subTopY, type SubState } from '../submarine';
import type { TileMap } from '../world/tileMap';
import { helmPoint, holdPoint } from './geometry';
import { boatBay, subBay } from './model';
import { freshHatches, type ShipState } from './ship';
import { fullAir, hullBlocked, submerged } from './uboat';

interface StuckWorld {
  map: TileMap;
  ship: ShipState;
  sub: SubState;
  boat: BoatState;
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 };
}

/** The ship at this harbour's pier, afloat and shut, its vehicles in the hold, you at the helm. */
export function harbourShip(g: StuckWorld, port: PortDef = PORTO_FANGO): void {
  const s = g.ship;
  Object.assign(s, {
    x: port.shipDock,
    speed: 0,
    dive: 0,
    hop: undefined,
    hopV: undefined,
    hatches: freshHatches(s),
    dockFrom: null,
    air: fullAir(s),
    aboard: true,
  });
  if (g.sub.owned && subBay(s) >= 0) {
    s.bay = 'docked';
    s.bayT = 0;
    Object.assign(g.sub, holdPoint(s), { vx: 0, vy: 0, aboard: false, leap: false, night: false, sinkT: 0 });
  }
  if (g.boat.owned && boatBay(s) >= 0)
    Object.assign(g.boat, { bay: 'docked', bayT: 0, aboard: false, speed: 0 });
  Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
}

/** Is the ship under water inside rock, or its submarine out in the rock? */
export function vehiclesStuck(g: StuckWorld): boolean {
  const s = g.ship;
  if (s.owned && submerged(s) && hullBlocked(g.map, s, s.x, s.dive)) return true;
  const out = !g.ship.owned || subBay(s) < 0 || s.bay !== 'docked';
  return g.sub.owned && out && hits(g.map, g.sub, g.sub.x, g.sub.y);
}

/** Frees whatever is stuck (`always`: the pause menu's button, stuck or not): the ship and its vehicles to Porto
 *  Fango, a submarine with no ship to Portofosco. */
export function freeVehicles(g: StuckWorld, always = false): boolean {
  if (!always && !vehiclesStuck(g)) return false;
  if (g.ship.owned) harbourShip(g);
  else {
    Object.assign(g.sub, { x: SUBMARINE.mooredX, y: subTopY(g.sub), vx: 0, vy: 0, aboard: false, sinkT: 0 });
    Object.assign(g.diver, { x: PORT.x + 25, y: 38, vx: 0, vy: 0 });
  }
  return true;
}
