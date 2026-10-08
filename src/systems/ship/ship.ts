// The expedition ship (data/ship.ts): Aurelio's gift at Porto Fango, your home at sea. At the helm the
// levers drive it (helm.ts): heavy, it speeds up and slows down slowly; the direction lever the other way turns it
// round once slow. It breaks the ice (slower), stops in shallow water and never gets stuck on what sticks out of
// the water: it sails round it, on the far lane, behind it. With the hatch open it does not move. Pure logic;
// hatch.ts opens the hatch and moves the submarine, views/shipView.ts draws it.
import { SHIP } from '../../data/ship';
import { FIRST_SHIP } from '../../data/fleet';
import { PORTO_FANGO } from '../../data/economy';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { litresFor } from '../fuelBurn';
import { knotsOf, stepHeading, type HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { helmPoint, shipDraft, shipSpan } from './geometry';
import { breakIce, refreeze, SEA_END_X, SHIP_WEST_X, type BrokenIce } from './surface';
import { shipLength, shipModel, shipRates, shipTank, shipTopSpeed, sonarMaxKnots } from './model';
import { icebergAcross } from '../world/icebergs';

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
  /** 0 = hatch closed … 1 = open; `hatchOpen` is where it is going. */
  hatch: number;
  hatchOpen: boolean;
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
  /** Slowing down by itself into the harbour (not saved: says it once per approach). */
  approaching: boolean;
  /** Litres of fuel (fuel.ts); dry, it does not move. */
  fuel: number;
  fuelWarned: boolean;
  /** The sonar is switched on (not saved), and seconds to its next ping. */
  sonarOn: boolean;
  sonarT: number;
  /** Seconds before the shallow-water message may show again. */
  shallowWarn: number;
  /** Ice broken by the bow, freezing again later (not saved). */
  broken: BrokenIce[];
}

export interface SavedShip {
  x: number;
  face: 1 | -1;
  hatchOpen: boolean;
  bay: 'none' | 'docked' | 'out';
  aboard: boolean;
  fuel: number;
  engineOn?: boolean; // added 8 ottobre: missing = off
  model: string; // v18
}

export { shipTank, shipTopSpeed } from './model';

export function newShip(saved: SavedShip | null): ShipState {
  const bay = saved?.bay ?? 'none';
  return {
    owned: !!saved,
    model: saved?.model ?? FIRST_SHIP,
    x: saved?.x ?? PORTO_FANGO.shipDock,
    face: saved?.face ?? 1,
    speed: 0,
    hatch: saved?.hatchOpen ? 1 : 0,
    hatchOpen: saved?.hatchOpen ?? false,
    bay,
    bayT: bay === 'out' ? 1 : 0,
    dockFrom: null,
    aboard: saved?.aboard ?? false,
    engineOn: saved?.engineOn ?? false,
    prop: 0,
    approaching: false,
    fuel: saved ? Math.max(0, Math.min(shipTank(saved), saved.fuel)) : shipTank({ model: FIRST_SHIP }),
    fuelWarned: false,
    sonarOn: false,
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
    hatchOpen: s.hatchOpen,
    bay,
    aboard: s.aboard,
    fuel,
    engineOn: s.engineOn,
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
): number[] {
  const s = g.ship;
  if (!s.owned) return [];
  s.shallowWarn = Math.max(0, s.shallowWarn - dt);
  s.hatch = Math.max(0, Math.min(1, s.hatch + ((s.hatchOpen ? 1 : -1) * dt) / SHIP.hatchSeconds));
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
  const top = s.fuel <= 0 ? 0 : shipTopSpeed(s) * (icy ? SHIP.iceMult : 1); // dry, it drifts to a stop
  // the throttle off zero starts the engine; dry, it stops (owner, 8 ottobre)
  if (helm && helm.throttle > 0 && s.fuel > 0 && !s.engineOn) {
    s.engineOn = true;
    events.push({ type: 'engineStarted' });
  }
  if (s.fuel <= 0 && s.engineOn) {
    s.engineOn = false;
    events.push({ type: 'engineStopped' });
  }
  const push = helm && s.engineOn && !s.hatchOpen && s.hatch === 0 ? helm.throttle : 0;
  s.prop += (push - s.prop) * Math.min(1, dt * 2); // the propeller speeds up and slows down gently
  if (helm && s.engineOn && !s.hatchOpen && s.hatch === 0) {
    const h = stepHeading(s.face, s.speed, helm, top, shipRates(s), dt);
    s.face = h.face;
    s.speed = h.speed;
  } else s.speed = Math.max(0, s.speed - (s.hatchOpen ? shipRates(s).brake : shipRates(s).coast) * dt);
  if (s.speed > top) s.speed = Math.max(top, s.speed - SHIP.iceBite * dt); // into the ice: it bites

  // its waters (owner, 5 ottobre): from the trading harbour of Porto Fango east to the end of the known sea, with
  // nothing in the way (no icebergs, no islands); west of the harbour it does not go
  const half = shipLength(s) / 2;
  const from = s.x;
  const end = SEA_END_X - half;
  // coming into Porto Fango (or to the end of the sea) it slows down by itself and stops at the berth (owner,
  // 8 ottobre: at full speed you crashed into it every time, unseen)
  const A = SHIP.approach;
  const ahead = s.face < 0 ? s.x - PORTO_FANGO.shipDock : end - s.x;
  if (ahead < A.range && s.speed > 0) {
    const most = Math.sqrt(2 * A.decel * Math.max(0, ahead)); // the speed that stops it right there
    if (s.speed > most) {
      s.speed = most; // it follows the braking curve exactly: it stops at the berth, never all at once
      if (!s.approaching && s.face < 0) events.push({ type: 'harbourApproach' });
      s.approaching = true;
    }
  } else s.approaching = false;
  s.x = Math.max(SHIP_WEST_X, Math.min(end, s.x + s.face * s.speed * dt));
  const atEdge = s.x >= end ? 'seaEnd' : s.x <= SHIP_WEST_X ? 'shipWest' : null;
  if (atEdge && s.speed > 0 && s.face > 0 === (atEdge === 'seaEnd')) {
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: atEdge });
      s.shallowWarn = 6;
    }
  }
  const engine = helm && s.engineOn && !s.hatchOpen ? helm.throttle : 0;
  const idle = s.engineOn ? (SHIP.fuel.idlePerMinute / 60) * dt : 0; // running, it burns a little even still
  s.fuel = Math.max(0, s.fuel - idle - litresFor(Math.abs(s.x - from), engine, shipModel(s).perKm));
  if (s.fuel > 0) s.fuelWarned = false;
  else if (!s.fuelWarned) {
    s.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'ship' });
  }

  const changed: number[] = [];
  if (s.speed > 0.5) {
    const cut = breakIce(g.map, bow - 10, bow + 10, s.broken, shipDraft(s));
    if (cut.length) events.push({ type: 'iceCracked', x: bow, speed: s.speed });
    changed.push(...cut);
  }
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
