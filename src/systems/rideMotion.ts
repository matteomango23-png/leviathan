// How a beast you ride swims (owner, 21 ottobre 2026): it reaches its own top speed little by little (a small one at
// once, a giant slowly), glides on when you let go, and its dash is a push beyond its top speed that fades back to it
// (a small one sharp and short, a giant softer and longer), with a cooldown. Its numbers come from its length and
// its speed (data/beasts.ts RIDE_MOTION); its stamina is in stamina.ts. Pure logic.
import { RIDE_MOTION } from '../data/beasts';

const M = RIDE_MOTION;

export interface RideProfile {
  /** 0 a small beast … 1 a giant; 0 a slow one … 1 a fast one. */
  size: number;
  fast: number;
  accelSeconds: number;
  glide: number;
  boost: number;
  rise: number;
  decay: number;
  cooldown: number;
  leap: number;
  /** Share of its stamina one dash costs. */
  dashCost: number;
}

const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** @param lengthM how long it is now; @param speedShare its riding speed over the white shark's */
export function rideProfile(lengthM: number, speedShare: number): RideProfile {
  const size = clamp01(Math.log(lengthM / M.sizeM[0]) / Math.log(M.sizeM[1] / M.sizeM[0]));
  const fast = clamp01((speedShare - M.fastFrom) / (M.fastTo - M.fastFrom));
  const s = M.small;
  const b = M.big;
  const dashes = mix(s.dashes, b.dashes, size) * (1 - M.fastTires * fast);
  return {
    size,
    fast,
    accelSeconds: mix(s.accelSeconds, b.accelSeconds, size),
    glide: mix(s.glide, b.glide, size),
    boost: mix(s.boost, b.boost, size),
    rise: mix(s.rise, b.rise, size),
    decay: mix(s.decay, b.decay, size),
    cooldown: mix(s.cooldown, b.cooldown, size),
    leap: mix(s.leap, b.leap, size),
    dashCost: 1 / Math.max(1, dashes),
  };
}

/** How much of its dash push is on, `t` seconds after it began (0 … 1; 0 once it has faded). */
export function dashCurve(t: number, p: RideProfile): number {
  if (!(t >= 0)) return 0;
  if (t < p.rise) return t / p.rise;
  const k = Math.exp(-(t - p.rise) / p.decay);
  return k < 0.02 ? 0 : k;
}

interface Swimmer {
  vx: number;
  vy: number;
  aim: number;
  /** Seconds since its dash began (none: undefined). */
  rideDashT?: number;
}

interface RideNow {
  /** Its top speed now (u/s): its pace, faster held, slower worn out. */
  speed: number;
  profile: RideProfile;
}

/**
 * One step of a ridden beast's swimming: the stick pushes it towards its top speed in `accelSeconds`, its dash
 * pushes it along the way it faces up to `boost` × that, and above its top speed it eases back (never cut at once);
 * with no stick it glides on, slowing down. @param upShare how much of a push up is left near the surface (breach.ts)
 */
export function swimMount(
  d: Swimmer,
  ix: number,
  iy: number,
  ride: RideNow,
  upShare: number,
  dt: number,
): void {
  const p = ride.profile;
  const t = d.rideDashT;
  const push = t === undefined ? 0 : dashCurve(t, p);
  if (t !== undefined) d.rideDashT = push > 0 || t < p.rise ? t + dt : undefined;
  const cap = ride.speed * (1 + (p.boost - 1) * push);
  const accel = ride.speed / p.accelSeconds;
  const stick = Math.hypot(ix, iy);
  if (stick > 0) {
    // the stick: towards its top speed that way (no further: beyond it only the dash), and the sideways drift of a
    // turn fades as it swims round
    const ux = ix / stick;
    const uy = iy / stick;
    const along = d.vx * ux + d.vy * uy;
    const add = Math.min(Math.max(0, ride.speed * stick - along), accel * stick * dt);
    const side = { x: d.vx - along * ux, y: d.vy - along * uy };
    const keep = 1 - Math.exp(-M.turnGrip * dt);
    d.vx += ux * add - side.x * keep;
    d.vy += uy * add * (uy < 0 ? upShare : 1) - side.y * keep;
  }
  if (push > 0) {
    // the dash: along the way it faces, up to its pushed speed (from still too: it gets there at once)
    const ax = Math.cos(d.aim);
    const ay = Math.sin(d.aim);
    const along = d.vx * ax + d.vy * ay;
    const add = Math.min(Math.max(0, cap - along), (cap / Math.max(0.08, p.rise + 0.08)) * dt);
    d.vx += ax * add;
    d.vy += ay * add; // not damped near the surface: the dash is what throws it out of the water
  } else if (ix === 0 && iy === 0) {
    // let go: it glides on, slowing down
    const k = Math.exp(-p.glide * dt);
    d.vx *= k;
    d.vy *= k;
  }
  const s = Math.hypot(d.vx, d.vy);
  if (s > cap) {
    // above its speed it eases back to it
    const ns = cap + (s - cap) * Math.exp(-dt * 3);
    d.vx *= ns / s;
    d.vy *= ns / s;
  }
}

/** The dash button: its push starts (the cooldown is the caller's). */
export function startMountDash(d: Swimmer): void {
  d.rideDashT = 0;
}
