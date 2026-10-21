// The diver's own stamina (owner, 21 ottobre 2026: "lo scatto… un po' limitato per il sub senza cavalcatura e
// aggiungerei anche la barra stamina nello stesso modo"): each dash on his own costs one of DIVER.dash.dashes; it
// refills while he swims or rides; emptied, no dash until it is full again. Kept with the beasts' (stamina.ts),
// not saved. Pure logic.
import { DIVER } from '../data/diver';
import type { BeastWorld } from './beastState';
import type { GameEvent } from './events';
import { rest, staminaOf, type Stamina } from './stamina';

const KEY = 'diver';

export const diverStamina = (g: BeastWorld): Stamina => staminaOf(g.beasts.stamina, KEY);

/** Can he dash on his own now (not worn out)? */
export const diverCanDash = (g: BeastWorld): boolean => !diverStamina(g).worn;

/** After he moved: a dash of his own spends his stamina, otherwise it comes back. */
export function stepDiverStamina(g: BeastWorld, events: GameEvent[], dt: number): void {
  const s = diverStamina(g);
  const D = DIVER.dash;
  if (!g.beasts.riding && events.some((e) => e.type === 'dash') && !s.worn) {
    s.value = Math.max(0, s.value - 1 / D.dashes);
    if (s.value <= 1e-6) {
      s.value = 0;
      s.worn = true;
      events.push({ type: 'diverWorn' });
    }
    return;
  }
  rest(s, dt, D.regenSeconds, D.exhaustedSeconds);
}
