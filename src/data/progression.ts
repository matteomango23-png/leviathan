// Leviatano — experience of tamed beasts, the Pokémon way (owner, 3 ottobre 2026: "copia esattamente").
// Each species belongs to a growth group (Pokémon's experience groups): the experience needed to reach a level is
// a curve of the level. A battle won gives the Gen V scaled experience:
//   exp = yield × L / 5 × ((2L + 10) / (L + Lp + 10))^2.5 + 1
// (L the beaten beast's level, Lp the level of the one that gets it): a stronger foe gives more, a weaker one less.
// Values marked "tuning" are a first pass: change them here, never in systems.
import type { StatSource } from './stats';

export type GrowthGroup = 'veloce' | 'medio' | 'medio_lento' | 'lento';

/** Total experience to reach level n, like Pokémon's groups (Fast, Medium Fast, Medium Slow, Slow). */
export const GROWTH_CURVES: Record<GrowthGroup, (n: number) => number> = {
  veloce: (n) => Math.floor((4 * n ** 3) / 5),
  medio: (n) => n ** 3,
  medio_lento: (n) => Math.max(0, Math.floor((6 * n ** 3) / 5 - 15 * n ** 2 + 100 * n - 140)),
  lento: (n) => Math.floor((5 * n ** 3) / 4),
};

/** Growth group by stars (a species can have its own `growth`): common fish grow fast, legends slowly. Tuning. */
export const GROWTH_BY_STARS: Record<StatSource['rarity'], GrowthGroup> = {
  1: 'veloce',
  2: 'medio',
  3: 'medio',
  4: 'medio_lento', // like the starters of Pokémon
  5: 'lento',
};

export const XP_RULES = {
  /** Base experience yield by stars, like Pokémon's (Magikarp 40, Pidgey 50, Gyarados 189, legendaries ~300). Tuning. */
  yieldByStars: { 1: 60, 2: 90, 3: 140, 4: 180, 5: 270 } as Record<StatSource['rarity'], number>,
  variantMult: 1.5, // tuning: albino and alfa are worth more (like a Lucky Egg)
  guardianMult: 1.5, // like a trainer's beast in Pokémon
  /** A small fish caught or eaten: worth a beaten beast of this yield and of the eater's own level. Tuning. */
  fishYield: 10,
  /** One bite of a big beast counts as at most this many fish (owner, 8 ottobre: a humpback gulping a school of 22
   *  sardines grew by handfuls of levels). Tuning. */
  fishPerBiteMax: 2,
  benchShare: 0.5, // the team beasts not in the water get this share, like the modern Exp. Share
};

/** Gen V scaled experience for beating a beast of level `foe` with a beast of level `own`. */
export function scaledXp(yieldBase: number, foe: number, own: number): number {
  return Math.floor(((yieldBase * foe) / 5) * ((2 * foe + 10) / (foe + own + 10)) ** 2.5) + 1;
}
