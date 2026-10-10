// The sea in words for the cockpit's bridge (owner, 10 ottobre 2026: wind, water quality and visibility in the
// cockpit): the wind, the waves' height and the current, how clear the water is and how far the lamp shows. Pure.
import { CLARITY, SEA_STATE } from '../data/sea';
import type { WeatherLook } from '../data/weather';
import { DELTA, WORLD } from '../data/worldLayout';
import { currentMult } from './sea';

/** The wind, 0 … 1, in words. */
export const windWords = (wind: number): string =>
  wind < 0.2 ? 'calmo' : wind < 0.45 ? 'brezza' : wind < 0.8 ? 'vento forte' : 'burrasca';

/** The waves: their height in metres (crest to trough, roughly) and how much the current slows the ship. */
export function seaWords(look: Pick<WeatherLook, 'waves' | 'wind'>): {
  waveM: number;
  slowPct: number;
  text: string;
} {
  const W = SEA_STATE.waves;
  const waveM = Math.round(((W.swell + W.amp * look.waves * look.waves) * 10) / WORLD.unitsPerMetre) / 10;
  const slowPct = Math.round((1 - currentMult('ship', look)) * 100);
  const text = `onde di ${waveM.toString().replace('.', ',')} m${slowPct > 0 ? ` · corrente −${slowPct}% di velocità` : ''}`;
  return { waveM, slowPct, text };
}

/** How murky the water is, 0 … 1, in words, and how far the lamp shows things (m). */
export function waterWords(murk: number): { text: string; visibilityM: number } {
  const text = murk < 0.15 ? 'limpida' : murk < 0.35 ? 'velata' : murk < 0.55 ? 'torbida' : 'molto torbida';
  const visibilityM = Math.round(
    CLARITY.visibilityM * (1 - (1 - DELTA.murk.lampMult) * murk) * (1 - 0.4 * murk),
  );
  return { text, visibilityM };
}
