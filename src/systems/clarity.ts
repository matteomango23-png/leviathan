// How clear the water is (owner, 9 ottobre 2026): every stretch of sea has its own slow cycle, clear for a while and
// murky for a while; rough seas and rain stir it up; the Delta is always murky. Murkier water darkens and tints the
// sea, shortens the lamp, and at its worst the beasts away from your light are only dark shapes. Pure logic.
import { CLARITY } from '../data/sea';
import { WORLD } from '../data/worldLayout';
import type { WeatherLook } from '../data/weather';
import { murkAt } from './world/zones';

const C = CLARITY;

/** A steady number in 0..1 for a stretch of sea (its phase and period). */
const hash = (k: number, salt: number): number => {
  const s = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The stretch of sea at x. */
export const clarityZone = (x: number): number => Math.floor(x / (C.zoneKm * 1000 * WORLD.unitsPerMetre));

/** A stretch's own cycle now, 0 (clear) … CLARITY.cycleMax: clear most of the time, murky for a part of each period. */
function zoneMurk(k: number, t: number): number {
  const period = C.periodS * (1 - C.jitter + 2 * C.jitter * hash(k, 1));
  const wave = 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + hash(k, 2) * Math.PI * 2);
  return Math.max(0, (wave - 0.4) / 0.6) * C.cycleMax;
}

/** The cycle at x now: from the middle of one stretch to the middle of the next it blends softly into the next one's
 *  (owner, 9 ottobre: crossing into another stretch the water changed at a stroke). */
export function cycleMurk(x: number, t: number): number {
  const f = x / (C.zoneKm * 1000 * WORLD.unitsPerMetre) - 0.5;
  const k = Math.floor(f);
  const u = f - k;
  const s = u * u * (3 - 2 * u);
  return zoneMurk(k, t) * (1 - s) + zoneMurk(k + 1, t) * s;
}

/** How murky the water is at a point now, 0..1 (above the surface: 0). */
export function turbidityAt(
  x: number,
  y: number,
  t: number,
  w: Pick<WeatherLook, 'waves' | 'precip'>,
): number {
  if (y < WORLD.surfaceY) return 0;
  const weather = C.fromWaves * Math.max(0, Math.min(1, (w.waves - 1) / 2.2)) + C.fromRain * w.precip;
  return Math.max(murkAt(x, y), Math.min(C.max, cycleMurk(x, t) + weather));
}

const smooth = (a: number, b: number, v: number): number => {
  const u = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** At this murk, how much a beast this far from your light is only a dark shape: 0 (seen) … 1 (a shape). */
export const shapeShare = (murk: number, distance: number): number =>
  smooth(C.shapesFrom, C.shapesFrom + C.shapesSoft, murk) *
  smooth(C.shapesBeyond, C.shapesBeyond + C.shapesSoft * 100, distance);
