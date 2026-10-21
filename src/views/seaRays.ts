// Where the light shafts fall on screen and how lit a point is (views/seaLight.ts draws them; tests check them; no
// Phaser). From the research of 21 ottobre 2026 (forums on 2D and real-time underwater light): soft-edged shafts from
// the surface, each swaying and breathing on its own (sums of slow waves, never a regular blink), fading with depth;
// the particles in the water show where a shaft passes through them.
import { SEA } from '../data/diver';
import { hash2 } from '../systems/math';

const R = SEA.lightRays;

export interface Ray {
  /** Its top on screen (px): where it leaves the surface. */
  x: number;
  y: number;
  /** Its slant (radians from straight down, + leaning right as it goes down), width and length (px). */
  angle: number;
  width: number;
  length: number;
  /** How bright it is now (0 … 1, times the light left at that depth). */
  alpha: number;
}

/** A slow, uneven breath: three waves of unrelated speeds. */
const breath = (t: number, seed: number): number =>
  (Math.sin(t * 0.21 + seed * 6.1) +
    Math.sin(t * 0.137 + seed * 2.3) * 0.7 +
    Math.sin(t * 0.071 + seed * 4.7) * 0.5) /
  2.2;

/**
 * The shafts in view. @param surfaceY the surface on screen (px); @param cx the view's world x × zoom (they slide a
 * little with the camera); @param light 0 … 1, how much daylight reaches them (depth, clouds, murk).
 */
export function raysInView(
  w: number,
  h: number,
  surfaceY: number,
  cx: number,
  time: number,
  light: number,
): Ray[] {
  if (light <= 0) return [];
  const span = w * 1.5;
  const out: Ray[] = [];
  for (let i = 0; i < R.count; i++) {
    // spread across the view, each a little off its place (never all in one heap)
    const u = (i + 0.2 + hash2(i, 11) * 0.6) / R.count;
    const drift = time * R.drift * (0.6 + hash2(i, 12) * 0.8);
    const x = ((((u * span + drift - cx * R.parallax) % span) + span) % span) - w * 0.25;
    const width = w * (R.width[0] + (R.width[1] - R.width[0]) * hash2(i, 13));
    const angle = R.tilt + Math.sin(time * 0.09 + i * 1.7) * R.sway;
    const alpha = Math.max(0, R.alpha * light * (0.6 + 0.4 * breath(time, i)));
    out.push({ x, y: surfaceY, angle, width, length: h * 1.4, alpha });
  }
  return out;
}

/** How lit a point on screen is by the shafts (0 … ~1): brightest on a shaft's middle, fading to its sides and down. */
export function rayLightAt(px: number, py: number, rays: readonly Ray[]): number {
  let sum = 0;
  for (const r of rays) {
    const along = (py - r.y) / Math.cos(r.angle);
    if (along <= 0 || along >= r.length) continue;
    const mid = r.x + Math.tan(r.angle) * (py - r.y);
    const half = (r.width / 2) * (1 + along / r.length); // shafts widen a little as they go down
    const d = (px - mid) / half;
    if (Math.abs(d) >= 2) continue;
    sum += (r.alpha * Math.exp(-d * d * 2) * (1 - along / r.length)) / R.alpha;
  }
  return Math.min(1, sum);
}
