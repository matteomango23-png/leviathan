// The battle moves a beast knows, the Pokémon way: at most 4, learned by level from its species' list
// (data/learnsets.ts). A wild or new beast knows the last 4 it learned; a tamed one learns a new move on its own while
// it has a free slot, otherwise the move waits for you to choose what to forget. The ones forgotten can be learned again
// at the port (the Ricordamosse).
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import { learnedAt, learnedBy } from '../../data/learnsets';
import { MOVE_SLOTS } from '../../data/moveBattle';
import { SPECIES } from '../../data/species';
import { speciesOf, type BeastForm } from './forms';

/** The level its line evolves into this species (0 for a first stage). */
export function evolvedAtOf(speciesId: string): number {
  return SPECIES.find((s) => s.evolvesTo === speciesId)?.evolveLevel ?? 0;
}

/** Everything this beast could know by its level, in the order it learned it. */
export function learnableMoves(form: BeastForm, level: number): string[] {
  const id = speciesOf(form).id;
  return learnedBy(id, level, evolvedAtOf(id)).filter((m) => BATTLE_MOVE_BY_ID[m]);
}

/** The moves of a wild or new beast: the last 4 it learned (like Pokémon). */
export function defaultMoves(form: BeastForm, level: number): string[] {
  const all = learnableMoves(form, level);
  return all.length ? all.slice(-MOVE_SLOTS) : ['spinta'];
}

/** The moves a beast learns on reaching `level` (and, when it just evolved, those of its new species). */
export function movesLearnedAt(form: BeastForm, level: number, evolved: boolean): string[] {
  const id = speciesOf(form).id;
  const now = [...(evolved ? learnedAt(id, 0) : []), ...learnedAt(id, level)];
  return [...new Set(now)].filter((m) => BATTLE_MOVE_BY_ID[m]);
}

/** What a beast with these moves can relearn (Ricordamosse): learnable by its level, not known now. */
export function rememberable(form: BeastForm, level: number, known: string[]): string[] {
  return learnableMoves(form, level).filter((m) => !known.includes(m));
}

/**
 * Your choice for a move waiting to be learned (or one asked to the Ricordamosse): learn it in place of the move at
 * `forget` (or into a free slot), or give it up (`forget` null). It stops waiting either way.
 */
export function decideMove(
  b: { known: string[]; ppUsed?: number[]; pendingMoves?: string[] },
  move: string,
  forget: number | null,
): boolean {
  const ok = forget === null ? false : learnMove(b, move, b.known.length < MOVE_SLOTS ? undefined : forget);
  if (b.pendingMoves) {
    b.pendingMoves = b.pendingMoves.filter((m) => m !== move);
    if (!b.pendingMoves.length) delete b.pendingMoves;
  }
  return ok;
}

/**
 * A beast learns a move: into a free slot, or in place of `forget` (an index). Returns false when there is no room
 * and nothing to forget, or it already knows it. `ppUsed` keeps step with the slots.
 */
export function learnMove(b: { known: string[]; ppUsed?: number[] }, move: string, forget?: number): boolean {
  if (b.known.includes(move) || !BATTLE_MOVE_BY_ID[move]) return false;
  if (b.known.length < MOVE_SLOTS && forget === undefined) {
    b.known.push(move);
    if (b.ppUsed) b.ppUsed.push(0);
    return true;
  }
  if (forget === undefined || forget < 0 || forget >= b.known.length) return false;
  b.known[forget] = move;
  if (b.ppUsed) b.ppUsed[forget] = 0;
  return true;
}
