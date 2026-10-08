// Where the parts of the ship are in the world (its model's picture: data/fleet.ts). The picture is drawn with its
// waterline on the sea surface; facing west it is mirrored. Pure functions; the view uses the same ones.
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { HullPart } from '../hull';
import { shipLength, shipPicture } from './model';

export interface ShipPose {
  x: number;
  face: 1 | -1;
  /** Its model (data/fleet.ts): size and picture. */
  model: string;
}

/** Height of the picture in world units. */
export const shipHeight = (s: { model: string }): number => shipLength(s) * shipPicture(s).aspect;
/** World y of the top of the picture (its waterline on the surface). */
export const shipTop = (s: { model: string }): number =>
  WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s);
/** Depth of the keel under the surface (units). */
export const shipDraft = (s: { model: string }): number =>
  (shipPicture(s).keel - shipPicture(s).waterline) * shipHeight(s);

/** A point of the picture (shares from its stern-left / top) in the world. */
export function shipPoint(s: ShipPose, u: number, v: number): { x: number; y: number } {
  return { x: s.x + s.face * (u - 0.5) * shipLength(s), y: shipTop(s) + v * shipHeight(s) };
}

/** From stern to bow, in world x. */
export function shipSpan(s: ShipPose): { x0: number; x1: number } {
  const half = shipLength(s) / 2;
  return { x0: s.x - half, x1: s.x + half };
}

/** Inside the hold, behind the hatch: where the docked submarine waits. */
export const holdPoint = (s: ShipPose): { x: number; y: number } =>
  shipPoint(s, shipPicture(s).hatchX, shipPicture(s).hatchY);

/** The foot of the open ramp. */
export const rampFoot = (s: ShipPose): { x: number; y: number } =>
  shipPoint(s, shipPicture(s).hatchX, shipPicture(s).rampEnd);

/** Mid-water under the hatch: where the submarine stops after the ramp, and where it docks again. */
export const dockPoint = (s: ShipPose): { x: number; y: number } => ({
  x: shipPoint(s, shipPicture(s).hatchX, 0).x,
  y: WORLD.surfaceY + Math.max(SHIP.launchDepth, shipDraft(s) + 20), // under the keel of a big ship
});

/** At the helm: the wheelhouse. */
export const helmPoint = (s: ShipPose): { x: number; y: number } =>
  shipPoint(s, shipPicture(s).helmX, shipPicture(s).deckY);

/** The hull under water, as circles (for pushOutOfHull): narrower towards the bow and the stern. */
export function shipHull(s: ShipPose): HullPart[] {
  const parts: HullPart[] = [];
  const r = shipDraft(s) / 2;
  const n = Math.max(9, Math.round(shipLength(s) / 20)); // a long ship: more circles along it
  for (let k = 0; k < n; k++) {
    const u = 0.1 + (k / (n - 1)) * 0.8;
    const taper = k === 0 || k === n - 1 ? 0.7 : 1;
    parts.push({ ...shipPoint(s, u, 0), y: WORLD.surfaceY + r, r: r * taper });
  }
  return parts;
}

/**
 * Where the submarine is along the ramp: 0 = in the hold, 1 = at mid-water under the hatch (out along the
 * ramp to its foot, then straight down).
 */
export function bayPath(s: ShipPose, t: number): { x: number; y: number } {
  const a = holdPoint(s);
  const b = rampFoot(s);
  const c = dockPoint(s);
  const k = 0.45;
  if (t <= k) {
    const q = t / k;
    return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q };
  }
  const q = (t - k) / (1 - k);
  const e = q * q * (3 - 2 * q); // eases in and out
  return { x: b.x + (c.x - b.x) * e, y: b.y + (c.y - b.y) * e };
}
