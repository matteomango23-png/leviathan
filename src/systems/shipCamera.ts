// Where the camera looks and how much sea it shows: at the helm the ship's wide view (centred on the ship, looking
// ahead as fast as it goes), otherwise the swimming one on you (or your submarine). Owner, 5 ottobre 2026: any
// glide between the two made the ship slide sideways, so the scene cuts from one to the other behind a short fade
// (WorldScene, views/cameraRig.ts). Pure logic.
import { CAMERA } from '../data/diver';
import { SHIP } from '../data/ship';
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
  diver: { x: number; y: number; face: 1 | -1 };
}

/** Which view: the helm's or the swimming one (a change cuts, behind a fade). */
export const atHelmView = (g: AimWorld): boolean => g.ship.aboard;

/** The camera's aim; `ahead` is how far the swimming view looks where you face. */
export function cameraAim(g: AimWorld, ahead: number): CameraAim {
  const s = g.ship;
  if (atHelmView(g)) {
    const C = SHIP.camera;
    return {
      x: s.x + s.face * C.lookAhead * (s.speed / SHIP.maxSpeed),
      y: C.y,
      viewH: C.viewHeightUnits,
      minY: C.minY,
    };
  }
  const d = g.diver;
  return { x: d.x + d.face * ahead, y: d.y, viewH: CAMERA.viewHeightUnits, minY: CAMERA.minY };
}
