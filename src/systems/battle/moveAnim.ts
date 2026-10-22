// Which animation a battle move plays (data/moveAnims.ts): its own if listed, else by its kind: a physical move bites,
// a special one shoots from afar, a status move on itself makes the beast swell and glow, one on the other sends waves
// at it. Pure logic.
import { MOVE_ANIM, type MoveAnim } from '../../data/moveAnims';
import type { BattleMoveDef, MoveEffect } from '../../data/moveBattle';

/** An effect that only touches the one using the move. */
const onItself = (e: MoveEffect): boolean =>
  e.kind === 'heal' || e.kind === 'rest' || e.kind === 'boostAll' || (e.kind === 'stage' && e.who === 'self');

export function moveAnimOf(move: BattleMoveDef): MoveAnim {
  const own = MOVE_ANIM[move.id];
  if (own) return own;
  if (move.category === 'fisico') return 'bite';
  if (move.category === 'speciale') return 'ranged';
  return move.effects.length > 0 && move.effects.every(onItself) ? 'self' : 'hex';
}
