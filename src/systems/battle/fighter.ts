// A beast in a turn-based battle, the Pokémon way: its health, its (up to 4) moves with their PP, a lasting condition
// (avvelenato, ferito, paralizzato, stordito, congelato), its statistics raised or lowered from −6 to +6.
// Damage like Pokémon (combat.ts baseDamage, then same-type bonus, type, critical hit and a random roll).
import { BATTLE } from '../../data/battle';
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import {
  HIGH_CRIT_CHANCE,
  MULTI_HIT_ODDS,
  type BattleMoveDef,
  type StageId,
  type StatusId,
} from '../../data/moveBattle';
import { counterTypeOf, type TypeId } from '../../data/rules';
import type { Stats } from '../../data/stats';
import type { Rng } from '../math';
import { baseDamage, moveTypeMult } from '../beasts/combat';
import { FEMININE_SPECIES, type Named } from '../../data/battleText';
import { formName, formStats, formType, type BeastForm } from '../beasts/forms';
import { defaultMoves } from '../beasts/battleMoves';
import type { TeamBeast } from '../beasts/team';
import { effectiveStat } from './status';

export interface BattleMove {
  move: BattleMoveDef;
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

/**
 * A fighter. `known`: its moves (a wild beast: the last 4 it learned by its level); `ppUsed`: the PP they had already
 * spent (a team beast keeps them between battles).
 */
export function makeFighter(
  form: BeastForm,
  level: number,
  hp?: number,
  uid?: string,
  ppUsed: number[] = [],
  known: string[] = defaultMoves(form, level),
): Fighter {
  const stats = formStats(form, level);
  const moves = known
    .map((id) => BATTLE_MOVE_BY_ID[id])
    .filter((m): m is BattleMoveDef => !!m)
    .map((move, i) => ({ move, maxPp: move.pp, pp: Math.max(0, move.pp - (ppUsed[i] ?? 0)) }));
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

/** A team beast in battle: its health, PP and condition as it left the last one (like Pokémon). */
export function fighterFromTeam(b: TeamBeast): Fighter {
  const f = makeFighter(b.form, b.level, b.hp, b.uid, b.ppUsed, b.known);
  f.status = b.status ?? null;
  f.sleepTurns = b.status === 'stordito' ? Math.max(1, b.sleepTurns ?? 2) : 0;
  return f;
}

/** The PP each move has spent (to keep on the team beast). */
export const ppUsedOf = (f: Fighter): number[] => f.moves.map((m) => m.maxPp - m.pp);

export const canUse = (m: BattleMove): boolean => m.pp > 0;

/** The type a move hits with: a 'variabile' move (the Leviatano) takes the type that beats the target. */
export function moveTypeAgainst(move: BattleMoveDef, def: Fighter): TypeId {
  if (move.type !== 'variabile') return move.type;
  const t = formType(def.form);
  return t === 'variabile' ? 'predatore' : counterTypeOf(t);
}

/** How many times a move hits this time (2–5 like Pokémon: 35%, 35%, 15%, 15%). */
export function rollHits(move: BattleMoveDef, rng: Rng): number {
  if (!move.hits) return 1;
  const [a, b] = move.hits;
  if (a === b) return a;
  let r = rng();
  for (const [n, p] of MULTI_HIT_ODDS) {
    if (n < a || n > b) continue;
    if ((r -= p) < 0) return n;
  }
  return b;
}

/** The average number of hits (for the wild beast's choice). */
export const averageHits = (move: BattleMoveDef): number =>
  move.hits ? (move.hits[0] === 2 ? 3 : move.hits[0]) : 1;

export interface Hit {
  damage: number;
  crit: boolean;
}

/** Damage of one hit, or 0 for a move that does no damage: the Pokémon formula. */
export function hitDamage(att: Fighter, def: Fighter, move: BattleMoveDef, rng: Rng, power?: number): Hit {
  const pw = power ?? move.power;
  if (pw <= 0) return { damage: 0, crit: false };
  const physical = move.category !== 'speciale';
  const crit = rng() < (move.highCrit ? HIGH_CRIT_CHANCE : BATTLE.critChance);
  // like Pokémon, a critical hit ignores the attacker's lowered and the target's raised statistics
  const a = effectiveStat(att, physical ? 'atk' : 'spa', crit ? 'up' : 'all');
  const d = effectiveStat(def, physical ? 'def' : 'spd', crit ? 'down' : 'all');
  let dmg = baseDamage(att.level, pw, a, d);
  if (crit) dmg *= BATTLE.critMult;
  const [r0, r1] = BATTLE.randomRange;
  dmg *= r0 + rng() * (r1 - r0);
  const type = moveTypeAgainst(move, def);
  if (move.type === 'variabile' || type === formType(att.form)) dmg *= BATTLE.stab;
  dmg *= moveTypeMult(type, formType(def.form));
  if (physical && att.status === 'ferito') dmg *= BATTLE.status.woundedAttack; // like a burn
  return { damage: Math.max(1, Math.floor(dmg)), crit };
}

/** "Superefficace" / "poco efficace" for the battle text. */
export const effectiveness = (move: BattleMoveDef, def: Fighter): number =>
  moveTypeMult(moveTypeAgainst(move, def), formType(def.form));

/** How the battle talks about a fighter: its name, and whether the word is feminine. */
export const named = (f: Fighter): Named => ({
  name: formName(f.form),
  f: FEMININE_SPECIES.includes(f.form.speciesId),
});
