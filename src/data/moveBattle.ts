// Leviatano — how a battle move works, the Pokémon way: power, accuracy, PP, a category (fisico / speciale / stato),
// a priority and its effects. The moves themselves are in battleMoves.ts, who learns them in learnsets.ts.
import type { MoveTypeId } from './rules';

/** The five lasting conditions of Pokémon, with sea names. */
export type StatusId = 'avvelenato' | 'ferito' | 'paralizzato' | 'stordito' | 'congelato';
/** The statistics that can go up and down from −6 to +6 (accuracy and evasion too). */
export type StageId = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type Category = 'fisico' | 'speciale' | 'stato';
export const STAGE_NAMES: Record<StageId, string> = {
  atk: 'l’Attacco',
  def: 'la Difesa',
  spa: 'l’Attacco Speciale',
  spd: 'la Difesa Speciale',
  spe: 'la Velocità',
  acc: 'la Precisione',
  eva: 'l’Elusione',
};
export const STATUS_NAMES: Record<StatusId, string> = {
  avvelenato: 'AVV',
  ferito: 'FER',
  paralizzato: 'PAR',
  stordito: 'STO',
  congelato: 'CON',
};
export const CATEGORY_NAMES: Record<Category, string> = { fisico: 'fisica', speciale: 'speciale', stato: 'di stato' };

export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance: number }
  | { kind: 'stage'; stat: StageId; by: number; who: 'self' | 'foe'; chance: number }
  | { kind: 'flinch'; chance: number } // the target loses its turn, if it has not moved yet this round
  | { kind: 'heal'; share: number } // the user heals this share of its health
  | { kind: 'drain'; share: number } // the user heals this share of the damage done
  | { kind: 'recoil'; share: number } // the user loses this share of the damage done
  | { kind: 'boostAll'; chance: number } // all five statistics +1 (Potere antico)
  | { kind: 'haze' } // every stage of both back to 0
  | { kind: 'rest' }; // full health, asleep for two turns

export interface BattleMoveDef {
  id: string;
  name: string;
  type: MoveTypeId;
  category: Category;
  power: number; // 0: no damage
  accuracy: number | null; // % (null: never misses, like Pokémon's "—")
  pp: number;
  priority: number; // +1 strikes first (Guizzo), −1 last
  effects: MoveEffect[];
  /** Hits several times, between these two numbers (2–5: 35%, 35%, 15%, 15% like Pokémon). */
  hits?: [number, number];
  /** Often hits the weak spot (critical chance 1/8 instead of 1/24). */
  highCrit?: boolean;
  text: string;
}

/** Pokémon's last resort when no move has PP left (Scontro: power 50, the user takes a quarter of its health). */
export const STRUGGLE = { name: 'Lotta disperata', power: 50, recoilShare: 0.25 };
/** Pokémon's moves known at most, and how a 2–5 hit move is spread. */
export const MOVE_SLOTS = 4;
export const MULTI_HIT_ODDS: [number, number][] = [
  [2, 0.35],
  [3, 0.35],
  [4, 0.15],
  [5, 0.15],
];
/** Critical hit chance of a move that often hits the weak spot (Pokémon Gen VI+: stage +1 = 1/8). */
export const HIGH_CRIT_CHANCE = 1 / 8;
/** Letargo: asleep for two turns (+1: the turn it falls asleep does not count). */
export const REST_SLEEP_TURNS = 3;
