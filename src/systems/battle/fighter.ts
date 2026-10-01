// A beast in a turn-based battle: its health, its moves with turns of recharge, and its short-lived states.
// Damage = the same formula as in the open sea (combat.ts: bite × power × type × (1 − defence)), plus how
// many levels apart the two are (so levelling matters, like Pokémon), a little randomness and critical hits.
import { BATTLE } from '../../data/battle';
import { MOVE_RULES } from '../../data/beasts';
import type { MoveDef } from '../../data/moves';
import type { Stats } from '../../data/species';
import type { Rng } from '../math';
import { moveDamage, moveTypeMult } from '../beasts/combat';
import { FEMININE_SPECIES, type Named } from '../../data/battleText';
import { formName, formStats, formType, type BeastForm } from '../beasts/forms';
import { makeTeamBeast, movesFor, type TeamBeast } from '../beasts/team';

export interface BattleMove {
  move: MoveDef;
  unlocked: boolean;
  unlockLevel: number;
  /** Turns before it can be used again (0 = ready). */
  recharge: number;
  /** Turns of recharge after using it. */
  rechargeTurns: number;
}

export interface Fighter {
  form: BeastForm;
  level: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  moves: BattleMove[];
  /** Hits that will still be halved (shields, armour, taunts). */
  guard: number;
  /** Loses its next turn. */
  stunned: boolean;
  /** The team beast it stands for (to write health back after the battle). */
  uid?: string;
}

export const rechargeTurnsOf = (m: MoveDef): number => Math.round(m.cooldown / BATTLE.secondsPerTurn);

export function makeFighter(form: BeastForm, level: number, hp?: number, uid?: string): Fighter {
  const stats = formStats(form, level);
  const moves = movesFor(makeTeamBeast('', form, level, true)).map(({ move, unlocked, unlockLevel }) => ({
    move,
    unlocked,
    unlockLevel,
    recharge: 0,
    rechargeTurns: rechargeTurnsOf(move),
  }));
  return { form, level, hp: hp ?? stats.hp, maxHp: stats.hp, stats, moves, guard: 0, stunned: false, uid };
}

export const fighterFromTeam = (b: TeamBeast): Fighter => makeFighter(b.form, b.level, b.hp, b.uid);

export const canUse = (m: BattleMove): boolean => m.unlocked && m.recharge <= 0;

export const fxValue = (move: MoveDef, prefix: string, index = 1): number | undefined => {
  const f = move.fx.find((x) => x.startsWith(prefix));
  if (!f) return undefined;
  const n = Number(f.split(':')[index]);
  return Number.isFinite(n) ? n : undefined;
};
export const hasFx = (move: MoveDef, prefix: string): boolean => move.fx.some((x) => x.startsWith(prefix));

/** How many hits a move lands ('frenzy:N' and 'hits:N' hit several times). */
export function hitsOf(move: MoveDef): number {
  const n =
    fxValue(move, 'hits:') ?? (hasFx(move, 'frenzy:') ? Math.round((fxValue(move, 'frenzy:') ?? 2) / 2) : 1);
  return Math.max(1, Math.min(BATTLE.fx.multiHitMax, n));
}

export interface Hit {
  damage: number;
  crit: boolean;
}

/** The level edge: each level above the target adds BATTLE.levelEdge, clamped. */
export function levelMult(attacker: number, target: number): number {
  const [lo, hi] = BATTLE.levelEdgeClamp;
  return Math.max(lo, Math.min(hi, 1 + BATTLE.levelEdge * (attacker - target)));
}

/** Damage of one hit (before a dodge), or 0 for a move that does no damage. */
export function hitDamage(att: Fighter, def: Fighter, move: MoveDef, rng: Rng, multi: boolean): Hit {
  const base = moveDamage(
    { type: formType(att.form), bite: att.stats.bite, defense: att.stats.defense },
    move,
    {
      type: formType(def.form),
      defense: def.stats.defense,
      hp: def.hp,
      maxHp: def.maxHp,
    },
  );
  if (base <= 0) return { damage: 0, crit: false };
  let dmg = base * levelMult(att.level, def.level);
  if (hasFx(move, 'executeLowHp') && def.hp < def.maxHp * MOVE_RULES.executeHpFraction)
    dmg *= BATTLE.fx.executeMult;
  if (multi) dmg *= BATTLE.fx.multiHitShare;
  const [r0, r1] = BATTLE.randomRange;
  dmg *= r0 + rng() * (r1 - r0);
  const crit = rng() < BATTLE.critChance;
  if (crit) dmg *= BATTLE.critMult;
  if (def.guard > 0) dmg *= BATTLE.fx.guardMult;
  return { damage: Math.max(1, Math.round(dmg)), crit };
}

/** "Superefficace" / "poco efficace" for the battle text. */
export const effectiveness = (move: MoveDef, def: Fighter): number =>
  moveTypeMult(move.type, formType(def.form));

/** How the battle talks about a fighter: its name, and whether the word is feminine. */
export const named = (f: Fighter): Named => ({
  name: formName(f.form),
  f: FEMININE_SPECIES.includes(f.form.speciesId),
});
