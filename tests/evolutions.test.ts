// The first evolutions outside the starter lines (owner, 3 ottobre 2026): the pufferfish and the humphead wrasse.
import { describe, expect, it } from 'vitest';
import { SPECIES, UNIQUE_VARIANTS } from '../src/data/species';
import { ART_KEYS, BATTLE_ART_KEYS, SPRITE_KEYS } from '../src/data/sprites.generated';
import { raiseLevel } from '../src/systems/beasts/growth';
import { makeTeamBeast, movesFor } from '../src/systems/beasts/team';
import type { GameEvent } from '../src/systems/events';

const speciesOf = (id: string) => SPECIES.find((s) => s.id === id)!;

describe('evolutions of the sea', () => {
  for (const [from, to] of [
    ['pesce_palla', 'istrice_gigante'],
    ['pesce_napoleone', 'napoleone_corazzato'],
  ] as const)
    it(`${from} becomes ${to} at its level and keeps its moves`, () => {
      const b = makeTeamBeast('b1', { speciesId: from, variant: 'comune' }, 5, true);
      const moves = movesFor(b).map((m) => m.move.id);
      const events: GameEvent[] = [];
      raiseLevel(b, speciesOf(from).evolveLevel! - b.level, events);
      expect(b.form.speciesId).toBe(to);
      expect(events.some((e) => e.type === 'evolved')).toBe(true);
      expect(movesFor(b).map((m) => m.move.id)).toEqual(moves);
      expect(speciesOf(to).lengthM).toBeGreaterThan(speciesOf(from).lengthM);
      expect(ART_KEYS).toContain(to);
      expect(SPRITE_KEYS).toContain(to);
      expect(BATTLE_ART_KEYS).toContain(`${to}_front`);
      expect(BATTLE_ART_KEYS).toContain(`${to}_back`);
    });

  it('the alfa of eight species and the ghost beluga have their own pictures', () => {
    for (const id of [
      'elefante_marino_alfa',
      'tricheco_alfa',
      'rana_pescatrice_alfa',
      'squalo_capopiatto_alfa',
      'pesce_vela_alfa',
      'pastinaca_alfa',
      'torpedine_alfa',
      'squalo_volpe_alfa',
      'beluga_spettro',
    ]) {
      expect(ART_KEYS, id).toContain(id);
      expect(SPRITE_KEYS, id).toContain(id);
      expect(BATTLE_ART_KEYS, id).toContain(`${id}_front`);
      expect(BATTLE_ART_KEYS, id).toContain(`${id}_back`);
    }
    expect(UNIQUE_VARIANTS.find((u) => u.id === 'beluga_spettro')?.speciesId).toBe('beluga');
  });
});
