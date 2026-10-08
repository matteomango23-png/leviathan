// The speedboat's (or jet ski's) hatch (owner, 8 ottobre 2026, block 4b): the ship still and that hatch open, you
// climb in and it slides down its ramp onto the water; back in front of the open hatch, "Aggancia" takes it up the
// ramp, you back at the helm, its drums poured into the ship and its tank filled from it. Pure logic.
import { BOAT, BOAT_TEXT } from '../../data/boats';
import { boatModel, type BoatState } from '../boat';
import type { GameEvent } from '../events';
import { boatPath, boatPoint, helmPoint } from './geometry';
import { boatBay, shipModel, shipTank } from './model';
import { hatchT, type ShipState } from './ship';
import { SHIP } from '../../data/ship';

export interface BoatBayWorld {
  ship: ShipState;
  boat: BoatState;
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 };
}

/** The name of the boat of this ship ("Il motoscafo", "La moto d'acqua"). */
export function boatName(s: ShipState): string {
  const bay = shipModel(s).bays[boatBay(s)];
  return bay?.kind === 'jetski' ? 'La moto d’acqua' : 'Il motoscafo';
}

/** The boat is on its ramp: its hatch must not move, and nothing else moves you. */
export const boatOnRamp = (g: BoatBayWorld): boolean =>
  g.boat.bay === 'launching' || g.boat.bay === 'docking';

/** "Cala il motoscafo" shows at the helm with its hatch open and the boat in the hold. */
export const boatLaunchShown = (g: BoatBayWorld): boolean =>
  g.ship.aboard && g.boat.owned && g.boat.bay === 'docked' && hatchT(g.ship, boatBay(g.ship)) === 1;

export function launchBoat(g: BoatBayWorld, events: GameEvent[]): void {
  if (!boatLaunchShown(g) || g.ship.speed >= SHIP.stillBelow) return;
  const b = g.boat;
  g.ship.aboard = false;
  b.aboard = true;
  b.bay = 'launching';
  b.bayT = 0;
  b.face = g.ship.face;
  b.speed = 0;
  events.push({ type: 'boatLaunching' });
}

/** In the boat, slow, in front of its open hatch: "Aggancia". */
export function canDockBoat(g: BoatBayWorld): boolean {
  const b = g.boat;
  const bay = boatBay(g.ship);
  if (!b.aboard || b.bay !== 'out' || hatchT(g.ship, bay) < 1 || b.speed >= BOAT.stillBelow) return false;
  return Math.abs(b.x - boatPoint(g.ship, bay).x) < BOAT.dockReach;
}

export function startDockBoat(g: BoatBayWorld, events: GameEvent[]): void {
  if (!canDockBoat(g)) return;
  const b = g.boat;
  b.bay = 'docking';
  b.bayT = 1;
  b.dockFromX = b.x;
  b.speed = 0;
  b.face = g.ship.face;
  events.push({ type: 'boatDocking' });
}

/** Back in the hold: the drums into the ship (as far as it has room), then the boat's tank from the ship. */
export function pourDrums(g: BoatBayWorld): { poured: number; filled: number } {
  const b = g.boat;
  const s = g.ship;
  const poured = Math.max(0, Math.min(b.drums, shipTank(s) - s.fuel));
  b.drums -= poured;
  s.fuel += poured;
  const filled = Math.max(0, Math.min(boatModel(b.model).tank - b.fuel, s.fuel));
  s.fuel -= filled;
  b.fuel += filled;
  return { poured, filled };
}

/**
 * The boat on its ramp (moved here) or waiting in the hold. Returns true while it is on the ramp: then you are in
 * it and nothing else moves you.
 */
export function stepBoatBay(g: BoatBayWorld, dt: number, events: GameEvent[]): boolean {
  const s = g.ship;
  const b = g.boat;
  if (!s.owned || !b.owned) return false;
  const bay = boatBay(s);
  if (b.bay === 'docked') {
    Object.assign(b, boatPath(s, 0, bay), { speed: 0, face: s.face, prop: 0 });
    return false;
  }
  if (b.bay !== 'launching' && b.bay !== 'docking') return false;
  b.bayT += ((b.bay === 'launching' ? 1 : -1) * dt) / BOAT.launchSeconds;
  const done = b.bay === 'launching' ? b.bayT >= 1 : b.bayT <= 0;
  b.bayT = Math.max(0, Math.min(1, b.bayT));
  const p = boatPath(s, b.bayT, bay);
  // docking, it glides from where it stopped to the foot of the ramp on the way up
  const off = b.bay === 'docking' ? (b.dockFromX - boatPoint(s, bay).x) * b.bayT * b.bayT : 0;
  Object.assign(b, { x: p.x + off, y: p.y, speed: 0, face: s.face });
  Object.assign(g.diver, { x: b.x, y: b.y - 4, vx: 0, vy: 0, face: s.face });
  if (!done) return true;
  if (b.bay === 'launching') {
    b.bay = 'out';
    events.push({ type: 'boatLaunched', text: BOAT_TEXT.launched(boatName(s)) });
    return false;
  }
  // back in the hold: you climb up to the helm
  b.bay = 'docked';
  b.aboard = false;
  b.engineOn = false;
  s.aboard = true;
  Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
  const { poured, filled } = pourDrums(g);
  events.push({ type: 'boatDocked', text: BOAT_TEXT.docked(boatName(s), poured, filled) });
  return false;
}

/** After losing your senses, or a rescue: the crew brings the boat back to its hold. */
export function boatHome(b: BoatState): void {
  if (!b.owned) return;
  Object.assign(b, { bay: 'docked', bayT: 0, aboard: false, speed: 0, engineOn: false, prop: 0 });
}
