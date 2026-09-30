import { describe, expect, it } from 'vitest';
import { SPECIES, UNIQUE_VARIANTS, statsAt } from '../src/data/species';
import { MOVES, movesOf } from '../src/data/moves';
import { FISH, REGIONS, SKINS, SWARMS, WEAPONS } from '../src/data/world';
import { PROGRESSION, TYPES, typeMultiplier } from '../src/data/rules';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('kit data integrity', () => {
  it('has 34 beasts with unique ids', () => {
    expect(SPECIES).toHaveLength(34);
    expect(unique(SPECIES.map((s) => s.id))).toBe(true);
  });

  it('has 102 moves, exactly 3 per beast, one per unlock slot', () => {
    expect(MOVES).toHaveLength(102);
    expect(unique(MOVES.map((m) => m.id))).toBe(true);
    for (const s of SPECIES) {
      expect(movesOf(s.id).map((m) => m.slot)).toEqual([1, 2, 3]);
    }
  });

  it('only references beasts that exist', () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    for (const m of MOVES) expect(ids.has(m.species)).toBe(true);
    for (const v of UNIQUE_VARIANTS) expect(ids.has(v.speciesId)).toBe(true);
    for (const sk of SKINS) expect(ids.has(sk.species)).toBe(true);
  });

  it('only references regions and fish that exist', () => {
    const regions = new Set(REGIONS.map((r) => r.id));
    const fish = new Set(FISH.map((f) => f.id));
    for (const s of SPECIES) expect(regions.has(s.region)).toBe(true);
    for (const sw of SWARMS) expect(regions.has(sw.region)).toBe(true);
    for (const r of REGIONS) for (const f of r.fish) expect(fish.has(f)).toBe(true);
    expect(FISH).toHaveLength(12);
    expect(SWARMS).toHaveLength(4);
  });

  it('guardians are real beasts or unique variants', () => {
    const ids = new Set([...SPECIES.map((s) => s.id), ...UNIQUE_VARIANTS.map((v) => v.id)]);
    for (const r of REGIONS) if (r.guardian) expect(ids.has(r.guardian)).toBe(true);
  });

  it('has the base harpoon as a weapon', () => {
    expect(WEAPONS.find((w) => w.id === 'arpione')).toBeDefined();
  });

  it('keeps the five-type circle consistent', () => {
    expect(Object.keys(TYPES)).toHaveLength(5);
    expect(typeMultiplier('predatore', 'abissale')).toBeGreaterThan(1);
    expect(typeMultiplier('abissale', 'predatore')).toBeLessThan(1);
    expect(typeMultiplier('predatore', 'predatore')).toBe(1);
  });

  it('computes growing stats', () => {
    const shark = SPECIES.find((s) => s.id === 'squalo_bianco');
    expect(shark).toBeDefined();
    const lv1 = statsAt(shark!, 1);
    const lvMax = statsAt(shark!, PROGRESSION.maxLevel);
    expect(lvMax.hp).toBeGreaterThan(lv1.hp);
  });
});
