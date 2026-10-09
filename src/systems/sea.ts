// The state of the sea (data/sea.ts; owner 9 ottobre 2026): the height of the waves at a point and time (the hulls
// ride them: ride.ts), the currents that slow you, the wear of the small boats in a storm. Pure logic.
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
  // like real sea waves (the water turns in circles under them): sharp crests, broad flat troughs, more so the
  // rougher the sea (a second-order wave: + q·cos 2θ)
  const q = S.waves.sharpness * Math.min(1, Math.max(0, (w.waves - 0.8) / 2.4));
  const wave = (x0: number, len: number, speed: number, shift: number): number => {
    const s = Math.sin(((x0 - speed * t) / len) * Math.PI * 2 + shift);
    return s + q * (2 * s * s - 1);
  };
  return (
    amp *
    (long.share * wave(x, long.length, long.speed, 0) + short.share * wave(x, short.length, short.speed, 1.3))
  );
}

/** How far under its resting line the sea's surface can dip now (units): the painted water starts there, the waves
 *  above it are drawn by the view (no straight line anywhere). */
export function troughDepth(w: SeaWeather): number {
  const q = S.waves.sharpness * Math.min(1, Math.max(0, (w.waves - 0.8) / 2.4));
  return S.waves.amp * w.waves * w.waves * (1 + q) + 1;
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
