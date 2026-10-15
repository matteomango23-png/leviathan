// Lotto F, first part (15 ottobre 2026): the owner's new animals, the final forms in bone and armour, the hunts
// of the plesiosaur and the mosasaur.
import { describe, expect, it } from 'vitest';
import { HUNTS } from '../src/data/hunts';
import { LEARNSETS } from '../src/data/learnsets';
import { speciesById } from '../src/data/species';
import { ART_KEYS, BATTLE_ART_KEYS, SPRITE_KEYS } from '../src/data/sprites.generated';
import { formName } from '../src/systems/beasts/forms';

const NEW = [
  'lampuga',
  'pesce_sega',
  'tartaruga_liuto',
  'squalo_balena',
  'squalo_elefante',
  'squalo_pinna_nera',
  'squalo_toro',
  'squalo_leuca',
  'foca_comune',
  'plesiosauro',
];
const FINALS = [
  'squalo_bianco',
  'megattera',
  'capodoglio',
  'coccodrillo_marino',
  'manta',
  'squalo_martello',
  'pesce_spada',
];

describe('lotto F: le bestie nuove', () => {
  it('ognuna ha profilo, card, vista di fronte, mosse da imparare', () => {
    for (const id of [...NEW, 'mosasauro']) {
      expect(speciesById(id), id).toBeDefined();
      expect(SPRITE_KEYS, id).toContain(id);
      expect(ART_KEYS, id).toContain(id);
      expect(BATTLE_ART_KEYS, id).toContain(`${id}_front`);
      expect(LEARNSETS[id]?.length ?? 0, id).toBeGreaterThan(5);
    }
    // the leatherback has no picture from behind yet: the battle uses its card
    for (const id of [...NEW, 'mosasauro'].filter((x) => x !== 'tartaruga_liuto'))
      expect(BATTLE_ART_KEYS, id).toContain(`${id}_back`);
  });

  it('le forme finali hanno le loro immagini e un nome', () => {
    for (const id of FINALS) {
      const s = speciesById(id)!;
      expect(s.iconic, id).toBe(true);
      expect(SPRITE_KEYS, id).toContain(`${id}_finale`);
      expect(ART_KEYS, id).toContain(`${id}_finale`);
      expect(formName({ speciesId: id, variant: 'comune', final: true })).not.toBe(s.name);
    }
    expect(formName({ speciesId: 'pesce_spada', variant: 'comune', final: true })).toBe(
      'Pesce spada Corazzato',
    );
  });

  it('il plesiosauro e il mosasauro si cacciano', () => {
    expect(HUNTS.find((h) => h.form.speciesId === 'plesiosauro')?.region).toBe('mare_blu');
    expect(HUNTS.find((h) => h.form.speciesId === 'mosasauro')?.region).toBe('grandi_fosse');
  });
});
