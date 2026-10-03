import { describe, expect, it } from 'vitest';
import { BATTLE } from '../src/data/battle';
import {
  chooseFoeMove,
  createBattle,
  endRound,
  firstSide,
  foeCanBeDodged,
  switchTo,
  tameChance,
  tryTame,
  useMove,
  you,
} from '../src/systems/battle/battle';
import { judgeDodge, makeDodgeRing, ringProgress } from '../src/systems/battle/dodge';
import { canUse, makeFighter } from '../src/systems/battle/fighter';
import { makeRng } from '../src/systems/math';

const shark = (level: number) => makeFighter({ speciesId: 'squalo_bianco', variant: 'comune' }, level);
const barracuda = (level: number) => makeFighter({ speciesId: 'barracuda', variant: 'comune' }, level);

describe('moves and damage', () => {
  it('moves unlock at 1, 7, 15 and spend PP, like Pokémon', () => {
    const f = shark(7);
    expect(f.moves.map((m) => m.unlocked)).toEqual([true, true, false]);
    const m = f.moves[1]!;
    expect(m.pp).toBe(m.maxPp);
    const s = createBattle([f], barracuda(5));
    s.foe.hp = s.foe.maxHp = 9999;
    for (let i = 0; i < m.maxPp; i++) useMove(s, 'you', 1, makeRng(i));
    expect(m.pp).toBe(0);
    expect(canUse(m)).toBe(false);
  });

  it('levels matter: a higher level hits harder (through the formula and the statistics)', () => {
    const avg = (att: number, def: number): number => {
      let t = 0;
      for (let i = 0; i < 200; i++) {
        const s = createBattle([shark(att)], shark(def));
        s.foe.hp = 999;
        s.foe.maxHp = 999;
        useMove(s, 'you', 0, makeRng(i));
        t += 999 - s.foe.hp;
      }
      return t / 200;
    };
    expect(avg(10, 5)).toBeGreaterThan(avg(5, 10) * 1.5);
  });

  it('a perfect dodge takes no damage, a graze half', () => {
    const hit = (dodge: 'perfect' | 'graze' | 'none'): number => {
      const s = createBattle([shark(5)], shark(5));
      useMove(s, 'foe', 0, makeRng(3), dodge);
      return you(s).maxHp - you(s).hp;
    };
    expect(hit('perfect')).toBe(0);
    expect(hit('graze')).toBeLessThan(hit('none'));
  });

  it('the faster beast acts first; switching always comes first', () => {
    const s = createBattle([shark(5), barracuda(5)], barracuda(5));
    s.foeMove = 0;
    const fast = you(s).stats.spe > s.foe.stats.spe ? 'you' : 'foe';
    expect(firstSide(s, { kind: 'move', index: 0 }, makeRng(1))).toBe(fast);
    expect(firstSide(s, { kind: 'switch', index: 1 }, makeRng(1))).toBe('you');
    expect(switchTo(s, 1)).toHaveLength(1);
    expect(s.active).toBe(1);
  });

  it('the wild beast picks a ready move; grabs cannot be dodged', () => {
    const s = createBattle([shark(5)], barracuda(15));
    const i = chooseFoeMove(s, makeRng(4));
    expect(canUse(s.foe.moves[i]!)).toBe(true);
    s.foeMove = 0;
    expect(foeCanBeDodged(s)).toBe(true);
  });

  it('fainting ends the battle', () => {
    const s = createBattle([shark(20)], barracuda(2));
    s.foe.hp = 1;
    const steps = useMove(s, 'you', 0, makeRng(1));
    expect(steps.some((x) => x.kind === 'faint' && x.side === 'foe')).toBe(true);
    endRound(s);
    expect(s.over).toBe('won');
  });
});

describe('taming like a Poké Ball', () => {
  it('is harder for rarer beasts and easier when worn out', () => {
    const common = createBattle([shark(5)], barracuda(5));
    const rare = createBattle([shark(5)], makeFighter({ speciesId: 'barracuda', variant: 'albino' }, 5));
    expect(tameChance(rare, 5)).toBeLessThan(tameChance(common, 5));
    const fresh = tameChance(common, 5);
    common.foe.hp = 1;
    expect(tameChance(common, 5)).toBeGreaterThan(fresh * 2);
    const strong = createBattle([shark(5)], barracuda(12));
    expect(tameChance(strong, 5)).toBeLessThan(fresh);
  });

  it('the shell shakes three times and then holds', () => {
    const s = createBattle([shark(5)], barracuda(5));
    s.foe.hp = 1;
    const step = tryTame(s, () => 0, 5);
    expect(step).toEqual({ kind: 'tame', shakes: BATTLE.catch.shakes, caught: true });
    expect(s.over).toBe('caught');
    const miss = createBattle([shark(5)], barracuda(5));
    expect(tryTame(miss, () => 0.999, 5)).toEqual({ kind: 'tame', shakes: 0, caught: false });
  });
});

describe('the dodge ring', () => {
  it('only a tap right when it touches is perfect', () => {
    const r = makeDodgeRing(makeRng(5));
    expect(judgeDodge(r, r.closeAt)).toBe('perfect');
    expect(judgeDodge(r, r.closeAt + BATTLE.dodge.perfectSeconds * 1.5)).toBe('graze');
    expect(judgeDodge(r, r.closeAt - 0.5)).toBe('none');
    expect(judgeDodge(r, null)).toBe('none');
    expect(ringProgress(r, 0)).toBe(0);
    expect(ringProgress(r, r.closeAt)).toBeCloseTo(1);
  });

  it('a feint stops the ring for a moment', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = makeDodgeRing(makeRng(seed));
      if (!r.pauseFor) continue;
      expect(ringProgress(r, r.pauseFrom + r.pauseFor * 0.5)).toBeCloseTo(ringProgress(r, r.pauseFrom));
      return;
    }
    throw new Error('no feint in 50 rings');
  });
});
