// A beast in a turn-based battle, the Pokémon way: its health, its moves with their PP, a lasting condition
// (avvelenato, ferito, paralizzato, stordito, congelato), its statistics raised or lowered from −6 to +6.
// Damage like Pokémon (combat.ts baseDamage, then same-type bonus, type, critical hit and a random roll).
import { BATTLE } from '../../data/battle';
import { MOVE_RULES } from '../../data/beasts';
import type { MoveDef } from '../../data/moves';
import { moveBattleOf, type MoveBattle, type StageId, type StatusId } from '../../data/moveBattle';
import type { Stats } from '../../data/stats';
import type { Rng } from '../math';
import { baseDamage, isWounded, moveTypeMult } from '../beasts/combat';
import { FEMININE_SPECIES, type Named } from '../../data/battleText';
import { formName, formStats, formType, type BeastForm } from '../beasts/forms';
import { makeTeamBeast, movesFor, type TeamBeast } from '../beasts/team';
import { effectiveStat } from './status';

export interface BattleMove {
  move: MoveDef;
  /** How it works in battle (power, accuracy, PP, category, priority, effects). */
  rules: MoveBattle;
  unlocked: boolean;
  unlockLevel: number;
  /** PP left (it cannot be used at 0), out of `maxPp`. */
  pp: number;
  maxPp: number;
}

export interface Fighter {
  form: BeastForm;
  level: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  moves: BattleMove[];
  /** Its lasting condition, if any. */
  status: StatusId | null;
  /** Turns of sleep left ('stordito'). */
  sleepTurns: number;
  /** Statistics raised or lowered, −6…+6. */
  stages: Record<StageId, number>;
  /** It loses its turn this round (hit by a flinching move, or taken from behind). */
  flinch: boolean;
  /** The team beast it stands for (to write health and PP back after the battle). */
  uid?: string;
}

export const noStages = (): Record<StageId, number> => ({
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
  acc: 0,
  eva: 0,
});

/** A fighter; `ppUsed` are the PP its moves had already spent (a team beast keeps them between battles). */
export function makeFighter(
  form: BeastForm,
  level: number,
  hp?: number,
  uid?: string,
  ppUsed: number[] = [],
): Fighter {
  const stats = formStats(form, level);
  const moves = movesFor(makeTeamBeast('', form, level, true)).map(({ move, unlocked, unlockLevel }, i) => {
    const rules = moveBattleOf(move);
    return {
      move,
      rules,
      unlocked,
      unlockLevel,
      maxPp: rules.pp,
      pp: Math.max(0, rules.pp - (ppUsed[i] ?? 0)),
    };
  });
  return {
    form,
    level,
    hp: hp ?? stats.hp,
    maxHp: stats.hp,
    stats,
    moves,
    status: null,
    sleepTurns: 0,
    stages: noStages(),
    flinch: false,
    uid,
  };
}

export const fighterFromTeam = (b: TeamBeast): Fighter => makeFighter(b.form, b.level, b.hp, b.uid, b.ppUsed);

/** The PP each move has spent (to keep on the team beast). */
export const ppUsedOf = (f: Fighter): number[] => f.moves.map((m) => m.maxPp - m.pp);

export const canUse = (m: BattleMove): boolean => m.unlocked && m.pp > 0;

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

/** Damage of one hit (before a dodge), or 0 for a move that does no damage: the Pokémon formula. */
export function hitDamage(
  att: Fighter,
  def: Fighter,
  move: MoveDef,
  rng: Rng,
  multi: boolean,
  power?: number,
): Hit {
  const rules = moveBattleOf(move);
  const pw = power ?? rules.power;
  if (pw <= 0) return { damage: 0, crit: false };
  const physical = move.type === 'variabile' ? att.stats.atk >= att.stats.spa : rules.category !== 'speciale';
  const crit = rng() < BATTLE.critChance;
  // like Pokémon, a critical hit ignores the attacker's lowered and the target's raised statistics
  const a = effectiveStat(att, physical ? 'atk' : 'spa', crit ? 'up' : 'all');
  const d = effectiveStat(def, physical ? 'def' : 'spd', crit ? 'down' : 'all');
  let dmg = baseDamage(att.level, pw, a, d);
  if (move.fx.includes('x2vsWounded') && isWounded(def.hp, def.maxHp)) dmg *= BATTLE.fx.woundedMult;
  if (hasFx(move, 'executeLowHp') && def.hp < def.maxHp * MOVE_RULES.executeHpFraction)
    dmg *= BATTLE.fx.executeMult;
  if (multi) dmg *= BATTLE.fx.multiHitShare;
  if (crit) dmg *= BATTLE.critMult;
  const [r0, r1] = BATTLE.randomRange;
  dmg *= r0 + rng() * (r1 - r0);
  const type = formType(att.form);
  if (move.type === 'variabile' || move.type === type) dmg *= BATTLE.stab;
  dmg *= moveTypeMult(move.type, formType(def.form));
  if (physical && att.status === 'ferito') dmg *= BATTLE.status.woundedAttack; // like a burn
  return { damage: Math.max(1, Math.floor(dmg)), crit };
}

/** "Superefficace" / "poco efficace" for the battle text. */
export const effectiveness = (move: MoveDef, def: Fighter): number =>
  moveTypeMult(move.type, formType(def.form));

/** How the battle talks about a fighter: its name, and whether the word is feminine. */
export const named = (f: Fighter): Named => ({
  name: formName(f.form),
  f: FEMININE_SPECIES.includes(f.form.speciesId),
});
