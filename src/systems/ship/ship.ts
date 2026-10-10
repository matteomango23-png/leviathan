// The expedition ship (data/ship.ts): Aurelio's gift at Porto Fango, your home at sea. At the helm the
// levers drive it (helm.ts): heavy, it speeds up and slows down slowly; the direction lever the other way turns it
// round once slow. It breaks the ice (slower), stops in shallow water and never gets stuck on what sticks out of
// the water: it sails round it, on the far lane, behind it. With a hatch open it does not move. Pure logic;
// hatch.ts opens the hatch and moves the submarine, views/shipView.ts draws it.
import { SHIP } from '../../data/ship';
import { newRide, settleRide, stepRide, type RideState } from '../ride';
import { CALM_SEA, currentMult, type SeaWeather } from '../sea';
import { FIRST_SHIP } from '../../data/fleet';
import { PORTO_FANGO } from '../../data/economy';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { litresFor } from '../fuelBurn';
import { knotsOf, stepHeading, type HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { helmPoint, shipDraft, shipSpan } from './geometry';
import { breakIce, refreeze, SEA_END_X, SHIP_WEST_X, type BrokenIce } from './surface';
import {
  shipLength,
  shipModel,
  shipPicture,
  shipRates,
  shipTank,
  shipTopSpeed,
  sonarMaxKnots,
} from './model';
import { icebergAcross } from '../world/icebergs';
import { fullAir, hullBlocked, stepDive, submerged } from './uboat';

/** Where the submarine is: in the hold, going down or up the ramp, or out in the sea (or not yours yet). */
export type Bay = 'none' | 'docked' | 'launching' | 'out' | 'docking';

export interface ShipState {
  owned: boolean;
  /** Which ship it is (data/fleet.ts), bought at the shipyard of Porto Fango. */
  model: string;
  x: number;
  face: 1 | -1;
  /** Speed along where it points (≥ 0). */
  speed: number;
  /** Its hatches, one per bay of its model (data/fleet.ts): `t` 0 = closed … 1 = open; `open` is where it goes. */
  hatches: HatchState[];
  /** Where the submarine is (its own hatch): see `Bay`. */
  bay: Bay;
  /** Along the ramp: 0 = in the hold … 1 = at mid-water under the hatch. */
  bayT: number;
  /** Docking: where the submarine glides from to the ramp, and how far it is (0…1); null once on the ramp. */
  dockFrom: { x: number; y: number; t: number; at: number } | null;
  /** You are at the helm. */
  aboard: boolean;
  /** The engine runs (owner, 8 ottobre): it starts with the throttle, burns a little even still, and the button
   *  switches it off. Off, the ship coasts to a stop, silent. */
  engineOn: boolean;
  /** How hard the propeller turns, 0…1 (not saved): the engine pushing, not the ship coasting (owner, 8 ottobre:
   *  the propeller picture and its bubbles follow it). */
  prop: number;
  /** How it rides the waves now (ride.ts; not saved). */
  ride: RideState;
  /** Seconds the bow keeps breaking ice (not saved; > 0 while it cuts): shards fly, the bow wave is gone. */
  iceT: number;
  /** U-Boats (block 4c, ship/uboat.ts): units under its floating line (0 = afloat), and seconds of air left. */
  dive: number;
  air: number;
  /** Slowing down by itself into the harbour (not saved: says it once per approach). */
  approaching: boolean;
  /** Litres of fuel (fuel.ts); dry, it does not move. */
  fuel: number;
  fuelWarned: boolean;
  /** The sonar is switched on (not saved), and seconds to its next ping. */
  sonarOn: boolean;
  sonarT: number;
  /** The light under the still ship (block 5b; not saved) and how long it has been on (seconds). */
  lightOn: boolean;
  lightT: number;
  /** Seconds before the shallow-water message may show again. */
  shallowWarn: number;
  /** Ice broken by the bow, freezing again later (not saved). */
  broken: BrokenIce[];
}

export interface HatchState {
  t: number;
  open: boolean;
}

export interface SavedShip {
  x: number;
  face: 1 | -1;
  /** Which hatches are open (v19; before, one `hatchOpen`). */
  hatches: boolean[];
  bay: 'none' | 'docked' | 'out';
  aboard: boolean;
  fuel: number;
  engineOn?: boolean; // added 8 ottobre: missing = off
  dive?: number; // U-Boats (9 ottobre): missing = afloat
  air?: number;
  model: string; // v18
}

export { shipTank, shipTopSpeed } from './model';

/** The hatches of a model, closed (or as saved). */
export const freshHatches = (s: { model: string }, open: readonly boolean[] = []): HatchState[] =>
  shipModel(s).bays.map((_, i) => ({ t: open[i] ? 1 : 0, open: !!open[i] }));

/** How open a hatch is (0…1), and whether it is opening. A bay the model lacks: shut. */
export const hatchT = (s: ShipState, bay: number): number => s.hatches[bay]?.t ?? 0;
export const hatchOpening = (s: ShipState, bay: number): boolean => s.hatches[bay]?.open ?? false;

/** All its hatches shut: only then the engine drives it. */
export const hatchesShut = (s: ShipState): boolean => s.hatches.every((h) => !h.open && h.t === 0);

export function newShip(saved: SavedShip | null): ShipState {
  const bay = saved?.bay ?? 'none';
  return {
    owned: !!saved,
    model: saved?.model ?? FIRST_SHIP,
    x: saved?.x ?? PORTO_FANGO.shipDock,
    face: saved?.face ?? 1,
    speed: 0,
    hatches: freshHatches({ model: saved?.model ?? FIRST_SHIP }, saved?.hatches),
    bay,
    bayT: bay === 'out' ? 1 : 0,
    dockFrom: null,
    aboard: saved?.aboard ?? false,
    engineOn: saved?.engineOn ?? false,
    prop: 0,
    ride: newRide(),
    approaching: false,
    iceT: 0,
    dive: Math.max(0, saved?.dive ?? 0),
    air: saved?.air ?? fullAir({ model: saved?.model ?? FIRST_SHIP }),
    fuel: saved ? Math.max(0, Math.min(shipTank(saved), saved.fuel)) : shipTank({ model: FIRST_SHIP }),
    fuelWarned: false,
    sonarOn: false,
    lightOn: false,
    lightT: 0,
    sonarT: 0,
    shallowWarn: 0,
    broken: [],
  };
}

export function saveShip(s: ShipState): SavedShip | null {
  if (!s.owned) return null;
  // half-way down or up the ramp counts as where it was going
  const bay = s.bay === 'launching' ? 'out' : s.bay === 'docking' ? 'docked' : s.bay;
  const fuel = Math.round(s.fuel * 10) / 10;
  return {
    x: Math.round(s.x),
    face: s.face,
    hatches: s.hatches.map((h) => h.open),
    bay,
    aboard: s.aboard,
    fuel,
    engineOn: s.engineOn,
    ...(shipModel(s).dive ? { dive: Math.round(s.dive), air: Math.round(s.air) } : {}),
    model: s.model,
  };
}

export interface ShipWorld {
  ship: ShipState;
  map: TileMap;
  sub: { owned: boolean; aboard: boolean };
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 };
}

/** Aurelio's gift at Porto Fango (story.ts): moored at the trading harbour, with the submarine in its hold. */
export function giftShip(g: Pick<ShipWorld, 'ship' | 'sub'>, events: GameEvent[]): void {
  const s = g.ship;
  if (s.owned) return;
  s.owned = true;
  s.x = PORTO_FANGO.shipDock;
  s.bay = !g.sub.owned ? 'none' : g.sub.aboard ? 'out' : 'docked';
  s.bayT = s.bay === 'out' ? 1 : 0;
  events.push({ type: 'shipGiven' });
}

/** The sonar hears only with the ship slow enough for its model (owner, 5 and 8 ottobre) and switched on. */
export const sonarActive = (s: ShipState): boolean => s.sonarOn && knotsOf(s.speed) < sonarMaxKnots(s);

/** Can the hatch move now? Only with the ship still and the submarine not on the ramp. */
export const hatchCanMove = (s: ShipState): boolean =>
  s.owned && s.speed < SHIP.stillBelow && s.bay !== 'launching' && s.bay !== 'docking';

/**
 * One step of the ship. `helm` is null when you are not at the helm (it drifts to a stop). `far` tells whether
 * a world x is far enough from you and the ship for the ice to freeze again unseen. Returns tiles that changed.
 */
export function sailShip(
  g: ShipWorld,
  helm: HelmState | null,
  dt: number,
  events: GameEvent[],
  far: (x: number) => boolean,
  sea: SeaWeather = CALM_SEA,
  t = 0,
): number[] {
  const s = g.ship;
  if (!s.owned) return [];
  s.shallowWarn = Math.max(0, s.shallowWarn - dt);
  for (const h of s.hatches)
    h.t = Math.max(0, Math.min(1, h.t + ((h.open ? 1 : -1) * dt) / SHIP.hatchSeconds));
  // the sonar pings while it is on and the ship slow enough to hear
  if (sonarActive(s) && s.aboard) {
    s.sonarT -= dt;
    if (s.sonarT <= 0) {
      s.sonarT = SHIP.sonar.pingSeconds;
      events.push({ type: 'sonarPing' });
    }
  } else s.sonarT = 0;

  const { x0, x1 } = shipSpan(s);
  const bow = s.face > 0 ? x1 : x0;
  // the ice sheet breaks under the bow without slowing it; an iceberg slows it down (owner, 8 ottobre: entering the
  // Banchisa capped the ship at 10 knots)
  const icy = icebergAcross(Math.min(bow, bow + s.face * 40), Math.max(bow, bow + s.face * 40));
  // dry, it drifts to a stop; a storm's current holds it back a little (owner, 9 ottobre)
  const top = s.fuel <= 0 ? 0 : shipTopSpeed(s) * (icy ? SHIP.iceMult : 1) * currentMult('ship', sea);
  // the throttle off zero starts the engine; dry, it stops (owner, 8 ottobre)
  if (helm && helm.throttle > 0 && s.fuel > 0 && !s.engineOn) {
    s.engineOn = true;
    events.push({ type: 'engineStarted' });
  }
  if (s.fuel <= 0 && s.engineOn) {
    s.engineOn = false;
    events.push({ type: 'engineStopped' });
  }
  const shut = hatchesShut(s);
  const push = helm && s.engineOn && shut ? helm.throttle : 0;
  s.prop += (push - s.prop) * Math.min(1, dt * 2); // the propeller speeds up and slows down gently
  if (helm && s.engineOn && shut) {
    const h = stepHeading(s.face, s.speed, helm, top, shipRates(s), dt);
    s.face = h.face;
    s.speed = h.speed;
  } else s.speed = Math.max(0, s.speed - (shut ? shipRates(s).coast : shipRates(s).brake) * dt);
  if (s.speed > top) s.speed = Math.max(top, s.speed - SHIP.iceBite * dt); // into the ice: it bites

  // its waters (owner, 5 ottobre): from the trading harbour of Porto Fango east to the end of the known sea, with
  // nothing in the way (no icebergs, no islands); west of the harbour it does not go
  const half = shipLength(s) / 2;
  const from = s.x;
  const end = SEA_END_X - half;
  // coming into Porto Fango (or to the end of the sea) it slows down by itself and stops at the berth (owner,
  // 8 ottobre: at full speed you crashed into it every time, unseen), the throttle lever going down with the speed
  // (owner, 9 ottobre). The pier is at the surface: a U-Boat under water passes beneath it, on west.
  const A = SHIP.approach;
  const afloat = !submerged(s);
  // only with the berth still ahead: a U-Boat that passed beneath it and came up on its west side sails on freely
  // (owner, 9 ottobre: it braked there, "approaching Porto Fango", with the harbour behind it)
  const toBerth = Math.max(0, s.x - PORTO_FANGO.shipDock);
  const ahead = s.face < 0 ? (afloat && s.x >= SHIP_WEST_X ? toBerth : Infinity) : end - s.x;
  if (ahead < A.range && s.speed > 0) {
    const most = Math.sqrt(2 * A.decel * Math.max(0, ahead)); // the speed that stops it right there
    if (s.speed > most) {
      s.speed = most; // it follows the braking curve exactly: it stops at the berth, never all at once
      if (helm && top > 0) helm.throttle = Math.min(helm.throttle, s.speed / top);
      if (!s.approaching && s.face < 0) events.push({ type: 'harbourApproach' });
      s.approaching = true;
    }
  } else s.approaching = false;
  // afloat no ship sails west past the harbour's pier; a U-Boat that went beneath it and came up on its west side
  // sails on there at the surface (owner, 9 ottobre: it was stopped), and only under water goes back east past it
  const westSide = afloat && s.x < SHIP_WEST_X;
  const west = afloat && !westSide ? SHIP_WEST_X : -Infinity;
  const east = westSide ? SHIP_WEST_X - 1 : end;
  // a U-Boat under water stops against rock with its whole hull (ship/uboat.ts)
  const ahead2 = s.x + s.face * s.speed * dt;
  if (hullBlocked(g.map, s, ahead2, s.dive)) s.speed = 0;
  else s.x = Math.max(west, Math.min(east, ahead2));
  const atEdge = s.x >= end ? 'seaEnd' : s.x <= west || (westSide && s.x >= east) ? 'shipWest' : null;
  const into = atEdge === 'seaEnd' || westSide ? 1 : -1; // the way that runs into it
  if (atEdge && s.speed > 0 && s.face === into) {
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: atEdge });
      s.shallowWarn = 6;
    }
  }
  const engine = helm && s.engineOn && shut ? helm.throttle : 0;
  const idle = s.engineOn ? (SHIP.fuel.idlePerMinute / 60) * dt : 0; // running, it burns a little even still
  s.fuel = Math.max(0, s.fuel - idle - litresFor(Math.abs(s.x - from), engine, shipModel(s).perKm));
  if (s.fuel > 0) s.fuelWarned = false;
  else if (!s.fuelWarned) {
    s.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'ship' });
  }

  s.iceT = Math.max(0, s.iceT - dt);
  const changed: number[] = [];
  if (s.speed > 0.5 && !submerged(s)) {
    // under water a U-Boat slips beneath the ice sheet
    // the ice breaks under the hull, just behind the bow where the ship covers it (owner, 8 ottobre: it broke
    // ahead of the bow, before the ship touched it)
    const nose = s.x + s.face * shipLength(s) * (shipPicture(s).bowU - 0.5); // where the bow meets the water, now
    const [near, far] = SHIP.iceBehindBow;
    const cut = breakIce(
      g.map,
      Math.min(nose - s.face * near, nose - s.face * far),
      Math.max(nose - s.face * near, nose - s.face * far),
      s.broken,
      shipDraft(s),
    );
    if (cut.length) {
      events.push({ type: 'iceCracked', x: nose, speed: s.speed });
      s.iceT = SHIP.iceCrackSeconds;
    }
    changed.push(...cut);
  }
  changed.push(...stepDive(g.map, s, helm, dt, events));
  // on the waves: a body floating on its bow and stern (ride.ts); under water a U-Boat no longer feels them
  if (submerged(s)) settleRide(s.ride);
  else stepRide(s.ride, s.x, s.face, shipLength(s), sea, t, dt);
  changed.push(...refreeze(g.map, s.broken, dt, far));

  if (s.aboard) {
    const p = helmPoint(s);
    Object.assign(g.diver, { x: p.x, y: p.y, vx: s.face * s.speed, vy: 0, face: s.face });
  }
  return changed;
}

/**
 * What its engine sounds like to you (owner, 8 ottobre): null when it is off; otherwise how hard it works (the lever
 * at the helm, its speed when you are elsewhere) and how near you are (1 aboard … 0 at `hearRange` or farther).
 */
export function engineHeard(
  s: ShipState,
  you: { x: number; y: number },
  throttle: number,
  hearRange: number,
): { level: number; near: number } | null {
  if (!s.owned || !s.engineOn) return null;
  const level = s.aboard ? throttle : s.speed / Math.max(1, shipTopSpeed(s));
  const near = s.aboard ? 1 : Math.max(0, 1 - Math.hypot(you.x - s.x, you.y - WORLD.surfaceY) / hearRange);
  return { level, near };
}
