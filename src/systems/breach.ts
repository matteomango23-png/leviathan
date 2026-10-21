// The surface for a beast you ride, like real water (owner, 16 and 19 ottobre 2026: "tipo Angry Shark", then "deve
// sembrare più naturale, come se fosse acqua vera", no wall under the surface). Between its swimming line (a body
// below the surface) and the surface the water pulls it back down like a spring and slows it, and your push up fades
// as it comes out: held up it rides with its back just out of the water. Coming up with enough speed it leaves the
// water: slowly a ripple, at its pace a little hop, sprinting a jump, with a dash the big leap. In the air no
// steering: it falls back and the water slows it. Numbers in data/beasts.ts RIDE_BREACH. Pure logic.
import { RIDE_BREACH } from '../data/beasts';
import { DIVER } from '../data/diver';
import type { GameEvent } from './events';

interface BreachBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Out of the water on its leap (not saved). */
  airborne?: boolean;
}

/** The line a ridden beast swims at: its rider a body length below the surface. */
export const rideTop = (surfaceY: number): number => surfaceY + DIVER.lengthUnits;

/** How much of your push up is left near the surface: all of it at the swimming line, RIDE_BREACH.pushAtSurface of
 *  it at the surface. */
export function upPushShare(y: number, surfaceY: number): number {
  const under = Math.max(0, Math.min(1, (y - surfaceY) / (rideTop(surfaceY) - surfaceY)));
  return RIDE_BREACH.pushAtSurface + (1 - RIDE_BREACH.pushAtSurface) * under;
}

/** In the water between its swimming line and the surface: pulled back down and slowed (before it moves). */
export function surfaceWater(d: BreachBody, surfaceY: number, dt: number): void {
  const out = rideTop(surfaceY) - d.y;
  if (out <= 0) return;
  d.vy += RIDE_BREACH.spring * out * dt;
  d.vy -= d.vy * Math.min(1, RIDE_BREACH.surfaceDrag * dt);
}

/** After it moved: past the surface going up, it is out of the water: as high and as far as its speed takes it.
 *  @param leap × the highest leap: a giant thrown out flies higher than a dolphin (rideMotion.ts) */
export function leaveWater(d: BreachBody, surfaceY: number, events: GameEvent[], leap = 1): void {
  if (d.y >= surfaceY || d.vy >= 0) return;
  d.airborne = true;
  d.vy = Math.max(d.vy, -RIDE_BREACH.maxLeapSpeed * leap); // even the strongest dash leaps only so high
  if (-d.vy >= RIDE_BREACH.sprayFrom) events.push({ type: 'breach', x: d.x, y: surfaceY });
}

/** One step in the air: it flies on and falls; back in the water the surface's spring and drag take it. */
export function stepAirborne(d: BreachBody, surfaceY: number, dt: number, events: GameEvent[]): void {
  d.vy += RIDE_BREACH.gravity * dt;
  d.x += d.vx * dt;
  d.y += d.vy * dt;
  if (d.vy > 0 && d.y >= surfaceY) {
    d.airborne = false;
    const speed = Math.hypot(d.vx, d.vy);
    if (speed >= RIDE_BREACH.sprayFrom) events.push({ type: 'breachSplash', x: d.x, y: surfaceY, speed });
  }
}
