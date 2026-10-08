// Where the camera looks and how much sea it shows: at the helm the ship's wide view (centred on the ship, looking
// ahead as fast as it goes), otherwise the swimming one on you (or your submarine). Owner, 5 ottobre 2026: any
// glide between the two made the ship slide sideways, so the scene cuts from one to the other behind a short fade
// (WorldScene, views/cameraRig.ts). Pure logic.
import { CAMERA } from '../data/diver';
import { SHIP } from '../data/ship';
import type { ShipState } from './ship/ship';
import { shipLength, shipTopSpeed } from './ship/model';

export interface CameraAim {
  x: number;
  y: number;
  /** World units of sea shown from top to bottom, and how far above the surface it may go. */
  viewH: number;
  minY: number;
}

interface AimWorld {
  ship: ShipState;
  diver: { x: number; y: number; face: 1 | -1 };
}

/** Which view: the helm's or the swimming one (a change cuts, behind a fade). */
export const atHelmView = (g: AimWorld): boolean => g.ship.aboard;

/** The camera's aim; `ahead` is how far the swimming view looks where you face. */
export function cameraAim(g: AimWorld, ahead: number): CameraAim {
  const s = g.ship;
  if (atHelmView(g)) {
    const C = SHIP.camera;
    // a bigger ship, a wider view, but less than the ship grows: on screen it looks bigger (owner, 8 ottobre)
    const k = Math.min(C.maxScale, Math.max(1, (shipLength(s) / C.refLength) ** C.growth));
    return {
      x: s.x + s.face * C.lookAhead * k * (s.speed / shipTopSpeed(s)),
      y: C.y * k,
      viewH: C.viewHeightUnits * k,
      minY: C.minY * k,
    };
  }
  const d = g.diver;
  return { x: d.x + d.face * ahead, y: d.y, viewH: CAMERA.viewHeightUnits, minY: CAMERA.minY };
}
