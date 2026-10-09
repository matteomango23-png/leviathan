// The state of the sea (data/sea.ts; owner 9 ottobre 2026): the height of the waves at a point and time, how a
// vehicle of a given length rides them (heave and pitch: a jet ski rides every wave, a long ship averages the short
// ones out, like real hulls), the currents that slow you, the wear of the small boats in a storm. Pure logic.
import { SEA_STATE } from '../data/sea';
import type { WeatherLook } from '../data/weather';

const S = SEA_STATE;

/** The weather's part the sea needs: its waves (1 calm … 3.2 storm) and its wind (0 … 1). */
export type SeaWeather = Pick<WeatherLook, 'waves' | 'wind'>;

/** No waves, no wind (tests, and when the weather is not given). */
export const CALM_SEA: SeaWeather = { waves: 1, wind: 0 };

/** Height of the sea above its resting line at x (units, up > 0). */
export function waveHeight(x: number, t: number, w: SeaWeather): number {
  const amp = S.waves.amp * w.waves * w.waves;
  const { long, short } = S.waves;
  const a = Math.sin(((x - long.speed * t) / long.length) * Math.PI * 2);
  const b = Math.sin(((x - short.speed * t) / short.length) * Math.PI * 2 + 1.3);
  return amp * (long.share * a + short.share * b);
}

/** A vehicle of this length (units) on the waves at x: how high it rides and how much its bow is up (radians, bow
 *  up > 0 for `face`). */
export function rideWaves(
  x: number,
  length: number,
  face: 1 | -1,
  t: number,
  w: SeaWeather,
): { heave: number; pitch: number } {
  const half = length / 2;
  const bow = waveHeight(x + face * half, t, w);
  const mid = waveHeight(x, t, w);
  const stern = waveHeight(x - face * half, t, w);
  const pitch = Math.max(-S.pitchMax, Math.min(S.pitchMax, Math.atan2(bow - stern, length)));
  return { heave: (bow + 2 * mid + stern) / 4, pitch };
}

/** How strong the current is now, 0 (calm) … 1 (full storm). */
export const currentShare = (w: SeaWeather): number =>
  Math.max(0, Math.min(1, (w.wind - S.calmWind) / (1 - S.calmWind)));

/** The share of its top speed a vehicle keeps against the current. */
export const currentMult = (kind: 'boat' | 'ship', w: SeaWeather): number =>
  1 - S.current[kind] * currentShare(w);

/** Swimming: the current pulls near the surface, not below `diverDepthM`. */
export function diverCurrentMult(depthM: number, w: SeaWeather): number {
  const near = Math.max(0, 1 - depthM / S.current.diverDepthM);
  return 1 - S.current.diver * currentShare(w) * near;
}

/** Hull points a small boat loses this step: fast through rough seas only. */
export function boatWear(speedShare: number, w: SeaWeather, dt: number): number {
  const rough = Math.max(0, Math.min(1, (w.waves - S.boatWear.from) / (3.2 - S.boatWear.from)));
  return speedShare > S.boatWear.fast && rough > 0 ? S.boatWear.perSecond * rough * dt : 0;
}
