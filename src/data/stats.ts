// Leviatano — beast statistics, the Pokémon way (owner, 3 ottobre 2026: "copia esattamente quello che fa Pokémon").
// Six statistics: health, attack, defence, special attack, special defence, speed. A beast's value at a level comes
// from the Pokémon formula (Gen III+), with an individual value 0–31 per statistic (no effort values or natures):
//   HP    = floor((2 × base + IV) × level / 100) + level + 10
//   other = floor((2 × base + IV) × level / 100) + 5
// Base statistics come from the species (role, size, rarity, type) unless it has its own `base`; values marked
// "tuning" are a first balance and change here.
import { VARIANT_RULES, type TypeId } from './rules';

export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type Stats = Record<StatId, number>;
export const STAT_IDS: readonly StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_NAMES: Record<StatId, string> = {
  hp: 'PS',
  atk: 'Attacco',
  def: 'Difesa',
  spa: 'Att. Speciale',
  spd: 'Dif. Speciale',
  spe: 'Velocità',
};

/** What a species brings to its base statistics. */
export interface StatSource {
  role: 'cavalcatura' | 'compagno' | 'supporto';
  size: 'piccola' | 'media' | 'grande' | 'colossale';
  rarity: 1 | 2 | 3 | 4 | 5;
  type: TypeId | 'variabile';
  /** Its own base statistics, when the automatic ones do not suit it. */
  base?: Stats;
}

/** Types whose moves are physical (Attack against Defence); the others are special. */
export const PHYSICAL_TYPES: readonly (TypeId | 'variabile')[] = ['predatore', 'corazzato'];

/** Total of the six base statistics by stars, like Pokémon's (a starter ~320, a legendary ~600). Tuning. */
export const BASE_TOTAL: Record<StatSource['rarity'], number> = { 1: 330, 2: 390, 3: 450, 4: 500, 5: 580 };

/** How the total is shared: 1 each, then these extras (the attack extra goes to the type's attacking stat). */
const ROLE_SHAPE: Record<StatSource['role'], Partial<Record<StatId | 'attack', number>>> = {
  compagno: { attack: 0.35, spe: 0.1 },
  supporto: { hp: 0.2, def: 0.15, spd: 0.25, attack: -0.1 },
  cavalcatura: { hp: 0.25, spe: 0.25, attack: 0.15 },
};
const SIZE_SHAPE: Record<StatSource['size'], Partial<Record<StatId | 'attack', number>>> = {
  piccola: { spe: 0.3, hp: -0.2 },
  media: {},
  grande: { hp: 0.2, attack: 0.1, spe: -0.15 },
  colossale: { hp: 0.35, attack: 0.2, spe: -0.3 },
};
const TYPE_SHAPE: Record<TypeId | 'variabile', Partial<Record<StatId | 'attack', number>>> = {
  predatore: { attack: 0.25 },
  corazzato: { def: 0.35, spe: -0.1 },
  tempesta: { attack: 0.2, spe: 0.15 },
  abissale: { attack: 0.15, spd: 0.15 },
  glaciale: { hp: 0.15, spd: 0.2 },
  variabile: { attack: 0.1, hp: 0.1 },
};

export const STAT_RULES = {
  ivMax: 31, // individual values 0–31, like Pokémon
  levelDivisor: 100, // the Pokémon formula divides by 100 (our levels stop at 50: like Pokémon's level-50 battles)
};

/** The base statistics of a species. */
export function baseStatsOf(s: StatSource): Stats {
  if (s.base) return s.base;
  const physical = PHYSICAL_TYPES.includes(s.type);
  const w: Stats = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
  for (const shape of [ROLE_SHAPE[s.role], SIZE_SHAPE[s.size], TYPE_SHAPE[s.type]])
    for (const [k, v] of Object.entries(shape)) {
      if (k === 'attack') w[physical ? 'atk' : 'spa'] += v;
      else w[k as StatId] += v;
    }
  // the attack the type does not use stays a little lower
  w[physical ? 'spa' : 'atk'] -= 0.2;
  const sum = STAT_IDS.reduce((a, k) => a + w[k], 0);
  const out = {} as Stats;
  for (const k of STAT_IDS) out[k] = Math.round((w[k] / sum) * BASE_TOTAL[s.rarity]);
  return out;
}

/** A beast's individual values (0–31), the same every time for the same seed. */
export function ivsOf(seed: number): Stats {
  const out = {} as Stats;
  STAT_IDS.forEach((k, i) => {
    let x = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + i * 0x632be5ab) | 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x ^= x >>> 16;
    out[k] = (x >>> 0) % (STAT_RULES.ivMax + 1);
  });
  return out;
}

/** The statistics at a level (Pokémon formula), × the variant's or unique's multiplier. */
export function statsAt(
  s: StatSource,
  level: number,
  variant: 'comune' | 'albino' | 'alfa' = 'comune',
  uniqueMult = 1,
  seed = 0,
): Stats {
  const base = baseStatsOf(s);
  const iv = ivsOf(seed);
  const m = (variant === 'comune' ? 1 : VARIANT_RULES[variant].statMult) * uniqueMult;
  const core = (k: StatId): number => Math.floor(((2 * base[k] + iv[k]) * level) / STAT_RULES.levelDivisor);
  const out = {} as Stats;
  for (const k of STAT_IDS) {
    const v = k === 'hp' ? core(k) + level + 10 : core(k) + 5;
    out[k] = Math.max(1, Math.floor(v * m));
  }
  return out;
}

/** A number for a beast's individual values, from any text (old beasts without a seed: their uid). */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
