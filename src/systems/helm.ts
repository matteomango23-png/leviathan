// The levers of the ship and the submarine (owner, 4 ottobre 2026: no joystick in a vehicle). The throttle stays
// where you leave it; the direction lever points the way to go (west or east): the other way, the vehicle slows
// down and turns round once slow enough; the dive lever (submarine only) sinks or lifts it. Numbers in data/ship.ts.
import { HELM } from '../data/ship';

export interface HelmState {
  /** 0 … 1, stays where you leave it. */
  throttle: number;
  /** The way to go: east (1) or west (−1). */
  dir: 1 | -1;
  /** −1 (up) … 1 (down), the submarine only. */
  dive: number;
}

export const freshHelm = (dir: 1 | -1 = 1): HelmState => ({ throttle: 0, dir, dive: 0 });

/** The dive lever near the middle snaps to it (no slow drift up or down). */
export const diveOf = (v: number): number =>
  Math.abs(v) < HELM.diveDeadzone ? 0 : Math.max(-1, Math.min(1, v));

/** Speed shown on the instruments, in knots. */
export const knotsOf = (unitsPerSec: number): number => Math.abs(unitsPerSec) * HELM.knotsPerUnit;

/**
 * One step of a vehicle's speed along its heading. `face` is where it points, `speed` ≥ 0 how fast it goes that
 * way. Returns the new face and speed: the lever the other way brakes, and slower than `turnBelow` it turns round.
 */
export function stepHeading(
  face: 1 | -1,
  speed: number,
  helm: HelmState,
  top: number,
  rates: { accel: number; coast: number; brake: number; turnBelow: number },
  dt: number,
): { face: 1 | -1; speed: number } {
  if (helm.dir !== face) {
    if (speed < rates.turnBelow) return { face: helm.dir, speed };
    return { face, speed: Math.max(0, speed - rates.brake * dt) };
  }
  const target = Math.max(0, Math.min(1, helm.throttle)) * top;
  if (speed < target) return { face, speed: Math.min(target, speed + rates.accel * dt) };
  return { face, speed: Math.max(target, speed - rates.coast * dt) };
}
