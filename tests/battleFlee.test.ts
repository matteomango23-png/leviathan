import { describe, expect, it } from 'vitest';
import { BATTLE } from '../src/data/battle';
import { createBattle, fleeChance } from '../src/systems/battle/battle';
import { makeFighter } from '../src/systems/battle/fighter';

const shark = (level: number) => makeFighter({ speciesId: 'squalo_bianco', variant: 'comune' }, level);

describe('fleeing depends on how strong the wild beast is', () => {
  it('is easy from a common beast of your level', () => {
    const s = createBattle([shark(8)], makeFighter({ speciesId: 'barracuda', variant: 'comune' }, 8));
    expect(fleeChance(s)).toBeGreaterThan(0.6);
  });

  it('is harder from a beast above your level', () => {
    const same = createBattle([shark(8)], shark(8));
    const above = createBattle([shark(8)], shark(14));
    expect(fleeChance(above)).toBeLessThan(fleeChance(same) - 0.3);
  });

  it('is almost impossible from a legendary giant, but each try helps a little', () => {
    const s = createBattle(
      [shark(8)],
      makeFighter({ speciesId: 'squalo_bianco', variant: 'albino', final: true }, 10),
    );
    const first = fleeChance(s);
    expect(first).toBe(BATTLE.flee.min);
    s.fleeTries = 4;
    expect(fleeChance(s)).toBeGreaterThan(first);
  });
});
