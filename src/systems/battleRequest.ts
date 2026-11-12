// Asking for a battle in the open sea, and who strikes first when a beast reaches you (split from encounters.ts in
// the cleanup of 12 novembre 2026). Pure logic.
import { ROAM } from '../data/beasts';
import type { Fear } from './beasts/mountTraits';
import { teamMembers } from './beasts/team';
import type { WildBeast } from './beasts/wildState';
import type { BattleRequest, BeastWorld } from './beastState';
import type { GameEvent } from './events';

/**
 * Asks for a battle (the World scene opens it). Only one at a time. With no beast able to fight, there is no
 * battle: like Pokémon you black out (game.ts wakes you on your ship or at your harbour with the team healed).
 */
export function requestBattle(
  g: BeastWorld,
  w: WildBeast,
  first: BattleRequest['first'],
  events: GameEvent[],
  fear?: Fear,
): void {
  if (g.beasts.battle || g.diver.dead) return;
  if (!teamMembers(g.beasts.team).some((b) => !b.ko && b.hp > 0)) {
    w.calm = ROAM.calmAfterBattle;
    events.push({ type: 'noTeam' });
    return;
  }
  g.beasts.battle = { wildId: w.id, first, ...(fear && (fear.fleeTries || fear.frozen) ? { fear } : {}) };
  events.push({ type: 'battleStart', id: w.id, first });
}

/**
 * A beast that reaches you gets a free attack only from behind (you were facing away from it); met face to face,
 * the battle starts even (owner, 15 ottobre: "i nemici a parità di livello sono sempre più forti": almost every battle
 * began with its free attack, though the two sides are otherwise even; tests/balance.test.ts).
 */
export function ambush(
  w: { x: number },
  d: { x: number; face: 1 | -1 },
  mount: { face: 1 | -1 } | null = null,
): BattleRequest['first'] {
  const face = mount?.face ?? d.face;
  return Math.sign(w.x - d.x) === face ? 'normal' : 'foe';
}
