// Small math helpers shared by systems. Deterministic noise matches prototype/leviatano.html.

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** Integer hash → [0, 1). Same as the prototype's hash(x, y). */
export function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Three octaves of noise, as in the prototype. */
export function fbm(x: number, y: number): number {
  return (
    noise2(x, y) * 0.6 + noise2(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + noise2(x * 4.3 + 3, y * 4.3 + 41) * 0.1
  );
}

/** Piecewise-linear colour/number ramp over y: [[y, value], ...]. */
export function rampColor(stops: [number, number[]][], y: number): [number, number, number] {
  const first = stops[0]!;
  if (y <= first[0]) return [first[1][0]!, first[1][1]!, first[1][2]!];
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i]!;
    if (y <= s[0]) {
      const p = stops[i - 1]!;
      const t = (y - p[0]) / (s[0] - p[0]);
      return [lerp(p[1][0]!, s[1][0]!, t), lerp(p[1][1]!, s[1][1]!, t), lerp(p[1][2]!, s[1][2]!, t)];
    }
  }
  const last = stops[stops.length - 1]!;
  return [last[1][0]!, last[1][1]!, last[1][2]!];
}

export function rampNumber(stops: [number, number][], x: number): number {
  const first = stops[0]!;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i]!;
    if (x <= s[0]) {
      const p = stops[i - 1]!;
      return lerp(p[1], s[1], (x - p[0]) / (s[0] - p[0]));
    }
  }
  return stops[stops.length - 1]![1];
}

/** Seeded random generator (mulberry32) so that systems are testable. */
export type Rng = () => number;
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const range = (rng: Rng, a: number, b: number): number => a + rng() * (b - a);
