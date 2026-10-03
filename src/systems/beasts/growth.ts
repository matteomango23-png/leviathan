// Experience, levels and growth of tamed beasts (GDD "Livelli", "Crescita e forma finale"), the Pokémon way:
// growth groups and the Gen V scaled experience (data/progression.ts).
// Up to level 30 experience is enough; from 31 each level also needs a full nourishment bar (fish eaten).
// At level 50 iconic species take their final form (the albino its own, where it has one; never the alfa).
import { GROWTH_BY_STARS, GROWTH_CURVES, XP_RULES, scaledXp, type GrowthGroup } from '../../data/progression';
import { PROGRESSION } from '../../data/rules';
import type { GameEvent } from '../events';
import { speciesOf, type BeastForm } from './forms';
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import { learnMove, movesLearnedAt } from './battleMoves';
import { maxHpOf, type TeamBeast } from './team';

/** XP needed to go from the beast's level to the next. */
export const xpToNext = (b: TeamBeast): number => xpBetween(growthOf(b.form), b.level);

/** The growth group of a beast's species. */
export function growthOf(form: BeastForm): GrowthGroup {
  const s = speciesOf(form);
  return s.growth ?? GROWTH_BY_STARS[s.rarity];
}

/** Experience from level `level` to the next, in a growth group. */
export const xpBetween = (g: GrowthGroup, level: number): number =>
  Math.max(1, GROWTH_CURVES[g](level + 1) - GROWTH_CURVES[g](level));

/** The next level needs nourishment (levels 31–50). */
export const needsFood = (b: TeamBeast): boolean =>
  b.level < PROGRESSION.maxLevel && b.level + 1 >= PROGRESSION.growthStartLevel;

/** It still has room in its nourishment bar. */
export const isHungry = (b: TeamBeast): boolean =>
  needsFood(b) && b.food < PROGRESSION.nourishmentPerGrowthLevel;

/** XP for beating a wild beast of this form and level, for a beast of level `own` (Gen V scaled). */
export function xpReward(form: BeastForm, level: number, own: number, guardian = false): number {
  let xp = scaledXp(XP_RULES.yieldByStars[speciesOf(form).rarity], level, own);
  if (form.variant !== 'comune') xp *= XP_RULES.variantMult;
  if (guardian) xp *= XP_RULES.guardianMult;
  return Math.round(xp);
}

/** XP for a small fish caught or eaten, for a beast of this level. */
export const fishXp = (level: number): number => scaledXp(XP_RULES.fishYield, level, level);

/** Level 50 of an iconic species: its final form (none for the alfa, the albino only where defined). */
export function finalFormAt(form: BeastForm, level: number): BeastForm | null {
  if (level < PROGRESSION.finalFormLevel || form.final || form.unique) return null;
  const s = speciesOf(form);
  if (!s.iconic || form.variant === 'alfa') return null;
  if (form.variant === 'albino' && !s.albinoFinalFormName) return null;
  return { ...form, final: true };
}

function levelUp(b: TeamBeast, events: GameEvent[]): void {
  const before = maxHpOf(b);
  b.level++;
  const final = finalFormAt(b.form, b.level);
  if (final) b.form = final;
  // a starter line evolves, like Pokémon: same beast, new species (it keeps its moves)
  const sp = speciesOf(b.form);
  const from = sp.name;
  const evolves = sp.evolvesTo && sp.evolveLevel !== undefined && b.level >= sp.evolveLevel;
  if (evolves) b.form = { ...b.form, speciesId: sp.evolvesTo! };
  b.hp = Math.min(maxHpOf(b), b.hp + (maxHpOf(b) - before));
  // its new battle moves, like Pokémon: into a free slot, or waiting for you to choose what to forget
  const learned: string[] = [];
  for (const id of movesLearnedAt(b.form, b.level, !!evolves)) {
    if (b.known.includes(id)) continue;
    if (learnMove(b, id)) learned.push(BATTLE_MOVE_BY_ID[id]!.name);
    else if (!b.pendingMoves?.includes(id)) (b.pendingMoves ??= []).push(id);
  }
  events.push({ type: 'levelUp', uid: b.uid, level: b.level, move: learned.join(', ') || undefined });
  if (final) events.push({ type: 'finalForm', uid: b.uid });
  if (evolves) events.push({ type: 'evolved', uid: b.uid, from, fromId: sp.id });
  for (const id of b.pendingMoves ?? [])
    events.push({ type: 'moveWaiting', uid: b.uid, move: BATTLE_MOVE_BY_ID[id]!.name });
}

/** Adds experience; levels up as many times as it can. Returns the levels gained. */
export function gainXp(b: TeamBeast, amount: number, events: GameEvent[]): number {
  if (b.level >= PROGRESSION.maxLevel) return 0;
  b.xp += Math.max(0, amount);
  let gained = 0;
  while (b.level < PROGRESSION.maxLevel && b.xp >= xpToNext(b)) {
    if (needsFood(b)) {
      if (b.food < PROGRESSION.nourishmentPerGrowthLevel) {
        b.xp = xpToNext(b); // full, waiting to eat
        break;
      }
      b.food -= PROGRESSION.nourishmentPerGrowthLevel;
    }
    b.xp -= xpToNext(b);
    levelUp(b, events);
    gained++;
  }
  if (b.level >= PROGRESSION.maxLevel) b.xp = 0;
  return gained;
}

/** One fish into the nourishment bar (only while it needs food). May complete a waiting level. */
export function feedBeast(b: TeamBeast, events: GameEvent[]): boolean {
  if (!isHungry(b)) return false;
  b.food++;
  events.push({ type: 'beastFed', uid: b.uid, food: b.food });
  gainXp(b, 0, events);
  return true;
}

/** Straight to the next level (Krill dorato, test panel): no experience or food needed. */
export function raiseLevel(b: TeamBeast, levels: number, events: GameEvent[]): number {
  let n = 0;
  while (n < levels && b.level < PROGRESSION.maxLevel) {
    levelUp(b, events);
    n++;
  }
  b.xp = Math.min(b.xp, xpToNext(b));
  return n;
}
