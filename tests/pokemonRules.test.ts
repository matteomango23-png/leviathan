// The battle rules copied from Pokémon (owner, 3 ottobre 2026): statistics formula, individual values, type chart.
import { describe, expect, it } from 'vitest';
import { TYPES, typeMultiplier, type TypeId } from '../src/data/rules';
import { SPECIES } from '../src/data/species';
import { BASE_TOTAL, baseStatsOf, ivsOf, STAT_IDS, statsAt } from '../src/data/stats';
import { migrate } from '../src/systems/save/saveData';

describe('Pokémon rules', () => {
  it('computes statistics with the Pokémon formula', () => {
    const src = { role: 'compagno', size: 'media', rarity: 3, type: 'predatore' } as const;
    const base = baseStatsOf(src);
    const s = statsAt(src, 50, 'comune', 1, 0);
    const iv = ivsOf(0);
    expect(s.hp).toBe(Math.floor(((2 * base.hp + iv.hp) * 50) / 100) + 50 + 10);
    expect(s.atk).toBe(Math.floor(((2 * base.atk + iv.atk) * 50) / 100) + 5);
  });

  it('gives every species six base statistics adding up to its stars’ total', () => {
    for (const sp of SPECIES) {
      const b = baseStatsOf(sp);
      const sum = STAT_IDS.reduce((a, k) => a + b[k], 0);
      expect(Math.abs(sum - BASE_TOTAL[sp.rarity]), sp.id).toBeLessThanOrEqual(3);
      for (const k of STAT_IDS) expect(b[k], `${sp.id} ${k}`).toBeGreaterThan(20);
    }
  });

  it('individual values are 0–31 and the same for the same seed', () => {
    expect(ivsOf(42)).toEqual(ivsOf(42));
    expect(ivsOf(42)).not.toEqual(ivsOf(43));
    for (let seed = 0; seed < 200; seed++)
      for (const v of Object.values(ivsOf(seed))) expect(v >= 0 && v <= 31).toBe(true);
  });

  it('every type is super effective on two types and not very effective on two', () => {
    const ids = Object.keys(TYPES) as TypeId[];
    for (const a of ids) {
      const m = ids.map((d) => typeMultiplier(a, d));
      expect(
        m.filter((x) => x === 2),
        a,
      ).toHaveLength(2);
      expect(
        m.filter((x) => x === 0.5),
        a,
      ).toHaveLength(2);
    }
  });

  it('an old save comes back with its beasts healed (v13)', () => {
    const s = migrate({ game: 'leviatano', version: 12, team: [{ uid: 'b1', hp: 3, ko: true }] }) as {
      team: { hp: number; ko: boolean }[];
    };
    expect(s.team[0]!.ko).toBe(false);
    expect(s.team[0]!.hp).toBeGreaterThan(1e6);
  });
});
