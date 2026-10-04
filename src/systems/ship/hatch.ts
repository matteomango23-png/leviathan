// The ship's hatch and the submarine on its ramp (owner, 4 ottobre 2026): stopped, the hatch opens; the submarine,
// you inside, slides down the ramp to mid-water under the ship; it docks again only in front of the hatch, and
// goes back up the same way to the hold, you back at the helm. You climb aboard from the water by the hull, and dive
// off it. Pure logic; ship.ts moves the ship.
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { restAboard, type SubWorld } from '../submarine';
import { bayPath, dockPoint, helmPoint, holdPoint, shipSpan, SHIP_DRAFT } from './geometry';
import { hatchCanMove, type ShipState } from './ship';

export interface HatchWorld extends SubWorld {
  ship: ShipState;
}

/** The hatch button at the helm: opens or closes it (only with the ship still). */
export function toggleHatch(g: HatchWorld, events: GameEvent[]): void {
  const s = g.ship;
  if (!s.aboard) return;
  if (!hatchCanMove(s)) {
    events.push({ type: 'shipHint', text: 'hatchMoving' });
    return;
  }
  s.hatchOpen = !s.hatchOpen;
  events.push({ type: 'hatchMoved', open: s.hatchOpen });
}

/** Can the submarine go down the ramp now? */
export const canLaunch = (g: HatchWorld): boolean =>
  g.ship.aboard && g.ship.hatch === 1 && g.ship.bay === 'docked' && g.sub.hull > 0;

/** "Cala il sottomarino": you climb in and it slides down the ramp. */
export function launchSub(g: HatchWorld, events: GameEvent[]): void {
  if (!canLaunch(g)) return;
  g.ship.aboard = false;
  g.ship.bay = 'launching';
  g.ship.bayT = 0;
  g.sub.aboard = true;
  g.sub.face = g.ship.face;
  events.push({ type: 'subLaunching' });
}

/** In the submarine, in front of the open hatch: "Aggancia". */
export function canDock(g: HatchWorld): boolean {
  const s = g.ship;
  if (!g.sub.aboard || s.bay !== 'out' || s.hatch < 1 || s.lane > 0) return false;
  const p = dockPoint(s);
  return Math.hypot(g.sub.x - p.x, g.sub.y - p.y) < SHIP.dockReach;
}

export function startDock(g: HatchWorld, events: GameEvent[]): void {
  if (!canDock(g)) return;
  g.ship.bay = 'docking';
  g.ship.bayT = 1;
  Object.assign(g.sub, { vx: 0, vy: 0, face: g.ship.face });
  events.push({ type: 'subDocking' });
}

/**
 * The submarine on the ramp (moved here, not by its levers) or waiting in the hold. Returns true while it is on
 * the ramp: then you are inside it and nothing else moves you.
 */
export function stepBay(g: HatchWorld, dt: number, events: GameEvent[]): boolean {
  const s = g.ship;
  const sub = g.sub;
  if (!s.owned || !sub.owned) return false;
  if (s.bay === 'docked') {
    Object.assign(sub, holdPoint(s), { vx: 0, vy: 0, face: s.face });
    return false;
  }
  if (s.bay !== 'launching' && s.bay !== 'docking') return false;
  s.bayT += ((s.bay === 'launching' ? 1 : -1) * dt) / SHIP.launchSeconds;
  const done = s.bay === 'launching' ? s.bayT >= 1 : s.bayT <= 0;
  s.bayT = Math.max(0, Math.min(1, s.bayT));
  Object.assign(sub, bayPath(s, s.bayT), { vx: 0, vy: 0, face: s.face });
  Object.assign(g.diver, { x: sub.x, y: sub.y, vx: 0, vy: 0, face: s.face });
  if (!done) return true;
  if (s.bay === 'launching') {
    s.bay = 'out';
    events.push({ type: 'subLaunched' });
    return false;
  }
  // back in the hold: you climb up to the helm
  s.bay = 'docked';
  sub.aboard = false;
  s.aboard = true;
  Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
  restAboard(g);
  events.push({ type: 'subDocked' });
  return false;
}

/** In the water by the hull (at or near the surface): "A bordo". */
export function canBoardShip(g: HatchWorld & { diver: { dead: boolean } }): boolean {
  const s = g.ship;
  const d = g.diver;
  if (!s.owned || s.aboard || g.sub.aboard || d.dead || s.lane > 0) return false;
  const { x0, x1 } = shipSpan(s);
  const r = SHIP.boardReach;
  return d.x > x0 - r && d.x < x1 + r && d.y < WORLD.surfaceY + SHIP_DRAFT + r;
}

export function boardShip(g: HatchWorld, events: GameEvent[]): void {
  g.ship.aboard = true;
  Object.assign(g.diver, helmPoint(g.ship), { vx: 0, vy: 0 });
  restAboard(g);
  events.push({ type: 'shipBoarded' });
}

/** "Tuffati": off the side, into the water by the hull. */
export function diveFromShip(g: HatchWorld, events: GameEvent[]): void {
  const s = g.ship;
  if (!s.aboard) return;
  s.aboard = false;
  const x = helmPoint(s).x;
  Object.assign(g.diver, { x, y: WORLD.surfaceY + SHIP_DRAFT + 8, vx: 0, vy: 10 });
  events.push({ type: 'dove' });
}
