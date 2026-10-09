// The speedboat or jet ski of your ship (data/boats.ts, owner 8 ottobre 2026, block 4b): it lives in a hatch of
// the ship, goes down its ramp onto the water and races on the surface with the helm's levers. It never dives and
// never breaks ice; dry, it crawls home on its reserve. Pure logic; ship/boatBay.ts moves it on its ramp,
// views/boatView.ts draws it.
import { BOAT, BOAT_MODELS, BOAT_TEXT, type BoatModel } from '../data/boats';
import { newRide, settleRide, stepRide, type RideState } from './ride';
import { SEA_STATE } from '../data/sea';
import { boatWear, CALM_SEA, currentMult, type SeaWeather } from './sea';
import { HELM } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import type { GameEvent } from './events';
import { litresFor } from './fuelBurn';
import { stepHeading, type HelmState } from './helm';
import { iceIn, SEA_END_X, SHIP_WEST_X } from './ship/surface';
import type { TileMap } from './world/tileMap';
import { icebergAcross } from './world/icebergs';
import { SHIP } from '../data/ship';

/** Where it is: in the hold, on its ramp (down / up), out on the water (or none: the ship has no boat). */
export type BoatBay = 'none' | 'docked' | 'launching' | 'out' | 'docking';

export interface BoatState {
  owned: boolean;
  model: string;
  /** You are driving it. */
  aboard: boolean;
  x: number;
  y: number;
  face: 1 | -1;
  speed: number;
  fuel: number;
  /** Litres in its drums, for the ship. */
  drums: number;
  fuelWarned: boolean;
  bay: BoatBay;
  /** Along its ramp: 0 = in the hold … 1 = on the water. */
  bayT: number;
  /** Docking: the x it glides from (to the foot of its ramp). */
  dockFromX: number;
  engineOn: boolean;
  /** How hard its engine pushes, 0…1 (not saved): its "running" picture follows it. */
  prop: number;
  /** Seconds before the "ice" message may show again. */
  iceWarn: number;
  /** Its hull (data/sea.ts boatWear; saved): at zero it goes back broken to the hold. */
  hull: number;
  /** How it rides the waves now (ride.ts; not saved). */
  ride: RideState;
}

export interface SavedBoat {
  model: string;
  x: number;
  face: 1 | -1;
  fuel: number;
  drums: number;
  out: boolean;
  aboard: boolean;
  /** Added 9 ottobre: missing = whole. */
  hull?: number;
}

export const boatModel = (id: string): BoatModel => BOAT_MODELS.find((m) => m.id === id) ?? BOAT_MODELS[0]!;
export const boatLength = (b: { model: string }): number => boatModel(b.model).lengthM * WORLD.unitsPerMetre;
export const boatTopSpeed = (b: { model: string }): number => boatModel(b.model).knots / HELM.knotsPerUnit;

export function newBoat(saved: SavedBoat | null): BoatState {
  const m = boatModel(saved?.model ?? '');
  const clamp = (v: number, hi: number): number => Math.max(0, Math.min(hi, v));
  return {
    owned: !!saved,
    model: m.id,
    aboard: !!saved?.out && !!saved.aboard,
    x: saved?.x ?? 0,
    y: WORLD.surfaceY,
    face: saved?.face ?? 1,
    speed: 0,
    fuel: saved ? clamp(saved.fuel, m.tank) : m.tank,
    drums: saved ? clamp(saved.drums, m.drums) : 0,
    fuelWarned: false,
    bay: !saved ? 'none' : saved.out ? 'out' : 'docked',
    bayT: saved?.out ? 1 : 0,
    dockFromX: 0,
    engineOn: false,
    prop: 0,
    iceWarn: 0,
    hull: clamp(saved?.hull ?? m.hull, m.hull),
    ride: newRide(),
  };
}

export function saveBoat(b: BoatState): SavedBoat | null {
  if (!b.owned) return null;
  // half-way along the ramp counts as where it was going
  const out = b.bay === 'out' || b.bay === 'launching';
  return {
    model: b.model,
    x: Math.round(b.x),
    face: b.face,
    fuel: Math.round(b.fuel * 10) / 10,
    drums: Math.round(b.drums),
    out,
    aboard: out && b.aboard,
    hull: Math.round(b.hull * 10) / 10,
  };
}

/** A new boat of this model in the hold (from the shipyard), full tank, empty drums; null: none. */
export function boatFromYard(b: BoatState, model: string | null): void {
  if (!model) {
    Object.assign(b, newBoat(null));
    return;
  }
  Object.assign(b, newBoat({ model, x: 0, face: 1, fuel: Infinity, drums: 0, out: false, aboard: false }));
}

export interface BoatWorld {
  boat: BoatState;
  map: TileMap;
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 };
}

/**
 * One step on the water (out of the hold). `helm` is null when you are not aboard: it slows to a stop. The engine
 * starts with the throttle, like the ship's; dry, it crawls on its reserve.
 */
export function sailBoat(
  g: BoatWorld,
  helm: HelmState | null,
  dt: number,
  events: GameEvent[],
  sea: SeaWeather = CALM_SEA,
  t = 0,
): void {
  const b = g.boat;
  if (!b.owned || b.bay !== 'out') {
    settleRide(b.ride);
    return;
  }
  const m = boatModel(b.model);
  b.iceWarn = Math.max(0, b.iceWarn - dt);
  if (helm && helm.throttle > 0 && !b.engineOn) {
    b.engineOn = true;
    events.push({ type: 'engineStarted', vehicle: 'boat' });
  }
  const dry = b.fuel <= 0;
  // against the current in rough weather the small boats lose the most (owner, 9 ottobre)
  const top = boatTopSpeed(b) * (dry ? BOAT.dryCrawl : 1) * currentMult('boat', sea);
  const push = helm && b.engineOn ? helm.throttle : 0;
  b.prop += (push - b.prop) * Math.min(1, dt * 3);
  const rates = { accel: m.accel, coast: m.coast, brake: m.brake, turnBelow: SHIP.turnBelow };
  if (helm && b.engineOn) {
    const h = stepHeading(b.face, b.speed, helm, top, rates, dt);
    b.face = h.face;
    b.speed = h.speed;
  } else b.speed = Math.max(0, b.speed - m.coast * dt);
  if (b.speed > top) b.speed = Math.max(top, b.speed - m.brake * dt);

  // ahead: the ice sheet or an iceberg stops it (only the ship breaks ice)
  const half = boatLength(b) / 2;
  const from = b.x;
  let next = b.x + b.face * b.speed * dt;
  const bow = next + b.face * (half + BOAT.iceMargin);
  const lo = Math.min(bow, b.x + b.face * half);
  const hi = Math.max(bow, b.x + b.face * half);
  if (b.speed > 0 && (iceIn(g.map, lo, hi, 4) || icebergAcross(lo, hi))) {
    next = b.x;
    b.speed = 0;
    if (b.iceWarn <= 0) {
      events.push({ type: 'boatIce' });
      b.iceWarn = 6;
    }
  }
  // the ship's waters: from Porto Fango to the end of the known sea
  b.x = Math.max(SHIP_WEST_X, Math.min(SEA_END_X - half, next));
  if (b.x !== next) b.speed = 0;
  b.y = WORLD.surfaceY;

  const burn = litresFor(Math.abs(b.x - from), dry ? 0 : push, m.perKm);
  b.fuel = Math.max(0, b.fuel - burn);
  if (b.fuel > 0) b.fuelWarned = false;
  else if (!b.fuelWarned) {
    b.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'boat' });
  }
  const was = b.hull;
  // light and short, fast into a wave it flies (ride.ts); flipped over, it stops and its hull takes the blow
  if (stepRide(b.ride, b.x, b.face, boatLength(b), sea, t, dt)) {
    b.speed = 0;
    b.hull = Math.max(0, b.hull - m.hull * SEA_STATE.capsizeDamage);
    events.push({ type: 'boatCapsized' });
  }
  if (b.ride.flipped > 0) b.speed = 0;
  if (b.aboard) Object.assign(g.diver, { x: b.x, y: b.y - 4, vx: b.face * b.speed, vy: 0, face: b.face });
  // fast through a rough sea the hull wears: half gone, a warning; gone, it goes back broken to the hold (vehicles.ts)
  if (b.aboard) b.hull = Math.max(0, b.hull - boatWear(b.speed / boatTopSpeed(b), sea, dt));
  if (was > m.hull / 2 && b.hull <= m.hull / 2) events.push({ type: 'boatHullHalf' });
  if (was > 0 && b.hull <= 0) events.push({ type: 'boatWrecked' });
}

/** Coming into a harbour: its hull mended, for the teeth you have. */
export function repairBoat(g: { boat: BoatState; gear: { teeth: number } }, events: GameEvent[]): void {
  const b = g.boat;
  const missing = boatModel(b.model).hull - b.hull;
  if (!b.owned || missing <= 0) return;
  const points = Math.min(missing, Math.floor(g.gear.teeth / SEA_STATE.boatRepairPerPoint));
  if (points <= 0) return;
  const cost = Math.ceil(points * SEA_STATE.boatRepairPerPoint);
  g.gear.teeth -= cost;
  b.hull += points;
  events.push({ type: 'boatRepaired', cost });
}

/** What its engine sounds like (null: off): how hard it works. Heard only aboard. */
export const boatEngineLevel = (b: BoatState, throttle: number): number | null =>
  b.aboard && b.engineOn ? Math.max(0.15, throttle) : null;

export { BOAT_TEXT };
