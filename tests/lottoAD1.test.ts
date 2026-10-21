// Lot AD-1 (21 ottobre 2026): the types made clear. The wheel is a perfect cycle (each beats the next and the one
// three after it, and loses to the other two), every win has its sentence, the sheet says what a beast beats and what
// beats it exactly as the battle counts it, and the dolphin is Glaciale with its own moves.
import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/data/moves';
import { TYPES, typeMultiplier, weakAgainst, type TypeId } from '../src/data/rules';
import { SPECIES } from '../src/data/species';
import { buildSheet } from '../src/systems/beasts/sheet';

const RING: TypeId[] = ['predatore', 'abissale', 'glaciale', 'tempesta', 'corazzato'];

describe('the wheel of the types (owner: "chiaro cosa batte cosa… logica spotless")', () => {
  it('each type beats the next and the one three after it, and loses to the other two', () => {
    RING.forEach((t, i) => {
      expect([...TYPES[t].beats].sort()).toEqual([RING[(i + 1) % 5]!, RING[(i + 3) % 5]!].sort());
      expect(weakAgainst(t).sort()).toEqual([RING[(i + 2) % 5]!, RING[(i + 4) % 5]!].sort());
    });
  });

  it('every win has its own sentence', () => {
    for (const t of RING) {
      expect(TYPES[t].beatsWhy).toHaveLength(2);
      for (const w of TYPES[t].beatsWhy) expect(w.length).toBeGreaterThan(10);
    }
  });

  it("a beast's sheet says what it beats and what beats it, as the battle counts it", () => {
    for (const s of SPECIES) {
      if (s.type === 'variabile') continue;
      const sheet = buildSheet({ speciesId: s.id, variant: 'comune' });
      for (const t of sheet.strongAgainst) expect(typeMultiplier(s.type, t)).toBeGreaterThan(1);
      for (const t of sheet.weakAgainst) expect(typeMultiplier(t, s.type)).toBeGreaterThan(1);
      expect(sheet.strongAgainst).toHaveLength(2);
      expect(sheet.weakAgainst).toHaveLength(2);
    }
  });
});

describe('the dolphin follows the rule (a sea mammal: Glaciale)', () => {
  it('is Glaciale, and so are its own moves', () => {
    expect(SPECIES.find((s) => s.id === 'delfino')!.type).toBe('glaciale');
    const own = MOVES.filter((x) => x.species === 'delfino');
    expect(own).toHaveLength(3);
    for (const m of own) expect(m.type).toBe('glaciale');
  });
});
