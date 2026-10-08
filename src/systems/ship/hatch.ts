// The ship's hatch and the submarine on its ramp (owner, 4 ottobre 2026): stopped, the hatch opens; the submarine,
// you inside, slides down the ramp to mid-water under the ship; it docks again only in front of the hatch, and
// goes back up the same way to the hold, you back at the helm. You climb aboard from the water by the hull, and dive
// off it. Pure logic; ship.ts moves the ship.
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { repairSub, restAboard, type SubWorld } from '../submarine';
import { bayPath, dockPoint, helmPoint, holdPoint, shipDraft, shipSpan } from './geometry';
import { subBay } from './model';
import { hatchCanMove, hatchT, type ShipState } from './ship';

export interface HatchWorld extends SubWorld {
  ship: ShipState;
}

/**
 * A hatch button at the helm: opens or closes that hatch (only with the ship still, nothing on its ramps).
 * `busy`: the boat is on its ramp (systems/boat.ts).
 */
export function toggleHatch(g: HatchWorld, bay: number, events: GameEvent[], busy = false): void {
  const s = g.ship;
  const h = s.hatches[bay];
  if (!s.aboard || !h) return;
  if (!hatchCanMove(s) || busy) {
    events.push({ type: 'shipHint', text: 'hatchMoving' });
    return;
  }
  h.open = !h.open;
  events.push({ type: 'hatchMoved', open: h.open });
}

/** Can the submarine go down the ramp now? */
export const canLaunch = (g: HatchWorld): boolean =>
  g.ship.aboard && hatchT(g.ship, subBay(g.ship)) === 1 && g.ship.bay === 'docked' && g.sub.hull > 0;

/** The button shows with the hatch open and the submarine in the hold, broken too (pressed, it says how to mend it). */
export const launchShown = (g: HatchWorld): boolean =>
  g.ship.aboard && hatchT(g.ship, subBay(g.ship)) === 1 && g.ship.bay === 'docked';

/** "Cala il sottomarino": you climb in and it slides down the ramp. */
export function launchSub(g: HatchWorld, events: GameEvent[]): void {
  // still broken in the hold (no teeth when it came back): it is mended now if you have them
  if (g.ship.aboard && g.ship.bay === 'docked' && g.sub.hull <= 0) repairSub(g, events);
  if (g.ship.aboard && g.ship.bay === 'docked' && g.sub.hull <= 0) {
    events.push({ type: 'shipHint', text: 'subBroken' }); // owner, 8 ottobre: nothing said how to mend it
    return;
  }
  if (!canLaunch(g)) return;
  g.ship.aboard = false;
  g.ship.bay = 'launching';
  g.ship.bayT = 0;
  g.sub.aboard = true;
  g.sub.face = g.ship.face;
  events.push({ type: 'subLaunching' });
}

/** In the submarine, in front of the open hatch (anywhere from under the ramp up to the hatch): "Aggancia". */
export function canDock(g: HatchWorld): boolean {
  const s = g.ship;
  if (!g.sub.aboard || s.bay !== 'out' || hatchT(s, subBay(s)) < 1) return false;
  const p = dockPoint(s);
  const top = holdPoint(s).y;
  return Math.abs(g.sub.x - p.x) < SHIP.dockReach && g.sub.y > top - 10 && g.sub.y < p.y + SHIP.dockReach;
}

export function startDock(g: HatchWorld, events: GameEvent[]): void {
  if (!canDock(g)) return;
  const s = g.ship;
  s.bay = 'docking';
  // it glides to the nearest point of the ramp, then goes up from there
  let at = 1;
  let best = Infinity;
  for (let i = 0; i <= 40; i++) {
    const p = bayPath(s, i / 40);
    const d = Math.hypot(p.x - g.sub.x, p.y - g.sub.y);
    if (d < best) [best, at] = [d, i / 40];
  }
  s.bayT = at;
  s.dockFrom = { x: g.sub.x, y: g.sub.y, t: 0, at };
  Object.assign(g.sub, { vx: 0, vy: 0, face: s.face });
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
  const from = s.bay === 'docking' ? s.dockFrom : null;
  if (from) {
    const to = bayPath(s, from.at);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    from.t = Math.min(1, from.t + (dt * SHIP.dockGlide) / Math.max(1, dist));
    const e = from.t * from.t * (3 - 2 * from.t);
    Object.assign(sub, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, vx: 0, vy: 0 });
    Object.assign(g.diver, { x: sub.x, y: sub.y, vx: 0, vy: 0, face: s.face });
    if (from.t >= 1) s.dockFrom = null;
    return true;
  }
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
  repairSub(g, events); // the crew mends the hull, for teeth, like a port
  events.push({ type: 'subDocked' });
  return false;
}

/** In the water by the hull (at or near the surface): "A bordo". */
export function canBoardShip(g: HatchWorld & { diver: { dead: boolean } }): boolean {
  const s = g.ship;
  const d = g.diver;
  if (!s.owned || s.aboard || g.sub.aboard || d.dead) return false;
  const { x0, x1 } = shipSpan(s);
  const r = SHIP.boardReach;
  return d.x > x0 - r && d.x < x1 + r && d.y < WORLD.surfaceY + shipDraft(g.ship) + r;
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
  if (s.speed >= SHIP.stillBelow) {
    events.push({ type: 'shipHint', text: 'stopToDive' });
    return;
  }
  s.aboard = false;
  const x = helmPoint(s).x;
  Object.assign(g.diver, { x, y: WORLD.surfaceY + shipDraft(g.ship) + 8, vx: 0, vy: 10 });
  events.push({ type: 'dove' });
}
