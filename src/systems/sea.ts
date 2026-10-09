// The state of the sea (data/sea.ts; owner 9 ottobre 2026): the height of the waves at a point and time (the hulls
// ride them: ride.ts), the currents that slow you, the wear of the small boats in a storm. Pure logic.
import { SEA_STATE } from '../data/sea';
import { columnHeight, type WaterColumns } from './waterColumns';
import type { WeatherLook } from '../data/weather';

const S = SEA_STATE;

/** The weather's part the sea needs: its waves (1 calm … 3.2 storm) and its wind (0 … 1). */
export type SeaWeather = Pick<WeatherLook, 'waves' | 'wind'>;

/** The sea as the views draw it: the weather's waves and, if given, the water the hulls push (waterColumns.ts). */
export interface SeaNow extends SeaWeather {
  water?: WaterColumns | null;
}

/** No waves, no wind (tests, and when the weather is not given). */
export const CALM_SEA: SeaWeather = { waves: 1, wind: 0 };

/** The wave trains of the sea (data/sea.ts): wavenumber, angular speed, share of the height, phase. */
const TRAINS = (() => {
  const W = S.waves;
  const raw = W.lengths.map((len) => Math.pow(len, W.spectrum));
  const sum = raw.reduce((a, b) => a + b, 0);
  return W.lengths.map((len, i) => {
    const k = (Math.PI * 2) / len;
    return {
      k,
      omega: Math.sqrt(W.gravity * k),
      share: raw[i]! / sum,
      phase: (i * 2.399963) % (Math.PI * 2),
    };
  });
})();

/** How rough the sea looks, 0 (calm) … 1 (storm). */
const roughness = (w: SeaWeather): number => Math.max(0, Math.min(1, (w.waves - 0.8) / 2.4));

/**
 * Height of the sea above its resting line at x (units, up > 0): a Gerstner sea. Every bit of water turns in a
 * circle (his Nortek clip), so a point seen at x came from a little away; we find it in a few steps and sum.
 */
export function waveHeight(x: number, t: number, w: SeaWeather): number {
  const amp = S.waves.swell + S.waves.amp * w.waves * w.waves;
  const steep = S.waves.steepCalm + (S.waves.steepStorm - S.waves.steepCalm) * roughness(w);
  const n = TRAINS.length;
  let x0 = x;
  for (let it = 0; it < 4; it++) {
    let dx = 0;
    for (const tr of TRAINS) {
      // its sideways swing: steep × its height, never so much that the crest folds over (k·swing·n ≤ 1)
      const swing = steep * Math.min(amp * tr.share, 1 / (tr.k * n));
      dx += swing * Math.sin(tr.k * x0 - tr.omega * t + tr.phase);
    }
    x0 = x + dx;
  }
  let y = 0;
  for (const tr of TRAINS) y += amp * tr.share * Math.cos(tr.k * x0 - tr.omega * t + tr.phase);
  return y;
}

/** The sea's surface at x: the open sea's waves plus the hulls' push on the water (waterColumns.ts), if given. */
export const seaHeight = (x: number, t: number, w: SeaWeather, water?: WaterColumns | null): number =>
  waveHeight(x, t, w) + (water ? columnHeight(water, x) : 0);

/** How far under its resting line the sea's surface can dip now (units): the painted water starts there, the waves
 *  above it are drawn by the view (no straight line anywhere). */
export const troughDepth = (w: SeaWeather): number => S.waves.swell + S.waves.amp * w.waves * w.waves + 2;

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
