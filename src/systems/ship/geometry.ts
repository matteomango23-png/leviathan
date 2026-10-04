// Where the parts of the ship are in the world (data/ship.ts: SHIP.picture). The picture is drawn with its
// waterline on the sea surface; facing west it is mirrored. Pure functions; the view uses the same ones.
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { HullPart } from '../hull';

export interface ShipPose {
  x: number;
  face: 1 | -1;
}

const P = SHIP.picture;
/** Height of the picture in world units. */
export const SHIP_HEIGHT = SHIP.length * P.aspect;
/** World y of the top of the picture (its waterline on the surface). */
export const SHIP_TOP = WORLD.surfaceY - P.waterline * SHIP_HEIGHT;
/** Depth of the keel under the surface (units). */
export const SHIP_DRAFT = (P.keel - P.waterline) * SHIP_HEIGHT;

/** A point of the picture (shares from its stern-left / top) in the world. */
export function shipPoint(s: ShipPose, u: number, v: number): { x: number; y: number } {
  return { x: s.x + s.face * (u - 0.5) * SHIP.length, y: SHIP_TOP + v * SHIP_HEIGHT };
}

/** From stern to bow, in world x. */
export function shipSpan(s: ShipPose): { x0: number; x1: number } {
  return { x0: s.x - SHIP.length / 2, x1: s.x + SHIP.length / 2 };
}

/** Inside the hold, behind the hatch: where the docked submarine waits. */
export const holdPoint = (s: ShipPose): { x: number; y: number } => shipPoint(s, P.hatchX, P.hatchY);

/** The foot of the open ramp. */
export const rampFoot = (s: ShipPose): { x: number; y: number } => shipPoint(s, P.hatchX, P.rampEnd);

/** Mid-water under the hatch: where the submarine stops after the ramp, and where it docks again. */
export const dockPoint = (s: ShipPose): { x: number; y: number } => ({
  x: shipPoint(s, P.hatchX, 0).x,
  y: WORLD.surfaceY + SHIP.launchDepth,
});

/** At the helm: the wheelhouse. */
export const helmPoint = (s: ShipPose): { x: number; y: number } => shipPoint(s, P.helmX, P.deckY);

/** The hull under water, as circles (for pushOutOfHull): narrower towards the bow and the stern. */
export function shipHull(s: ShipPose): HullPart[] {
  const parts: HullPart[] = [];
  const r = SHIP_DRAFT / 2;
  for (let k = 0; k < 9; k++) {
    const u = 0.1 + (k / 8) * 0.8;
    const taper = k === 0 || k === 8 ? 0.7 : 1;
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
