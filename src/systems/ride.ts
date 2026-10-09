// How a hull rides the waves (owner, 9 ottobre 2026: "non è un binario"; his clips of a boat thrown up a wave and of
// a tanker burying its bow). A body with weight floating on two points, its bow and its stern. Under the surface the
// water pushes a point up (the deeper, the harder) and brakes it against the water's own motion, which includes
// the hull running into the wave; out of it only gravity pulls. So fast into a steep wave the bow is thrown up and a
// light boat flies, lands stern first, slams its nose under and bobs back; too steep and it flips over (then it
// shows see-through for a moment and is set upright where it is, like in the old racing games). A heavy ship is
// lifted and dropped slowly and buries its bow in the crests, throwing spray. Pure logic: the views draw its heave
// and pitch (data/sea.ts SEA_STATE.ride).
import { SEA_STATE } from '../data/sea';
import { seaHeight, type SeaWeather } from './sea';
import type { WaterColumns } from './waterColumns';

const R = SEA_STATE.ride;

export interface RideState {
  /** Heave above the resting line (units, up > 0) and its speed. */
  h: number;
  vh: number;
  /** Pitch (radians, bow up > 0) and its speed. */
  p: number;
  vp: number;
  /** The sea's height under the bow and the stern a moment ago (its speed there); NaN: not yet. */
  bow: number;
  stern: number;
  /** How deep the bow is buried in the water now (units): spray. */
  plunge: number;
  /** Flipped over: seconds before it is set upright again (0: not). */
  flipped: number;
}

export const newRide = (): RideState => ({
  h: 0,
  vh: 0,
  p: 0,
  vp: 0,
  bow: NaN,
  stern: NaN,
  plunge: 0,
  flipped: 0,
});

/** 0 (a jet ski) … 1 (a 90 m ship): how heavy and long. */
const size = (length: number): number =>
  Math.max(0, Math.min(1, (length - R.small.length) / (R.big.length - R.small.length)));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Out of the water (or in its hold), back to rest. */
export function settleRide(r: RideState): void {
  Object.assign(r, newRide());
}

/**
 * One step on the waves at x, facing `face`, this long (units), at time t. Returns true the moment it flips over
 * (only the light ones can).
 */
export function stepRide(
  r: RideState,
  x: number,
  face: 1 | -1,
  length: number,
  sea: SeaWeather,
  t: number,
  dt: number,
  water?: WaterColumns | null,
): boolean {
  if (dt <= 0) return false;
  if (r.flipped > 0) {
    // see-through for a moment, then upright where it is (its damage stays: the boat's caller)
    r.flipped = Math.max(0, r.flipped - dt);
    if (r.flipped === 0) settleRide(r);
    return false;
  }
  const z = size(length);
  const k = mix(R.small.k, R.big.k, z);
  const c = mix(R.small.c, R.big.c, z);
  const pitchMax = mix(R.small.pitchMax, R.big.pitchMax, z);
  const g = R.gravity;
  const rest = g / k; // how deep each point sits when still
  const off = length * R.pointsAt;
  const steps = Math.max(1, Math.ceil(dt / R.maxStep));
  const h = dt / steps;
  let flipped = false;
  for (let i = 0; i < steps; i++) {
    const tt = t - dt + (i + 1) * h;
    const cos = Math.cos(r.p);
    const sin = Math.sin(r.p);
    const sb = seaHeight(x + face * off * cos, tt, sea, water);
    const ss = seaHeight(x - face * off * cos, tt, sea, water);
    // the water's vertical speed under each end, as the hull sees it (it runs into the wave)
    const vsb = Number.isNaN(r.bow) ? 0 : (sb - r.bow) / h;
    const vss = Number.isNaN(r.stern) ? 0 : (ss - r.stern) / h;
    r.bow = sb;
    r.stern = ss;
    const yb = r.h + off * sin;
    const ys = r.h - off * sin;
    const force = (surface: number, vSurface: number, y: number, v: number): number => {
      const under = surface - y + rest;
      if (under <= 0) return 0;
      const vs = Math.max(-R.maxV, Math.min(R.maxV, vSurface));
      return k * Math.min(under, R.maxUnder * rest) - c * (v - vs);
    };
    const fb = force(sb, vsb, yb, r.vh + off * cos * r.vp);
    const fs = force(ss, vss, ys, r.vh - off * cos * r.vp);
    r.plunge = Math.max(0, sb - yb - rest);
    r.vh += ((fb + fs) / 2 - g) * h;
    r.vp += ((fb - fs) * R.pitchGain * h) / Math.max(1, length);
    r.vh = Math.max(-R.maxV, Math.min(R.maxV, r.vh));
    r.h += r.vh * h;
    r.p += r.vp * h;
    if (Math.abs(r.p) > pitchMax) {
      if (pitchMax >= R.flipAt) {
        flipped = true;
        r.flipped = R.flipSeconds;
        break;
      }
      // a heavy ship cannot go further: it stops there
      r.p = Math.sign(r.p) * pitchMax;
      r.vp *= -0.2;
    }
  }
  return flipped;
}

/** Flying: clear of the water under both its ends. */
export const airborne = (r: RideState): boolean => !Number.isNaN(r.bow) && r.h > Math.max(r.bow, r.stern) + 2;
