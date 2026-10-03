// Owner's feedback of 3 ottobre 2026: a level 1 barracuda took a fifth of a level 11 Guscio's health, and Guscio's
// moves did almost nothing. Health and bite are ×10 now (a scratch is 1 of ~100) and levels weigh more.
import { describe, expect, it } from 'vitest';
import { movesOf } from '../src/data/moves';
import { hitDamage, makeFighter } from '../src/systems/battle/fighter';
import { migrate } from '../src/systems/save/saveData';

const rng = () => 0.5;
const fighter = (id: string, level: number) => makeFighter({ speciesId: id, variant: 'comune' }, level);

describe('battle balance', () => {
  it('a level 1 beast barely scratches a level 11 one', () => {
    const guscio = fighter('guscio', 11);
    const barracuda = fighter('barracuda', 1);
    for (const m of movesOf('barracuda')) {
      const hit = hitDamage(barracuda, guscio, m, rng, false).damage;
      expect(hit / guscio.maxHp, m.name).toBeLessThan(0.08);
    }
  });

  it('a level 11 Guscio beats a level 1 barracuda in two hits of its first move', () => {
    const guscio = fighter('guscio', 11);
    const barracuda = fighter('barracuda', 1);
    const first = movesOf('guscio')[0]!;
    expect(hitDamage(guscio, barracuda, first, rng, false).damage * 2).toBeGreaterThanOrEqual(
      barracuda.maxHp,
    );
  });

  it('every move of Guscio hurts', () => {
    const guscio = fighter('guscio', 11);
    const foe = fighter('tonno', 11);
    for (const m of movesOf('guscio'))
      expect(hitDamage(guscio, foe, m, rng, false).damage, m.name).toBeGreaterThan(0);
  });

  it('an old save keeps its beasts as healthy as they were (v12: health × 10)', () => {
    const old = migrate({ game: 'leviatano', version: 11, team: [{ uid: 'b1', hp: 5 }] }) as {
      team: { hp: number }[];
    };
    expect(old.team[0]!.hp).toBe(50);
  });
});
