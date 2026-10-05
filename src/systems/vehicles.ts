// The ship and the submarine together (data/ship.ts, data/submarine.ts): the helm buttons, the ship, the submarine
// on its ramp or in the sea, their solid hulls, and what the context button does about them. game.ts calls these.
import { PORTS, type PortDef } from '../data/economy';
import { SHIP } from '../data/ship';
import type { GameEvent } from './events';
import { pushOutOfHull, type HullPart } from './hull';
import type { InputState } from './input';
import { helmPoint, shipHull } from './ship/geometry';
import {
  boardShip,
  canBoardShip,
  canDock,
  diveFromShip,
  launchSub,
  startDock,
  stepBay,
  toggleHatch,
  type HatchWorld,
} from './ship/hatch';
import { sailShip, type ShipWorld } from './ship/ship';
import { restAboard, stepSub, subHull } from './submarine';

export type VehicleWorld = HatchWorld & ShipWorld & { diver: { dead: boolean } };

/** You are carried by a vehicle (no swimming): at the helm, in the submarine, or on the ramp. */
export const inVehicle = (g: VehicleWorld): boolean =>
  g.ship.aboard || g.sub.aboard || g.ship.bay === 'launching' || g.ship.bay === 'docking';

/** The submarine is on the ramp: nothing to press until it gets there. */
export const onRamp = (g: VehicleWorld): boolean => g.ship.bay === 'launching' || g.ship.bay === 'docking';

/**
 * One step of the helm buttons, the ship, the ramp and the submarine. Returns true while a vehicle moves you.
 * Returns also the tiles that changed (ice broken or frozen again) through a 'tilesChanged' event.
 */
export function stepVehicles(g: VehicleWorld, input: InputState, dt: number, events: GameEvent[]): boolean {
  const ship = g.ship;
  if (input.helmCmd === 'hatch') toggleHatch(g, events);
  else if (input.helmCmd === 'launch') launchSub(g, events);
  else if (input.helmCmd === 'dive') diveFromShip(g, events);
  else if (input.helmCmd === 'sonar' && ship.aboard) ship.sonarOn = !ship.sonarOn;
  const far = (x: number): boolean =>
    Math.abs(x - g.diver.x) > SHIP.refreezeDistance && Math.abs(x - ship.x) > SHIP.refreezeDistance;
  const tiles = sailShip(g, ship.aboard ? input.helm : null, dt, events, far);
  if (tiles.length) events.push({ type: 'tilesChanged', tiles });
  const ramp = stepBay(g, dt, events);
  const inSub = !ramp && stepSub(g, input, dt, events);
  // broken, the submarine is towed to the ship's hold (not to Portofosco), you back at the helm
  const wreck = events.find((e) => e.type === 'subWrecked');
  if (wreck && wreck.type === 'subWrecked' && ship.owned) {
    wreck.toShip = true;
    ship.bay = 'docked';
    ship.aboard = true;
    g.sub.aboard = false;
    Object.assign(g.diver, helmPoint(ship), { vx: 0, vy: 0 });
  }
  return ship.aboard || ramp || inSub;
}

/** The solid hulls in the sea now: the submarine (unless in the hold) and the ship. */
export function vehicleHulls(g: VehicleWorld): HullPart[] {
  const sub = g.ship.bay === 'docked' || onRamp(g) ? [] : subHull(g.sub);
  return g.ship.owned ? [...sub, ...shipHull(g.ship)] : sub;
}

/** Pushes a body (you, your beast, a wild one) out of the hulls. */
export function pushOutOfVehicles(
  g: VehicleWorld,
  b: { x: number; y: number; vx: number; vy: number },
  circles: readonly { dx: number; dy: number; r: number }[],
): void {
  const hulls = vehicleHulls(g);
  if (hulls.length) pushOutOfHull(hulls, b, circles);
}

/** At the helm, still, alongside a harbour's pier: the port is there. */
export function shipPort(g: VehicleWorld): PortDef | null {
  const s = g.ship;
  if (!s.aboard || s.speed >= SHIP.stillBelow) return null;
  return PORTS.find((p) => Math.abs(s.x - p.shipDock) < SHIP.dockReachPort) ?? null;
}

/** What the context button does about the vehicles (null: nothing here). */
export function vehicleAction(g: VehicleWorld): 'aggancia' | 'abordo' | null {
  if (canDock(g)) return 'aggancia';
  if (canBoardShip(g)) return 'abordo';
  return null;
}

export function doVehicleAction(g: VehicleWorld, act: 'aggancia' | 'abordo', events: GameEvent[]): void {
  if (act === 'aggancia') startDock(g, events);
  else boardShip(g, events);
}

/** After losing your senses: you wake up at the helm of your ship (or in your submarine without one). */
export function wakeOnShip(g: VehicleWorld, events: GameEvent[]): boolean {
  const s = g.ship;
  if (!s.owned) return false;
  if (onRamp(g)) s.bay = 'docked'; // it was on the ramp: back in the hold
  g.sub.aboard = false; // out in the sea it stays where it was
  s.aboard = true;
  Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
  restAboard(g);
  events.push({ type: 'shipBoarded' });
  return true;
}
