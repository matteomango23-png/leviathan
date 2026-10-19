// The words of the helm (helmControls.ts): the instruments' line and the light button's label. Split from
// helmControls in the cleanup of 19 ottobre 2026.
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
