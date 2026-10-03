// Lasting conditions and statistic stages, the Pokémon way. Pure rules on a fighter's body; battle.ts uses them.
//   avvelenato  (poison)    loses 1/8 of its health at the end of each round
//   ferito      (burn)      loses 1/16 each round and its physical attacks do half damage
//   paralizzato (paralysis) half speed, 1 turn in 4 it cannot move
//   stordito    (sleep)     cannot move for 1–3 turns
//   congelato   (freeze)    cannot move; each turn 1 in 5 it thaws
// Stages −6…+6 multiply a statistic by (2 + n) / 2 (or 2 / (2 − n)), accuracy and evasion by (3 + n) / 3.
import { BATTLE } from '../../data/battle';
import type { StageId, StatusId } from '../../data/moveBattle';
import type { TypeId } from '../../data/rules';
import type { Stats } from '../../data/stats';
import type { Rng } from '../math';

/** The parts of a fighter these rules touch. */
export interface Body {
  stats: Stats;
  stages: Record<StageId, number>;
  status: StatusId | null;
  sleepTurns: number;
  flinch: boolean;
  hp: number;
  maxHp: number;
}

export const stageMult = (n: number): number => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
export const accuracyMult = (n: number): number => (n >= 0 ? (3 + n) / 3 : 3 / (3 - n));

/** A statistic with its stage ('up': only a raised stage counts, 'down': only a lowered one) and paralysis. */
export function effectiveStat(
  f: Body,
  stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe',
  which: 'all' | 'up' | 'down' = 'all',
): number {
  let n = f.stages[stat];
  if (which === 'up') n = Math.max(0, n);
  if (which === 'down') n = Math.min(0, n);
  let v = f.stats[stat] * stageMult(n);
  if (stat === 'spe' && f.status === 'paralizzato') v *= BATTLE.status.paralysisSpeed;
  return v;
}

/** Why a fighter cannot act this turn, if it cannot ('woke' / 'thawed': it can, and says so). */
export type TurnBlock = 'flinch' | 'sleep' | 'frozen' | 'paralyzed';
export function checkTurn(
  f: Body,
  rng: Rng,
): { blocked: TurnBlock | null; recovered: 'woke' | 'thawed' | null } {
  if (f.flinch) {
    f.flinch = false;
    return { blocked: 'flinch', recovered: null };
  }
  if (f.status === 'stordito') {
    f.sleepTurns--;
    if (f.sleepTurns > 0) return { blocked: 'sleep', recovered: null };
    f.status = null;
    return { blocked: null, recovered: 'woke' };
  }
  if (f.status === 'congelato') {
    if (rng() >= BATTLE.status.thawChance) return { blocked: 'frozen', recovered: null };
    f.status = null;
    return { blocked: null, recovered: 'thawed' };
  }
  if (f.status === 'paralizzato' && rng() < BATTLE.status.paralysisSkip)
    return { blocked: 'paralyzed', recovered: null };
  return { blocked: null, recovered: null };
}

/** Puts a condition on a fighter; false if it already has one or its type is immune. */
export function giveStatus(f: Body, status: StatusId, type: TypeId | 'variabile', rng: Rng): boolean {
  if (f.status || f.hp <= 0) return false;
  if (type !== 'variabile' && BATTLE.status.immune[status] === type) return false;
  f.status = status;
  if (status === 'stordito') {
    const [a, b] = BATTLE.status.sleepTurns;
    f.sleepTurns = a + Math.floor(rng() * (b - a + 1)) + 1; // +1: the turn it falls asleep does not count
  }
  return true;
}

/** Raises or lowers a stage; returns how much it really moved (0 at the limit). */
export function changeStage(f: Body, stat: StageId, by: number): number {
  const before = f.stages[stat];
  f.stages[stat] = Math.max(-6, Math.min(6, before + by));
  return f.stages[stat] - before;
}

/** The damage a condition does at the end of a round (0 for none). */
export function residualDamage(f: Body): number {
  if (f.hp <= 0) return 0;
  const share =
    f.status === 'avvelenato'
      ? BATTLE.status.poisonShare
      : f.status === 'ferito'
        ? BATTLE.status.woundShare
        : 0;
  return share ? Math.max(1, Math.floor(f.maxHp * share)) : 0;
}
