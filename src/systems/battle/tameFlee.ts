// Taming and fleeing in a battle, like Pokémon's catch formula and escape (split from battle.ts in the cleanup of
// 19 ottobre 2026). Numbers in data/battle.ts BATTLE.catch and BATTLE.flee. Pure logic.
import { BATTLE } from '../../data/battle';
import { RIDE_TALENTS } from '../../data/beasts';
import { formStars, isGiant, speciesOf } from '../beasts/forms';
import type { Rng } from '../math';
import { you, type BattleState, type Step } from './battle';

/** The chance a tame attempt holds: Pokémon's catch formula (data/battle.ts BATTLE.catch). */
export function tameChance(s: BattleState, strongestLevel: number, bonus = 1): number {
  if (bonus === Infinity) return 1; // the Conchiglia del Re
  const f = s.foe;
  const c = BATTLE.catch;
  let rate = f.form.unique ? c.uniqueRate : (c.rateByStars[speciesOf(f.form).rarity] ?? 45);
  if (!f.form.unique && f.form.variant !== 'comune') rate *= c.variantMult;
  let a = ((3 * f.maxHp - 2 * Math.max(1, f.hp)) * rate * bonus) / (3 * f.maxHp);
  if (f.status) a *= c.statusBonus[f.status] ?? 1;
  a *= Math.pow(c.levelPenalty, Math.max(0, f.level - strongestLevel));
  return Math.max(0, Math.min(1, a / 255));
}

/** A tame attempt: each shake holds with chance^(1/shakes), so all of them hold with `chance`. */
export function tryTame(s: BattleState, rng: Rng, strongestLevel: number, bonus = 1): Step {
  const per = Math.pow(tameChance(s, strongestLevel, bonus), 1 / BATTLE.catch.shakes);
  let shakes = 0;
  while (shakes < BATTLE.catch.shakes && rng() < per) shakes++;
  const caught = shakes === BATTLE.catch.shakes;
  if (caught) s.over = 'caught';
  return { kind: 'tame', shakes, caught };
}

/**
 * The chance to get away: harder from a stronger beast (levels above yours, rarity) and much harder from a
 * giant; easier if you are faster, and a little easier at each new try.
 */
export function fleeChance(s: BattleState): number {
  const f = BATTLE.flee;
  const me = you(s);
  const p =
    f.base +
    (me.stats.spe > s.foe.stats.spe ? f.fasterBonus : 0) +
    f.perTry * s.fleeTries -
    f.perLevelAbove * Math.max(0, s.foe.level - me.level) -
    f.perStar * (formStars(s.foe.form) - 1) -
    (isGiant(s.foe.form) ? f.giant : 0);
  return Math.min(f.max, Math.max(f.min, p));
}

/** The wild beast, afraid of the superpredator you ride, tries to flee instead of attacking (RIDE_TALENTS.fleeChance).
 *  Returns null when it has no try left; true if it got away (the battle is over, nothing tamed, nothing learnt). */
export function foeTriesFlee(s: BattleState, rng: Rng): boolean | null {
  if (s.foeFleeTries <= 0) return null;
  s.foeFleeTries--;
  const ok = rng() < RIDE_TALENTS.fleeChance;
  if (ok) s.over = 'escaped';
  return ok;
}

export function tryFlee(s: BattleState, rng: Rng): boolean {
  const p = fleeChance(s);
  s.fleeTries++;
  const ok = rng() < p;
  if (ok) s.over = 'fled';
  return ok;
}
