// The expedition ship (data/ship.ts): Aurelio's gift at the end of chapter 4, your home at sea. At the helm the
// levers drive it (helm.ts): heavy, it speeds up and slows down slowly; the direction lever the other way turns it
// round once slow. It breaks the ice (slower), stops in shallow water and never gets stuck on what sticks out of
// the water: it sails round it, on the far lane, behind it. With the hatch open it does not move. Pure logic;
// hatch.ts opens the hatch and moves the submarine, views/shipView.ts draws it.
import { SHIP } from '../../data/ship';
import { STORY_STEPS, type StoryStep } from '../../data/story';
import { WRECK } from '../../data/chapter4';
import { PORT, PORTO_FANGO } from '../../data/economy';
import type { GameEvent } from '../events';
import { litresFor } from '../fuelBurn';
import { stepHeading, type HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { helmPoint, shipSpan } from './geometry';
import {
  SEA_END_X,
  BEACH_END,
  breakIce,
  iceIn,
  obstacleIn,
  refreeze,
  shallowAt,
  type BrokenIce,
} from './surface';

/** Where the submarine is: in the hold, going down or up the ramp, or out in the sea (or not yours yet). */
export type Bay = 'none' | 'docked' | 'launching' | 'out' | 'docking';

export interface ShipState {
  owned: boolean;
  x: number;
  face: 1 | -1;
  /** Speed along where it points (≥ 0). */
  speed: number;
  /** 0 = near lane, 1 = far lane (sailing round something behind it). */
  lane: number;
  /** 0 = hatch closed … 1 = open; `hatchOpen` is where it is going. */
  hatch: number;
  hatchOpen: boolean;
  bay: Bay;
  /** Along the ramp: 0 = in the hold … 1 = at mid-water under the hatch. */
  bayT: number;
  /** You are at the helm. */
  aboard: boolean;
  /** Litres of fuel (fuel.ts); dry, it does not move. */
  fuel: number;
  fuelWarned: boolean;
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
}

export function newShip(saved: SavedShip | null): ShipState {
  const bay = saved?.bay ?? 'none';
  return {
    owned: !!saved,
    x: saved?.x ?? WRECK.x,
    face: saved?.face ?? 1,
    speed: 0,
    lane: 0,
    hatch: saved?.hatchOpen ? 1 : 0,
    hatchOpen: saved?.hatchOpen ?? false,
    bay,
    bayT: bay === 'out' ? 1 : 0,
    aboard: saved?.aboard ?? false,
    fuel: saved ? Math.max(0, Math.min(SHIP.fuel.tank, saved.fuel)) : SHIP.fuel.tank,
    fuelWarned: false,
    shallowWarn: 0,
    broken: [],
  };
}

export function saveShip(s: ShipState): SavedShip | null {
  if (!s.owned) return null;
  // half-way down or up the ramp counts as where it was going
  const bay = s.bay === 'launching' ? 'out' : s.bay === 'docking' ? 'docked' : s.bay;
  const fuel = Math.round(s.fuel * 10) / 10;
  return { x: Math.round(s.x), face: s.face, hatchOpen: s.hatchOpen, bay, aboard: s.aboard, fuel };
}

export interface ShipWorld {
  ship: ShipState;
  map: TileMap;
  story: { step: StoryStep };
  sub: { owned: boolean; aboard: boolean };
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 };
}

/** Aurelio's gift: once chapter 4 is over (also for saves made after it), with the submarine in its hold. */
export function giftShip(g: ShipWorld, events: GameEvent[]): void {
  const s = g.ship;
  if (s.owned || STORY_STEPS.indexOf(g.story.step) < STORY_STEPS.indexOf('chapter4Done')) return;
  s.owned = true;
  // above the galleon of the Foresta Sommersa, where chapter 4 ends; an older save far from there finds it at the
  // nearest harbour
  const spots = [WRECK.x, PORT.shipDock, PORTO_FANGO.shipDock];
  s.x = spots.reduce((a, b) => (Math.abs(b - g.diver.x) < Math.abs(a - g.diver.x) ? b : a));
  s.bay = !g.sub.owned ? 'none' : g.sub.aboard ? 'out' : 'docked';
  s.bayT = s.bay === 'out' ? 1 : 0;
  events.push({ type: 'shipGiven' });
}

/** Can the hatch move now? Only with the ship still, on the near lane, and the submarine not on the ramp. */
export const hatchCanMove = (s: ShipState): boolean =>
  s.owned && s.speed < SHIP.stillBelow && s.lane === 0 && s.bay !== 'launching' && s.bay !== 'docking';

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
  giftShip(g, events);
  if (!s.owned) return [];
  s.shallowWarn = Math.max(0, s.shallowWarn - dt);
  s.hatch = Math.max(0, Math.min(1, s.hatch + ((s.hatchOpen ? 1 : -1) * dt) / SHIP.hatchSeconds));

  // the far lane: something sticks out of the water under or just ahead of the hull
  const { x0, x1 } = shipSpan(s);
  const ahead = SHIP.lane.lookAhead + s.speed * SHIP.lane.seconds;
  const blocked = obstacleIn(g.map, s.face > 0 ? x0 : x0 - ahead, s.face > 0 ? x1 + ahead : x1);
  const step = dt / SHIP.lane.seconds;
  s.lane = Math.max(0, Math.min(1, s.lane + (blocked ? step : -step)));

  const bow = s.face > 0 ? x1 : x0;
  const icy =
    s.lane < 0.5 && iceIn(g.map, Math.min(bow, bow + s.face * 40), Math.max(bow, bow + s.face * 40));
  const top = s.fuel <= 0 ? 0 : SHIP.maxSpeed * (icy ? SHIP.iceMult : 1); // dry, it drifts to a stop
  if (helm && !s.hatchOpen && s.hatch === 0) {
    const h = stepHeading(s.face, s.speed, helm, top, SHIP, dt);
    s.face = h.face;
    s.speed = h.speed;
  } else s.speed = Math.max(0, s.speed - (s.hatchOpen ? SHIP.brake : SHIP.coast) * dt);
  if (s.speed > top) s.speed = Math.max(top, s.speed - SHIP.iceBite * dt); // into the ice: it bites

  // the beach ahead of the bow: it stops (elsewhere rock under the surface is sailed round, on the far lane)
  const nextBow = bow + s.face * (s.speed * dt + 4);
  if (s.lane < 0.5 && s.speed > 0 && nextBow < BEACH_END && shallowAt(g.map, nextBow)) {
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: 'shipShallow' });
      s.shallowWarn = 5;
    }
  }
  const half = SHIP.length / 2;
  const from = s.x;
  const end = SEA_END_X - half;
  s.x = Math.max(half + 8, Math.min(end, s.x + s.face * s.speed * dt));
  if (s.x >= end && s.face > 0 && s.speed > 0) {
    s.speed = 0; // the end of the known sea
    if (s.shallowWarn <= 0) {
      events.push({ type: 'seaEnd' });
      s.shallowWarn = 8;
    }
  }
  const engine = helm && !s.hatchOpen ? helm.throttle : 0;
  s.fuel = Math.max(0, s.fuel - litresFor(Math.abs(s.x - from), engine, SHIP.fuel.perKm));
  if (s.fuel > 0) s.fuelWarned = false;
  else if (!s.fuelWarned) {
    s.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'ship' });
  }

  const changed: number[] = [];
  if (s.lane < 0.5 && s.speed > 0.5) {
    const cut = breakIce(g.map, bow - 10, bow + 10, s.broken);
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
