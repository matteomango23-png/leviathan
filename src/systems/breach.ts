// A beast you ride leaps out of the water (owner, 16 ottobre 2026: "tipo Angry Shark"): racing up to the surface it
// does not stop under it but flies out, arcs through the air with no steering and falls back with a splash
// (data/beasts.ts RIDE_BREACH). In the air it can snap up a gull (birds.ts eatBirdsNear). Pure logic.
import { RIDE_BREACH } from '../data/beasts';
import { DIVER } from '../data/diver';
import type { GameEvent } from './events';

export interface BreachBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Out of the water on its leap (not saved). */
  airborne?: boolean;
}

/** The line a ridden beast swims under: its rider a body length below the surface. */
export const rideTop = (surfaceY: number): number => surfaceY + DIVER.lengthUnits;

/**
 * At the surface going up: fast enough (RIDE_BREACH.minUpShare of the beast's speed) it leaps. True if it did.
 * @param mountSpeed the beast's own speed (units/s), without the sprint
 */
export function tryBreach(d: BreachBody, surfaceY: number, mountSpeed: number, events: GameEvent[]): boolean {
  const up = -d.vy;
  if (up < mountSpeed * RIDE_BREACH.minUpShare) return false;
  d.airborne = true;
  d.y = rideTop(surfaceY);
  d.vy = -Math.min(RIDE_BREACH.maxUpSpeed, up * RIDE_BREACH.boost);
  events.push({ type: 'breach', x: d.x, y: surfaceY });
  return true;
}

/** One step in the air: it flies on, falls, and splashes back into the water. */
export function stepAirborne(d: BreachBody, surfaceY: number, dt: number, events: GameEvent[]): void {
  d.vy += RIDE_BREACH.gravity * dt;
  d.x += d.vx * dt;
  d.y += d.vy * dt;
  if (d.vy > 0 && d.y >= rideTop(surfaceY)) {
    events.push({ type: 'breachSplash', x: d.x, y: surfaceY, speed: Math.hypot(d.vx, d.vy) });
    d.airborne = false;
    d.vx *= RIDE_BREACH.landSlow;
    d.vy *= RIDE_BREACH.landSlow;
  }
}
