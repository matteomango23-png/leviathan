// Off the speedboat or jet ski into the sea, and back on (owner, 9 ottobre 2026): still, "Tuffati" puts you in the
// water by it and it waits there; swimming by it, "A bordo" puts you back at its wheel. Pure logic.
import { BOAT } from '../data/boats';
import { WORLD } from '../data/worldLayout';
import { boatLength, type BoatState } from './boat';
import type { GameEvent } from './events';

interface CrewWorld {
  boat: BoatState;
  ship: { aboard: boolean };
  sub: { aboard: boolean };
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1; dead: boolean };
}

/** Driving it, slow enough to dive off. */
export const canDiveFromBoat = (g: CrewWorld): boolean =>
  g.boat.aboard && g.boat.bay === 'out' && g.boat.speed < BOAT.stillBelow;

export function diveFromBoat(g: CrewWorld, events: GameEvent[]): void {
  if (!canDiveFromBoat(g)) return;
  const b = g.boat;
  b.aboard = false;
  b.speed = 0;
  Object.assign(g.diver, {
    x: b.x - b.face * boatLength(b) * 0.2,
    y: WORLD.surfaceY + BOAT.diveDepth,
    vx: 0,
    vy: 10,
  });
  events.push({ type: 'boatLeft' });
}

/** Swimming by it, near the surface: "A bordo". */
export function canBoardBoat(g: CrewWorld): boolean {
  const b = g.boat;
  const d = g.diver;
  if (!b.owned || b.aboard || b.bay !== 'out' || g.ship.aboard || g.sub.aboard || d.dead) return false;
  return Math.abs(d.x - b.x) < boatLength(b) / 2 + BOAT.boardReach && d.y < WORLD.surfaceY + BOAT.boardReach;
}

export function boardBoat(g: CrewWorld, events: GameEvent[]): void {
  if (!canBoardBoat(g)) return;
  g.boat.aboard = true;
  Object.assign(g.diver, { x: g.boat.x, y: g.boat.y - 4, vx: 0, vy: 0 });
  events.push({ type: 'boatBoarded' });
}
