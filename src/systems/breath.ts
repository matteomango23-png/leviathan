// Breath and pressure (owner's decisions of 4 ottobre 2026). Deeper than your suit or your submarine allows, a
// pressure bar empties (not the air); empty, it hurts you or the hull until you go back up, also while riding.
// Riding a whale you breathe its air: a bigger tank than yours, but it too has to come up; away from you it breathes
// again. Sprinting costs air (diver.ts). Numbers in data/diver.ts (PRESSURE) and data/beasts.ts (RIDE_AIR).
import { RIDE_AIR } from '../data/beasts';
import { PRESSURE } from '../data/diver';

export interface PressureState {
  /** 1 = safe … 0 = crushing. */
  pressure: number;
  /** Seconds before the empty bar hurts again. */
  pressureHurt: number;
}

export const freshPressure = (): PressureState => ({ pressure: 1, pressureHurt: 0 });

/**
 * One step of the pressure bar. `overM`: metres beyond the limit (0 or less: within it, the bar fills back).
 * Returns true when the empty bar hurts right now (a heart, or the hull).
 */
export function stepPressure(p: PressureState, overM: number, dt: number): boolean {
  if (overM <= 0) {
    p.pressure = Math.min(1, p.pressure + PRESSURE.refillPerSec * dt);
    p.pressureHurt = 0;
    return false;
  }
  p.pressure = Math.max(0, p.pressure - (PRESSURE.drainPerSec + overM * PRESSURE.drainPerMetre) * dt);
  if (p.pressure > 0) return false;
  p.pressureHurt -= dt;
  if (p.pressureHurt > 0) return false;
  p.pressureHurt = PRESSURE.hurtEvery;
  return true;
}

/** An air supply other than your lungs: the whale you ride. */
export interface AirTank {
  o2: number;
  max: number;
  /** Already told you it ran out (until it breathes again). */
  warned?: boolean;
}

/** × your air that this species lends you while you ride it (0: none, you breathe your own). */
export const rideAirMult = (speciesId: string): number => RIDE_AIR.bySpecies[speciesId] ?? 0;

/** The whale you ride has just run out of air: say so once (you are back on your own air). */
export function tankRanOut(t: AirTank | undefined): boolean {
  if (!t) return false;
  if (t.o2 > t.max * 0.2) t.warned = false;
  if (t.o2 > 0 || t.warned) return false;
  t.warned = true;
  return true;
}

/** Whales you are not riding breathe again, little by little. */
export function refillTanks(tanks: Record<string, AirTank>, ridden: AirTank | undefined, dt: number): void {
  for (const t of Object.values(tanks))
    if (t !== ridden) t.o2 = Math.min(t.max, t.o2 + t.max * RIDE_AIR.refillAwayPerSec * dt);
}
