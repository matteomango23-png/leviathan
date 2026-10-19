// The expedition ship (data/ship.ts): Aurelio's gift at Porto Fango, your home at sea. At the helm the
// levers drive it (helm.ts): heavy, it speeds up and slows down slowly; the direction lever the other way turns it
// round once slow. It breaks the ice (slower), stops in shallow water and never gets stuck on what sticks out of
// the water: it sails round it, on the far lane, behind it. With a hatch open it does not move. Pure logic;
// hatch.ts opens the hatch and moves the submarine, views/shipView.ts draws it.
import { SHIP } from '../../data/ship';
import { newRide, type RideState } from '../ride';
import { FIRST_SHIP } from '../../data/fleet';
import { PORTO_FANGO } from '../../data/economy';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { knotsOf } from '../helm';
import type { TileMap } from '../world/tileMap';
import { type BrokenIce } from './surface';
import { shipModel, shipTank, shipTopSpeed, sonarMaxKnots } from './model';
import { fullAir } from './uboat';

/** Where the submarine is: in the hold, going down or up the ramp, or out in the sea (or not yours yet). */
type Bay = 'none' | 'docked' | 'launching' | 'out' | 'docking';

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
  /** The Krill Hunter's mouth (not saved): open, how open it shows (0…1), sardines swallowed since it opened, its
   *  appetite (sardines it can still swallow) and whether it already said it is full. */
  mouthOpen: boolean;
  mouthT: number;
  mouthEaten: number;
  mouthFood: number;
  mouthFullSaid: boolean;
  /** Its hull points (block 5c, saved) and the pause after a bump (not saved). */
  hull: number;
  hullWait: number;
  /** The light under the still ship (block 5b; not saved) and how long it has been on (seconds). */
  lightOn: boolean;
  lightT: number;
  /** Seconds towards the next healing tick of the pool (ship/shipPool.ts; not saved). */
  poolT: number;
  /** Seconds before the shallow-water message may show again. */
  shallowWarn: number;
  /** Ice broken by the bow, freezing again later (not saved). */
  broken: BrokenIce[];
}

interface HatchState {
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
  hull?: number; // block 5c (10 ottobre): missing = whole
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
    poolT: 0,
    hull: Math.min(shipModel({ model: saved?.model ?? FIRST_SHIP }).hull, saved?.hull ?? Infinity),
    hullWait: 0,
    mouthOpen: false,
    mouthT: 0,
    mouthEaten: 0,
    mouthFood: SHIP.mouth.maxSardines,
    mouthFullSaid: false,
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
    hull: Math.round(s.hull * 10) / 10,
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
