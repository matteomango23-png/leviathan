// The sea that answers the hulls (owner, 9 ottobre 2026: how a wave changes when it breaks on ships of different
// weight and speed). Over the waves of the open sea (sea.ts) a row of water columns around the camera, each a spring
// pulled back to rest and tugging at its neighbours, so a push spreads out as waves and dies away (the usual way to
// make 2D water react: Hoffman's spring row). A hull pushes them: its bow raises a wave that grows with its speed and
// weight, it drags the water down with it when it slams in; a heavy ship running into a crest piles it up at its
// bow. Pure logic, data/sea.ts COLUMNS.
import { COLUMNS } from '../data/sea';

export interface WaterColumns {
  /** World x of the first column. */
  x0: number;
  h: Float32Array;
  v: Float32Array;
}

const C = COLUMNS;

export const newColumns = (centre = 0): WaterColumns => ({
  x0: Math.round((centre - (C.count * C.spacing) / 2) / C.spacing) * C.spacing,
  h: new Float32Array(C.count),
  v: new Float32Array(C.count),
});

/** Keeps the row under the camera: when it moves on, the columns behind are dropped and fresh ones added ahead. */
export function followColumns(c: WaterColumns, centre: number): void {
  const want = Math.round((centre - (C.count * C.spacing) / 2) / C.spacing) * C.spacing;
  const shift = Math.round((want - c.x0) / C.spacing);
  if (shift === 0) return;
  if (Math.abs(shift) >= C.count) {
    c.h.fill(0);
    c.v.fill(0);
  } else if (shift > 0) {
    c.h.copyWithin(0, shift);
    c.v.copyWithin(0, shift);
    c.h.fill(0, C.count - shift);
    c.v.fill(0, C.count - shift);
  } else {
    c.h.copyWithin(-shift, 0, C.count + shift);
    c.v.copyWithin(-shift, 0, C.count + shift);
    c.h.fill(0, 0, -shift);
    c.v.fill(0, 0, -shift);
  }
  c.x0 = want;
}

/** One step: each column springs back, then the neighbours pass the motion on (a few passes). */
export function stepColumns(c: WaterColumns, dt: number): void {
  const n = C.count;
  const steps = Math.max(1, Math.ceil(dt / C.maxStep));
  const h = dt / steps;
  const lD = new Float32Array(n);
  const rD = new Float32Array(n);
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < n; i++) {
      c.v[i]! += (-C.stiffness * c.h[i]! - C.damping * c.v[i]!) * h;
      c.h[i]! += c.v[i]! * h;
    }
    for (let pass = 0; pass < C.passes; pass++) {
      for (let i = 0; i < n; i++) {
        lD[i] = i > 0 ? C.spread * (c.h[i]! - c.h[i - 1]!) : 0;
        rD[i] = i < n - 1 ? C.spread * (c.h[i]! - c.h[i + 1]!) : 0;
      }
      for (let i = 0; i < n; i++) {
        if (i > 0) c.v[i - 1]! += lD[i]! * h * C.passSpeed;
        if (i < n - 1) c.v[i + 1]! += rD[i]! * h * C.passSpeed;
      }
    }
  }
}

/** The extra height of the water at x from the hulls' push (units, up > 0); 0 outside the row. */
export function columnHeight(c: WaterColumns, x: number): number {
  const f = (x - c.x0) / C.spacing;
  const i = Math.floor(f);
  if (i < 0 || i >= C.count - 1) return 0;
  const t = f - i;
  return c.h[i]! * (1 - t) + c.h[i + 1]! * t;
}

/** Pushes the water between x0 and x1 up (dv > 0, units/s) or down, fading at the ends. */
export function pushColumns(c: WaterColumns, x0: number, x1: number, dv: number): void {
  const a = Math.max(0, Math.floor((Math.min(x0, x1) - c.x0) / C.spacing));
  const b = Math.min(C.count - 1, Math.ceil((Math.max(x0, x1) - c.x0) / C.spacing));
  const span = Math.max(1, b - a);
  for (let i = a; i <= b; i++) {
    const edge = Math.sin(((i - a) / span) * Math.PI); // stronger in the middle of the push
    c.v[i]! += dv * edge;
  }
}

/**
 * A hull at x (facing `face`, `length` units, `speed` units/s) pressing on the water: its bow raises a wave that grows
 * with its speed and weight, a trough behind it; landing hard (`slam`, its downward speed) it drives the water down,
 * which rises around it.
 */
export function hullOnWater(
  c: WaterColumns,
  x: number,
  face: 1 | -1,
  length: number,
  speed: number,
  slam: number,
  dt: number,
): void {
  const weight = Math.min(1, length / C.heavyLength);
  const bow = x + face * length * 0.45;
  const push = C.bowWave * (speed / C.speedRef) * (0.3 + 0.7 * weight) * dt;
  if (push > 0) {
    pushColumns(c, bow, bow + face * length * 0.12, push);
    pushColumns(c, x + face * length * 0.15, x + face * length * 0.35, -push * 0.5);
  }
  if (slam > C.slamFrom) {
    const hit = (slam - C.slamFrom) * C.slam;
    pushColumns(c, x - length * 0.35, x + length * 0.35, -hit);
  }
}
