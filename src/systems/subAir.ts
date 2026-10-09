// The submarine's air (owner, 9 ottobre 2026): each model has its seconds under water (the bigger, the more). It goes
// down under water and fills again at the surface or in the ship's hold; 30 seconds before the end a warning, at zero
// it rises by itself (the dive lever cannot keep it down; ahead and back still work). Pure logic: stepSub calls it.
import { SUBMARINE } from '../data/submarine';
import type { GameEvent } from './events';

interface AirSub {
  y: number;
  vy: number;
  air: number;
}

/** Under water (deeper than its resting line). */
export const subUnder = (s: { y: number }): boolean => s.y > SUBMARINE.restY + SUBMARINE.air.underBelow;

/**
 * One step aboard: the air goes down under water and up at the surface; the warning; at zero it rises (its vertical
 * speed set here, after the levers).
 */
export function stepSubAir(s: AirSub, max: number, dt: number, events: GameEvent[]): void {
  const A = SUBMARINE.air;
  const was = s.air;
  if (subUnder(s)) s.air = Math.max(0, s.air - dt);
  else s.air = Math.min(max, s.air + A.refill * dt);
  if (subUnder(s)) {
    if (was > A.warnAt && s.air <= A.warnAt) events.push({ type: 'subAir' });
    if (was > 0 && s.air <= 0) events.push({ type: 'subSurfacing' });
  }
  if (s.air <= 0 && subUnder(s)) s.vy = Math.min(s.vy, -A.rise);
}

/** Not aboard (waiting, or in the hold): it breathes at the surface or with the ship. */
export function restSubAir(s: AirSub, max: number, inHold: boolean, dt: number): void {
  if (inHold || !subUnder(s)) s.air = Math.min(max, s.air + SUBMARINE.air.refill * dt);
}
