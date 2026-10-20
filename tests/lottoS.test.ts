// Lot S (20 ottobre 2026): quick fixes. The final forms a little over each species' wild levels, no dens on the chart.
import { describe, expect, it } from 'vitest';
import { HUNTS } from '../src/data/hunts';
import { PROGRESSION } from '../src/data/rules';
import { SPECIES } from '../src/data/species';
import { chartAround } from '../src/systems/chart';
import {
  finalFormLevelOf,
  formLengthM,
  formName,
  hasFinalForm,
  wildLevelRange,
} from '../src/systems/beasts/forms';
import { finalFormAt } from '../src/systems/beasts/growth';
import { createGame } from '../src/systems/game';
import { generateWorld } from '../src/systems/world/worldGen';

const iconic = SPECIES.filter((s) => hasFinalForm(s.id, 'comune'));

describe('the final forms', () => {
  it('each species reaches it about 18 levels over the top of its wild levels, never past the top level', () => {
    for (const s of iconic) {
      const top = wildLevelRange({ speciesId: s.id, variant: 'comune' })[1];
      const at = finalFormLevelOf(s.id);
      expect(at, s.id).toBe(Math.min(PROGRESSION.maxLevel, top + PROGRESSION.finalFormOverWild));
      expect(at, s.id).toBeLessThan(PROGRESSION.maxLevel); // reachable (owner: 100 was not)
    }
    expect(finalFormLevelOf('manta')).toBeLessThan(finalFormLevelOf('megalodonte'));
  });

  it('it comes at that level, not one before', () => {
    const at = finalFormLevelOf('squalo_bianco');
    expect(finalFormAt({ speciesId: 'squalo_bianco', variant: 'comune' }, at - 1)).toBeNull();
    expect(finalFormAt({ speciesId: 'squalo_bianco', variant: 'comune' }, at)).toEqual({
      speciesId: 'squalo_bianco',
      variant: 'comune',
      final: true,
    });
  });

  it('a beast never shrinks on its way to an early final form', () => {
    for (const s of iconic)
      for (let level = 1; level < finalFormLevelOf(s.id); level++)
        expect(formLengthM({ speciesId: s.id, variant: 'comune' }, level), s.id).toBeGreaterThanOrEqual(
          s.lengthM,
        );
  });

  it("the humpback whale's final form is the Megattera Titanica", () => {
    expect(formName({ speciesId: 'megattera', variant: 'comune', final: true })).toBe('Megattera Titanica');
  });
});

describe('the cockpit chart', () => {
  it('shows no legend dens, even after their echo (owner: "da togliere")', () => {
    const g = createGame(generateWorld(), null, 3);
    for (const h of HUNTS) g.hunts[h.id] = { heard: true, echo: true };
    const kinds = chartAround(g).marks.map((m) => m.kind as string);
    expect(kinds).not.toContain('den');
    expect(kinds).not.toContain('target');
  });
});
