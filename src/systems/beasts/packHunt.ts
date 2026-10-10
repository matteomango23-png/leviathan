// Packs that hunt (block 5b, owner 9 ottobre 2026: "you see it hunting"). The pack hunters (barracuda, orcas, tuna,
// dolphins) wandering near a sardine school go after it and bite the fish their mouth touches, and the sardines flee
// from them; orcas chase wild beasts far smaller than themselves, which flee (only a chase: nobody is eaten, so no
// beast you could catch is lost). Pure logic, data/beasts.ts PACK_RULES.
import { PACK_RULES } from '../../data/beasts';
import type { BeastState } from '../beastState';
import { takeFish, type FishState } from '../fish';
import { isInWater, type WildBeast } from './wildState';

export interface HuntWorld {
  beasts: Pick<BeastState, 'wilds'>;
  fish: FishState;
}

const P = PACK_RULES;
const isHunter = (w: WildBeast): boolean => P.hunters.includes(w.form.speciesId);

/** What it looks for: a far smaller beast (orcas), or the nearest sardine school. */
function pick(g: HuntWorld, h: WildBeast): WildBeast['hunt'] {
  const ratio = P.preyOf[h.form.speciesId];
  if (ratio) {
    let best: WildBeast | null = null;
    let bestD = P.preyRange;
    for (const w of g.beasts.wilds) {
      if (w === h || !isInWater(w) || w.boss || w.length > h.length * ratio) continue;
      const d = Math.hypot(w.x - h.x, w.y - h.y);
      if (d < bestD) [best, bestD] = [w, d];
    }
    if (best) return { x: best.x, y: best.y, prey: best.id };
  }
  let school = -1;
  let bestD = P.huntRange;
  g.fish.schools.forEach((s, i) => {
    const d = Math.hypot(s.x - h.x, s.y - h.y);
    if (d < bestD) [school, bestD] = [i, d];
  });
  return school < 0 ? null : { x: g.fish.schools[school]!.x, y: g.fish.schools[school]!.y, school };
}

/** One step: hunters look for prey now and then, follow it, bite; the hunted flee. Returns the hunters after fish
 *  (the sardines flee from them). */
export function stepPackHunt(g: HuntWorld, dt: number): { x: number; y: number }[] {
  const chasers: { x: number; y: number }[] = [];
  for (const w of g.beasts.wilds) w.fleeFrom = null;
  for (const h of g.beasts.wilds) {
    if (!isInWater(h) || !isHunter(h) || h.mood !== 'wander' || h.drawn) {
      h.hunt = null;
      continue;
    }
    h.lookT -= dt;
    if (h.lookT <= 0) {
      h.lookT = P.lookSeconds;
      h.hunt = pick(g, h);
    }
    const hunt = h.hunt;
    if (!hunt) continue;
    if (hunt.prey !== undefined) {
      const prey = g.beasts.wilds.find((w) => w.id === hunt.prey);
      if (!prey || !isInWater(prey) || Math.hypot(prey.x - h.x, prey.y - h.y) > P.preyRange * 1.5) {
        h.hunt = null;
        continue;
      }
      Object.assign(hunt, { x: prey.x, y: prey.y });
      prey.fleeFrom = { x: h.x, y: h.y };
      continue;
    }
    const school = g.fish.schools[hunt.school ?? -1];
    if (!school || Math.hypot(school.x - h.x, school.y - h.y) > P.huntRange * 1.5) {
      h.hunt = null;
      continue;
    }
    Object.assign(hunt, { x: school.x, y: school.y });
    chasers.push({ x: h.x, y: h.y });
    // the mouth: a fish there is bitten
    const mx = h.x + h.face * h.length * 0.45;
    for (const f of g.fish.fish) {
      if (!f.alive || f.hooked || f.school !== school) continue;
      if (Math.hypot(f.x - mx, f.y - h.y) > P.biteRadius) continue;
      takeFish(f);
      h.jaw = 0.3;
      break;
    }
  }
  return chasers;
}
