// Where the camera looks and how much sea it shows (owner, 5 ottobre 2026: "the ship still slides when I get on or
// off"). It no longer depends on being aboard: near the ship the view is the helm's (centred on the ship, wide),
// far from it the swimming one, and in between it changes smoothly with the distance. Getting on or off, going
// down or up the ramp, docking: you are near the ship before and after, so nothing moves. Pure logic.
import { CAMERA } from '../data/diver';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { shipSpan } from './ship/geometry';
import type { ShipState } from './ship/ship';

export interface CameraAim {
  x: number;
  y: number;
  /** World units of sea shown from top to bottom, and how far above the surface it may go. */
  viewH: number;
  minY: number;
}

interface AimWorld {
  ship: ShipState;
  sub: { aboard: boolean; x: number; y: number };
  diver: { x: number; y: number; face: 1 | -1 };
}

const smooth = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** How much of the helm's view there is (1 near the ship … 0 away from it). */
export function helmShare(g: AimWorld): number {
  const s = g.ship;
  if (!s.owned) return 0;
  if (s.aboard || s.bay === 'launching' || s.bay === 'docking') return 1;
  const C = SHIP.camera;
  const who = g.sub.aboard ? g.sub : g.diver;
  const { x0, x1 } = shipSpan(s);
  const side = Math.max(0, x0 - who.x, who.x - x1);
  const depth = Math.max(0, who.y - WORLD.surfaceY);
  const kx = 1 - smooth((side - C.near.x) / C.fade.x);
  const ky = 1 - smooth((depth - C.near.y) / C.fade.y);
  return kx * ky;
}

/** The camera's aim: the swimming view (looking ahead, `ahead` units) mixed with the helm's by helmShare. */
export function cameraAim(g: AimWorld, ahead: number): CameraAim {
  const d = g.diver;
  const swim: CameraAim = {
    x: d.x + d.face * ahead,
    y: d.y,
    viewH: CAMERA.viewHeightUnits,
    minY: CAMERA.minY,
  };
  const k = helmShare(g);
  if (k <= 0) return swim;
  const s = g.ship;
  const C = SHIP.camera;
  const helm: CameraAim = {
    // looking ahead only as fast as it goes
    x: s.x + s.face * C.lookAhead * (s.speed / SHIP.maxSpeed),
    y: C.y,
    viewH: C.viewHeightUnits,
    minY: C.minY,
  };
  const mix = (a: number, b: number): number => a + (b - a) * k;
  return {
    x: mix(swim.x, helm.x),
    y: mix(swim.y, helm.y),
    viewH: mix(swim.viewH, helm.viewH),
    minY: mix(swim.minY, helm.minY),
  };
}
