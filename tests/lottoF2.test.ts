// Corrections to lotto F (owner, 15 ottobre 2026): the "blacktip" is a mako, the dark armoured shark is the final
// form of the white shark's alpha, the bone sperm whale is Moby Dick, the bone crocodile is the albino Nile
// monitor's final form.
import { describe, expect, it } from 'vitest';
import { ART_KEYS, SPRITE_KEYS } from '../src/data/sprites.generated';
import { speciesById } from '../src/data/species';
import { finalFormAt } from '../src/systems/beasts/growth';
import { formName, hasAlbinoArt, hasFinalForm } from '../src/systems/beasts/forms';
import { bestiaryEntries } from '../src/systems/beasts/bestiaryEntries';
import { PROGRESSION } from '../src/data/rules';

const MAX = PROGRESSION.finalFormLevel;

describe('correzioni del lotto F', () => {
  it('lo squalo pinna nera era un mako', () => {
    expect(speciesById('squalo_pinna_nera')).toBeUndefined();
    expect(speciesById('squalo_mako')?.name).toBe('Squalo mako');
    expect(SPRITE_KEYS).toContain('squalo_mako');
  });

  it("l'alfa dello squalo bianco diventa il Re Alfa; il bianco normale resta il Titano", () => {
    const alfa = finalFormAt({ speciesId: 'squalo_bianco', variant: 'alfa' }, MAX);
    expect(alfa).toEqual({ speciesId: 'squalo_bianco', variant: 'alfa', final: true });
    expect(formName(alfa!)).toBe('Squalo bianco Re Alfa');
    expect(formName({ speciesId: 'squalo_bianco', variant: 'comune', final: true })).toBe(
      'Squalo bianco Titano',
    );
    expect(SPRITE_KEYS).toContain('squalo_bianco_alfa_finale');
    expect(ART_KEYS).toContain('squalo_bianco_alfa_finale');
    // other alphas still have no final form
    expect(finalFormAt({ speciesId: 'orca', variant: 'alfa' }, MAX)).toBeNull();
  });

  it('il capodoglio finale è Moby Dick', () => {
    expect(formName({ speciesId: 'capodoglio', variant: 'comune', final: true })).toBe('Moby Dick');
  });

  it("il varano albino cresce nel Varano d'osso; il varano nero no", () => {
    expect(hasFinalForm('varano_nilo', 'albino')).toBe(true);
    expect(hasFinalForm('varano_nilo', 'comune')).toBe(false);
    expect(finalFormAt({ speciesId: 'varano_nilo', variant: 'comune' }, MAX)).toBeNull();
    expect(formName({ speciesId: 'varano_nilo', variant: 'albino', final: true })).toBe('Varano d’osso');
    expect(SPRITE_KEYS).toContain('varano_nilo_albino_finale');
    expect(SPRITE_KEYS).not.toContain('coccodrillo_marino_finale');
  });

  it('nel bestiario: il Re Alfa e il Varano d’osso (il varano albino ha tutte le immagini)', () => {
    const keys = bestiaryEntries()
      .map((e) => e.form)
      .map((f) => `${f.speciesId}:${f.variant}:${!!f.final}`);
    expect(keys).toContain('squalo_bianco:alfa:true');
    expect(keys).toContain('varano_nilo:albino:true');
    expect(hasAlbinoArt('varano_nilo')).toBe(true);
  });
});
