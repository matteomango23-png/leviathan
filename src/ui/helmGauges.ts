// The words and measures of the helm (helmControls.ts): the instruments' line, the light button's label, the levers'
// travel. Split from helmControls in the cleanup of 19 ottobre 2026.
import type { HelmInfo } from './helmTypes';

/** Knots, gas, fuel and range, depth, drums, the hold: one line under the sonar. */
export function gaugeLine(info: HelmInfo, throttle: number): string {
  const km = info.rangeKm < 10 ? info.rangeKm.toFixed(1).replace('.', ',') : String(Math.round(info.rangeKm));
  const parts = [
    `${Math.round(info.knots)} nodi`,
    `gas ${Math.round(throttle * 100)}%`,
    `${Math.round(info.fuel)} L · ${km} km`,
  ];
  if (info.depthM !== undefined) parts.push(`${Math.round(info.depthM)} / ${info.maxDepthM} m`);
  // (the hull: its own bar at the top left, helmBars.ts; owner, 19 ottobre: the line wrapped and ran over the air)
  if (info.drums) parts.push(`fusti ${Math.round(info.drums[0])}/${info.drums[1]} L`);
  if (info.pool) parts.push(info.pool);
  return parts.join(' · ');
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
