// At a harbour (game.ts calls them, and the port menu): arriving, resting, selling the fish.
import type { GameState } from './newGame';
import { sellBag } from './economy/gear';
import { maxHpOf } from './beasts/team';
import { signalMissions } from './economy/missions';
import type { GameEvent } from './events';
import { repairSub } from './submarine';
import { hearRumours } from './hunts';

/** Arriving at a harbour: everyone is healed, the market restocks, you wake up here. */
export function enterPort(g: GameState, events: GameEvent[] = []): void {
  restAtPort(g);
  repairSub(g, events);
  if (g.port) hearRumours(g.hunts, g.port, events); // the people of the harbour talk
  g.gear.shopBought = {};
}

/** Resting at the port (also the "Riposa" button): you and the team healed, you wake up here next time. */
export function restAtPort(g: GameState): void {
  const d = g.diver;
  if (g.port) g.homePort = g.port.id;
  d.hp = d.maxHp;
  d.o2 = d.maxO2;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
    b.ppUsed = undefined; // PP back to full, like a Pokémon Center
    b.status = undefined;
    b.sleepTurns = undefined;
  }
}

/** Sells the fish bag at the market; counts for "sell" missions. */
export function sellAtPort(g: GameState): { count: number; teeth: number; completed: string[] } {
  const r = sellBag(g.gear);
  const completed = r.count > 0 ? signalMissions(g.gear, { kind: 'sell', count: r.count }) : [];
  return { ...r, completed };
}
