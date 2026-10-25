// The abyssal submarine's night vision (owner, 23 ottobre 2026; data/abyss.ts NIGHT_VISION): a button at its helm
// switches it on and off. What it looks like is views/nightVisionView.ts. Pure logic.
import type { GameEvent } from './events';
import { subModel, type SubState } from './subState';

/** Its model has night vision and you are driving it. */
export const hasNightVision = (sub: SubState): boolean => sub.aboard && !!subModel(sub.model).nightVision;

/** Is it on now? */
export const nightOn = (sub: SubState): boolean => hasNightVision(sub) && !!sub.night;

export function toggleNight(g: { sub: SubState }, events: GameEvent[]): void {
  if (!hasNightVision(g.sub)) return;
  g.sub.night = !g.sub.night;
  events.push({ type: 'nightVision', on: g.sub.night });
}
