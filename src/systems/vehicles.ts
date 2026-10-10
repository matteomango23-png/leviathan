// The ship, the submarine and the speedboat together (data/ship.ts, data/submarine.ts, data/boats.ts): the helm
// buttons, the ship, the submarine and the boat on their ramps or out, their solid hulls, and what the context
// button does about them. game.ts calls these.
import { PORTS, type PortDef } from '../data/economy';
import { followColumns, hullOnWater, stepColumns, type WaterColumns } from './waterColumns';
import { CALM_SEA } from './sea';
import { weatherLook, type WeatherState } from './weather';
import { boardBoat, canBoardBoat, diveFromBoat } from './boatCrew';
import { shipAlongside } from './economy/places';
import { SHIP } from '../data/ship';
import type { GameEvent } from './events';
import { pushOutOfHull, type HullPart } from './hull';
import type { InputState } from './input';
import { freshHelm } from './helm';
import { dockPoint, helmPoint, shipHull } from './ship/geometry';
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
import { repairSub, restAboard, stepSub, subHull, subModel } from './submarine';
import { restSubAir } from './subAir';
import { BOAT } from '../data/boats';
import { boatLength, sailBoat, type BoatState } from './boat';
import { boatHome, boatOnRamp, canDockBoat, launchBoat, startDockBoat, stepBoatBay } from './ship/boatBay';
import { unloadParts } from './ship/spareParts';
import { boatBay, shipLength } from './ship/model';
import { submerged } from './ship/uboat';

export type VehicleWorld = HatchWorld &
  ShipWorld & {
    boat: BoatState;
    diver: { dead: boolean };
    weather?: WeatherState;
    time?: number;
    water?: WaterColumns;
  };

/** You are carried by a vehicle (no swimming): at the helm, in the submarine, or on the ramp. */
export const inVehicle = (g: VehicleWorld): boolean =>
  g.ship.aboard ||
  g.sub.aboard ||
  g.boat.aboard ||
  g.ship.bay === 'launching' ||
  g.ship.bay === 'docking' ||
  boatOnRamp(g);

/** The submarine is on the ramp: nothing to press until it gets there. */
export const onRamp = (g: VehicleWorld): boolean =>
  g.ship.bay === 'launching' || g.ship.bay === 'docking' || boatOnRamp(g);

/**
 * One step of the helm buttons, the ship, the ramp and the submarine. Returns true while a vehicle moves you.
 * Returns also the tiles that changed (ice broken or frozen again) through a 'tilesChanged' event.
 */
export function stepVehicles(g: VehicleWorld, input: InputState, dt: number, events: GameEvent[]): boolean {
  const ship = g.ship;
  // into a vehicle: its levers start at rest, pointing where it points (owner, 8 ottobre: the levers kept the last
  // vehicle's way, and on the first step at the helm the still ship turned round, the submarine in its hold with it)
  const freshLevers = (face: 1 | -1): void => void Object.assign(input.helm, freshHelm(face));
  if (events.some((e) => e.type === 'shipBoarded')) freshLevers(ship.face);
  if (events.some((e) => e.type === 'boarded')) freshLevers(g.sub.face);
  if (events.some((e) => e.type === 'boatBoarded')) freshLevers(g.boat.face);
  if (events.some((e) => e.type === 'boatLaunching')) freshLevers(ship.face);
  const boat = g.boat;
  // the first hatch, and the second (ships with two bays); a hatch waits while its boat is on the ramp
  if (input.helmCmd === 'hatch' || input.helmCmd === 'hatch2') {
    const bay = input.helmCmd === 'hatch' ? 0 : 1;
    toggleHatch(g, bay, events, bay === boatBay(ship) && boatOnRamp(g));
  } else if (input.helmCmd === 'launch') launchSub(g, events);
  else if (input.helmCmd === 'launchBoat' && boat.hull <= 0) events.push({ type: 'boatBroken' });
  else if (input.helmCmd === 'launchBoat') launchBoat(g, events);
  else if (input.helmCmd === 'engine' && boat.aboard) {
    boat.engineOn = !boat.engineOn;
    if (!boat.engineOn) input.helm.throttle = 0;
    events.push({ type: boat.engineOn ? 'engineStarted' : 'engineStopped', vehicle: 'boat' });
  } else if (input.helmCmd === 'dive' && boat.aboard) diveFromBoat(g, events);
  else if (input.helmCmd === 'dive') diveFromShip(g, events);
  else if (input.helmCmd === 'sonar' && ship.aboard) ship.sonarOn = !ship.sonarOn;
  else if (input.helmCmd === 'engine' && ship.aboard) {
    // the engine button (owner, 8 ottobre): off, the throttle goes back to zero; on, it idles
    const was = ship.engineOn;
    ship.engineOn = !ship.engineOn && ship.fuel > 0;
    if (!ship.engineOn) input.helm.throttle = 0;
    if (ship.engineOn !== was) events.push({ type: ship.engineOn ? 'engineStarted' : 'engineStopped' });
  }
  const far = (x: number): boolean =>
    Math.abs(x - g.diver.x) > SHIP.refreezeDistance && Math.abs(x - ship.x) > SHIP.refreezeDistance;
  const sea = g.weather ? weatherLook(g.weather) : CALM_SEA; // its waves and its currents (sea.ts)
  const t = g.time ?? 0; // the waves' clock (the views draw the same waves)
  const water = g.water ?? null;
  const tiles = sailShip(g, ship.aboard ? input.helm : null, dt, events, far, sea, t);
  if (tiles.length) events.push({ type: 'tilesChanged', tiles });
  const ramp = stepBay(g, dt, events);
  const boatRamp = stepBoatBay(g, dt, events);
  sailBoat(g, boat.aboard ? input.helm : null, dt, events, sea, t);
  // the water answers the hulls afloat: bow waves, the slam of a landing (waterColumns.ts)
  if (water) {
    followColumns(water, g.diver.x);
    if (ship.owned && !submerged(ship))
      hullOnWater(water, ship.x, ship.face, shipLength(ship), ship.speed, Math.max(0, -ship.ride.vh), dt);
    if (boat.owned && boat.bay === 'out')
      hullOnWater(water, boat.x, boat.face, boatLength(boat), boat.speed, Math.max(0, -boat.ride.vh), dt);
    stepColumns(water, dt);
  }
  // its hull gave way: back broken to its hold, you at the ship's helm (mended at a harbour)
  if (events.some((e) => e.type === 'boatWrecked') && ship.owned) {
    Object.assign(boat, { aboard: false, bay: 'docked', bayT: 0, speed: 0, prop: 0 });
    ship.aboard = true;
    Object.assign(g.diver, helmPoint(ship), { vx: 0, vy: 0 });
    freshLevers(ship.face);
  }
  if (events.some((e) => e.type === 'subDocked' || e.type === 'boatDocked')) {
    freshLevers(ship.face);
    unloadParts(g, events); // the spare parts they bring mend the ship (ship/spareParts.ts)
  }
  const inSub = !ramp && stepSub(g, input, dt, events);
  freeSubFromHull(g);
  // waiting, or in the ship's hold: the submarine breathes again (subAir.ts)
  if (g.sub.owned && !g.sub.aboard)
    restSubAir(g.sub, subModel(g.sub.model).airSeconds, g.ship.bay === 'docked', dt);
  // broken, the submarine is towed to the ship's hold (not to Portofosco), you back at the helm
  const wreck = events.find((e) => e.type === 'subWrecked');
  if (wreck && wreck.type === 'subWrecked' && ship.owned) {
    wreck.toShip = true;
    ship.bay = 'docked';
    ship.aboard = true;
    g.sub.aboard = false;
    Object.assign(g.diver, helmPoint(ship), { vx: 0, vy: 0 });
    freshLevers(ship.face);
    repairSub(g, events); // in the hold the crew mends it, for teeth, like a port
  }
  return ship.aboard || ramp || inSub || boatRamp || boat.aboard;
}

/**
 * The submarine waiting out of its hold must never be inside the ship's hull, where you cannot reach it (owner, 9
 * ottobre: launched under a diving U-Boat, then the U-Boat came up around it): it goes down under the keel, where
 * it docks.
 */
function freeSubFromHull(g: VehicleWorld): void {
  const sub = g.sub;
  if (!g.ship.owned || !sub.owned || sub.aboard || g.ship.bay !== 'out') return;
  if (!shipHull(g.ship).some((p) => Math.hypot(sub.x - p.x, sub.y - p.y) < p.r + 4)) return;
  sub.y = Math.max(sub.y, dockPoint(g.ship).y);
}

/**
 * The solid hulls in the sea now: the submarine (unless in the hold) and, with `ship`, the ship. The beasts only
 * feel the submarine (owner, 9 ottobre: ships and U-Boats pass them by as if overtaking; diving, a U-Boat pressed
 * them into the rock).
 */
export function vehicleHulls(g: VehicleWorld, ship = true): HullPart[] {
  const sub = g.ship.bay === 'docked' || onRamp(g) ? [] : subHull(g.sub);
  return ship && g.ship.owned ? [...sub, ...shipHull(g.ship)] : sub;
}

/** Pushes a body (you, your beast, a wild one) out of the hulls; a `beast` goes through the ship's. */
export function pushOutOfVehicles(
  g: VehicleWorld,
  b: { x: number; y: number; vx: number; vy: number },
  circles: readonly { dx: number; dy: number; r: number }[],
  beast = false,
): void {
  const hulls = vehicleHulls(g, !beast);
  if (hulls.length) pushOutOfHull(hulls, b, circles);
}

/** At the helm, still, alongside a harbour's pier: the port is there. In the boat, the same at its pier. */
export function shipPort(g: VehicleWorld): PortDef | null {
  const s = g.ship;
  const b = g.boat;
  if (b.aboard && b.bay === 'out')
    return b.speed < BOAT.stillBelow ? (PORTS.find((p) => shipAlongside(b.x, p)) ?? null) : null;
  if (!s.aboard || s.speed >= SHIP.stillBelow || submerged(s)) return null;
  return PORTS.find((p) => shipAlongside(s.x, p)) ?? null;
}

/** What the context button does about the vehicles (null: nothing here). */
export function vehicleAction(g: VehicleWorld): 'aggancia' | 'abordo' | null {
  if (canDock(g) || canDockBoat(g)) return 'aggancia';
  if (g.boat.aboard) return null; // in the boat you go back aboard only through its hatch
  if (canBoardBoat(g) || canBoardShip(g)) return 'abordo';
  return null;
}

export function doVehicleAction(g: VehicleWorld, act: 'aggancia' | 'abordo', events: GameEvent[]): void {
  if (act === 'aggancia' && canDockBoat(g)) startDockBoat(g, events);
  else if (act === 'aggancia') startDock(g, events);
  else if (canBoardBoat(g)) boardBoat(g, events);
  else boardShip(g, events);
}

/** After losing your senses: you wake up at the helm of your ship (or in your submarine without one). */
export function wakeOnShip(g: VehicleWorld, events: GameEvent[]): boolean {
  const s = g.ship;
  if (!s.owned) return false;
  if (onRamp(g)) s.bay = 'docked'; // it was on the ramp: back in the hold
  g.sub.aboard = false; // out in the sea it stays where it was
  boatHome(g.boat); // the crew brings the boat back
  s.aboard = true;
  Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
  restAboard(g);
  events.push({ type: 'shipBoarded' });
  return true;
}
