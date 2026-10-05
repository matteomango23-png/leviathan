// The expedition ship (data/ship.ts): Aurelio's gift at the end of chapter 4, your home at sea. At the helm the
// levers drive it (helm.ts): heavy, it speeds up and slows down slowly; the direction lever the other way turns it
// round once slow. It breaks the ice (slower), stops in shallow water and never gets stuck on what sticks out of
// the water: it sails round it, on the far lane, behind it. With the hatch open it does not move. Pure logic;
// hatch.ts opens the hatch and moves the submarine, views/shipView.ts draws it.
import { SHIP, SHIP_UPGRADES, type ShipUpgradeDef } from '../../data/ship';
import { STORY_STEPS, type StoryStep } from '../../data/story';
import { WRECK } from '../../data/chapter4';
import { PORTO_FANGO } from '../../data/economy';
import type { GameEvent } from '../events';
import { litresFor } from '../fuelBurn';
import { knotsOf, stepHeading, type HelmState } from '../helm';
import type { TileMap } from '../world/tileMap';
import { helmPoint, shipSpan } from './geometry';
import { breakIce, iceIn, refreeze, SEA_END_X, SHIP_WEST_X, type BrokenIce } from './surface';

/** Where the submarine is: in the hold, going down or up the ramp, or out in the sea (or not yours yet). */
export type Bay = 'none' | 'docked' | 'launching' | 'out' | 'docking';

export interface ShipState {
  owned: boolean;
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
  /** You are at the helm. */
  aboard: boolean;
  /** Litres of fuel (fuel.ts); dry, it does not move. */
  fuel: number;
  fuelWarned: boolean;
  /** The sonar is switched on (not saved), and seconds to its next ping. */
  sonarOn: boolean;
  sonarT: number;
  /** Parts bought for it (data/ship.ts SHIP_UPGRADES). */
  upgrades: string[];
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
  upgrades: string[];
}

const parts = (s: { upgrades: readonly string[] }): ShipUpgradeDef[] =>
  SHIP_UPGRADES.filter((u) => s.upgrades.includes(u.id));

/** Its tank, top speed and sonar range, with the parts bought. */
export const shipTank = (s: { upgrades: readonly string[] }): number =>
  SHIP.fuel.tank + parts(s).reduce((a, u) => a + (u.tankExtra ?? 0), 0);
export const shipTopSpeed = (s: { upgrades: readonly string[] }): number =>
  SHIP.maxSpeed * parts(s).reduce((a, u) => a * (u.speedMult ?? 1), 1);
export const sonarMult = (s: { upgrades: readonly string[] }): number =>
  parts(s).reduce((a, u) => a * (u.sonarMult ?? 1), 1);

/** Buying a part at a harbour (the ship must be yours). */
export function buyShipUpgrade(
  g: { ship: ShipState; gear: { teeth: number } },
  id: string,
): { ok: boolean; reason?: string } {
  const u = SHIP_UPGRADES.find((x) => x.id === id);
  if (!u || !g.ship.owned) return { ok: false, reason: 'Prima ti serve la nave.' };
  if (g.ship.upgrades.includes(id)) return { ok: false, reason: 'Già montato.' };
  if (g.gear.teeth < u.price) return { ok: false, reason: `Servono ${u.price} denti.` };
  g.gear.teeth -= u.price;
  g.ship.upgrades.push(id);
  return { ok: true };
}

export function newShip(saved: SavedShip | null): ShipState {
  const bay = saved?.bay ?? 'none';
  return {
    owned: !!saved,
    x: saved?.x ?? WRECK.x,
    face: saved?.face ?? 1,
    speed: 0,
    hatch: saved?.hatchOpen ? 1 : 0,
    hatchOpen: saved?.hatchOpen ?? false,
    bay,
    bayT: bay === 'out' ? 1 : 0,
    aboard: saved?.aboard ?? false,
    upgrades: [...(saved?.upgrades ?? [])],
    fuel: saved ? Math.max(0, Math.min(shipTank(saved), saved.fuel)) : SHIP.fuel.tank,
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
    upgrades: [...s.upgrades],
  };
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
  const spots = [Math.max(WRECK.x, SHIP_WEST_X), PORTO_FANGO.shipDock];
  s.x = spots.reduce((a, b) => (Math.abs(b - g.diver.x) < Math.abs(a - g.diver.x) ? b : a));
  s.bay = !g.sub.owned ? 'none' : g.sub.aboard ? 'out' : 'docked';
  s.bayT = s.bay === 'out' ? 1 : 0;
  events.push({ type: 'shipGiven' });
}

/** The sonar hears only with the ship slow (owner, 5 ottobre: under 10 knots) and switched on. */
export const sonarActive = (s: ShipState): boolean => s.sonarOn && knotsOf(s.speed) < SHIP.sonar.maxKnots;

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
  giftShip(g, events);
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
  const icy = iceIn(g.map, Math.min(bow, bow + s.face * 40), Math.max(bow, bow + s.face * 40));
  const top = s.fuel <= 0 ? 0 : shipTopSpeed(s) * (icy ? SHIP.iceMult : 1); // dry, it drifts to a stop
  if (helm && !s.hatchOpen && s.hatch === 0) {
    const h = stepHeading(s.face, s.speed, helm, top, SHIP, dt);
    s.face = h.face;
    s.speed = h.speed;
  } else s.speed = Math.max(0, s.speed - (s.hatchOpen ? SHIP.brake : SHIP.coast) * dt);
  if (s.speed > top) s.speed = Math.max(top, s.speed - SHIP.iceBite * dt); // into the ice: it bites

  // its waters (owner, 5 ottobre): from the trading harbour of Porto Fango east to the end of the known sea, with
  // nothing in the way (no icebergs, no islands); west of the harbour it does not go
  const half = SHIP.length / 2;
  const from = s.x;
  const end = SEA_END_X - half;
  s.x = Math.max(SHIP_WEST_X, Math.min(end, s.x + s.face * s.speed * dt));
  const atEdge = s.x >= end ? 'seaEnd' : s.x <= SHIP_WEST_X ? 'shipWest' : null;
  if (atEdge && s.speed > 0 && s.face > 0 === (atEdge === 'seaEnd')) {
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: atEdge });
      s.shallowWarn = 6;
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
  if (s.speed > 0.5) {
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
