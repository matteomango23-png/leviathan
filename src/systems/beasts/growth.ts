// Experience, levels and growth of tamed beasts (GDD "Livelli", "Crescita e forma finale").
// Up to level 30 experience is enough; from 31 each level also needs a full nourishment bar (fish eaten).
// At level 50 iconic species take their final form (the albino its own, where it has one; never the alfa).
import { XP_RULES } from '../../data/progression';
import { PROGRESSION } from '../../data/rules';
import type { GameEvent } from '../events';
import { speciesOf, type BeastForm } from './forms';
import { maxHpOf, movesFor, type TeamBeast } from './team';

/** XP needed to go from the beast's level to the next. */
export const xpToNext = (b: TeamBeast): number => PROGRESSION.xpCurve(b.level);

/** The next level needs nourishment (levels 31–50). */
export const needsFood = (b: TeamBeast): boolean =>
  b.level < PROGRESSION.maxLevel && b.level + 1 >= PROGRESSION.growthStartLevel;

/** It still has room in its nourishment bar. */
export const isHungry = (b: TeamBeast): boolean =>
  needsFood(b) && b.food < PROGRESSION.nourishmentPerGrowthLevel;

/** XP for exhausting a wild beast of this form and level. */
export function xpReward(form: BeastForm, level: number, guardian = false): number {
  let xp = XP_RULES.rewardBase * Math.pow(level, XP_RULES.rewardPower);
  if (form.variant !== 'comune') xp *= XP_RULES.variantMult;
  if (guardian) xp *= XP_RULES.guardianMult;
  return Math.round(xp);
}

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
  const unlockedBefore = movesFor(b).filter((m) => m.unlocked).length;
  b.level++;
  const fresh = movesFor(b).filter((m) => m.unlocked);
  const move = fresh.length > unlockedBefore ? fresh[fresh.length - 1]!.move.name : undefined;
  const final = finalFormAt(b.form, b.level);
  if (final) b.form = final;
  b.hp = Math.min(maxHpOf(b), b.hp + (maxHpOf(b) - before));
  events.push({ type: 'levelUp', uid: b.uid, level: b.level, move });
  if (final) events.push({ type: 'finalForm', uid: b.uid });
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
