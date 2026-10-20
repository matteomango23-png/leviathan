// The words and measures of the helm (helmControls.ts): the instruments' line, the light button's label, the levers'
// travel. Split from helmControls in the cleanup of 19 ottobre 2026.
import type { HelmInfo } from './helmTypes';

export type DialKind = 'speed' | 'range' | 'fuel' | 'depth';

/** One dial at the top of the helm: its needle (0 … 1 of its sweep) and its number, no words (helmDials.ts). */
export interface DialValue {
  kind: DialKind;
  share: number;
  text: string;
  /** Red: out of fuel. */
  warn?: boolean;
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** Speed, range and fuel (the drums' litres with it), and the depth under water (owner, 20 ottobre). */
export function dialValues(info: HelmInfo): DialValue[] {
  const km = info.rangeKm < 10 ? info.rangeKm.toFixed(1).replace('.', ',') : String(Math.round(info.rangeKm));
  const [drums, drumsMax] = info.drums ?? [0, 0];
  const out: DialValue[] = [
    { kind: 'speed', share: clamp01(info.knots / info.topKnots), text: String(Math.round(info.knots)) },
    { kind: 'range', share: clamp01(info.rangeKm / info.fullRangeKm), text: km },
    {
      kind: 'fuel',
      share: clamp01((info.fuel + drums) / (info.tank + drumsMax)),
      text: String(Math.round(info.fuel + drums)),
      warn: info.fuel <= 0,
    },
  ];
  if (info.depthM !== undefined && info.maxDepthM)
    out.push({
      kind: 'depth',
      share: clamp01(info.depthM / info.maxDepthM),
      text: String(Math.round(info.depthM)),
    });
  return out;
}

/** The ship's light, or the Krill Hunter's mouth. */
export function lightLabel(info: HelmInfo): string {
  if (info.mouth)
    return info.mouth.open ? (info.mouth.full ? 'Chiudi bocca (sazia)' : 'Chiudi bocca') : 'Apri bocca';
  return info.lightOn ? 'Spegni luce' : 'Luce';
}

/** How far a lever's knob travels: its track's inner height, read from the page (owner, 20 ottobre: after the levers
 *  got smaller the gas knob went past the top of its track, a fixed 150 px). */
export function travel(track: HTMLElement): number {
  const st = getComputedStyle(track);
  return Math.max(0, track.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom));
}
