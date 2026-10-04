// How fast the engines burn fuel (fuel.ts has the rest): only while running, more at full throttle. Kept apart so
// the ship and the submarine can use it without importing fuel.ts (which imports them).
import { FUEL } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { clamp } from './math';

const UNITS_PER_KM = 1000 * WORLD.unitsPerMetre;

/** Litres per km at this throttle: going slowly lasts longer. */
export const perKmAt = (perKm: number, throttle: number): number =>
  perKm * (FUEL.idleShare + (1 - FUEL.idleShare) * clamp(throttle, 0, 1));

/** Litres burnt over this distance (world units) at this throttle (0: engine off, nothing burnt). */
export const litresFor = (units: number, throttle: number, perKm: number): number =>
  throttle <= 0 ? 0 : (units / UNITS_PER_KM) * perKmAt(perKm, throttle);

/** How far this fuel takes you at this throttle (km). */
export const autonomyKm = (fuel: number, perKm: number, throttle = 1): number =>
  fuel / perKmAt(perKm, Math.max(0.05, throttle));
