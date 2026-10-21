// The water's colour filter at a depth (views/waterFilter.ts multiplies everything under the waves by it): almost white
// just under the surface, bluer and darker deeper, browner and darker in murky water. Pure logic, numbers in
// data/diver.ts SEA.filter.
import { SEA } from '../data/diver';
import { rampColor } from './math';

const F = SEA.filter;

/** The multiply colour at world y (0 … 255 each), murk 0 … 1. */
export function filterColor(y: number, murk = 0): [number, number, number] {
  const c = rampColor(F.byY, y);
  if (murk <= 0) return c;
  const k = Math.min(1, murk) * F.murkShare;
  return [0, 1, 2].map((i) => c[i]! + (F.murk[i]! - c[i]!) * k) as [number, number, number];
}
