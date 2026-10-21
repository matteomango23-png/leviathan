// The talents of the beast you ride that act on the sea around it (beasts/mountTraits.ts; docs/PROPOSTA-RUOLI.md):
// a Tempesta's dash stuns the wild beasts near it and smaller than it, which turn away and leave you alone a while.
// (The Predatore's Assalto is in encounters.ts, the Corazzato's Ariete and the Glaciale's Rompighiaccio in
// abilities.ts, the Abissale's light in lamp.ts.)
import { RIDE_TALENTS } from '../data/beasts';
import { activeBeast, type BeastWorld } from './beastState';
import { talentOf } from './beasts/mountTraits';
import { isInWater } from './beasts/wildState';
import type { GameEvent } from './events';

/** After the diver's step: a dash of a Tempesta you ride stuns the smaller wild beasts around it. */
export function stepRideTalents(g: BeastWorld, events: GameEvent[]): void {
  const m = g.beasts.mount;
  const b = activeBeast(g);
  if (!g.beasts.riding || !m || !b || talentOf(b.form) !== 'tempesta') return;
  if (!events.some((e) => e.type === 'dash')) return;
  const T = RIDE_TALENTS;
  let stunned = 0;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.boss || w.length >= m.length * T.stunSizeShare) continue;
    const dx = w.x - m.x;
    const dy = w.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > m.length * T.stunReachMult) continue;
    w.calm = Math.max(w.calm, T.stunSeconds);
    w.mood = 'wander';
    // jolted away from it
    w.vx += (dx / (d || 1)) * 40;
    w.vy += (dy / (d || 1)) * 40;
    w.flash = 0.4;
    stunned++;
  }
  if (stunned) events.push({ type: 'mountStunned', count: stunned });
}
