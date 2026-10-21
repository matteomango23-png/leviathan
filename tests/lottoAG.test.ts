// Lot AG (21 ottobre 2026): the evolution dots on the sheets. Folgore's Saetta was a black dot you could not tap:
// a beast of yours knows the forms it grew from; every form of every line has a painting; a form not met yet is
// blurred, and tapping it opens its sheet blurred.
import { describe, expect, it } from 'vitest';
import { ART_KEYS } from '../src/data/sprites.generated';
import { GAME_SPECIES } from '../src/data/species';
import { bestiaryEntries, evolutionLine, knowsForm } from '../src/systems/beasts/bestiaryEntries';
import { formKey, type BeastForm } from '../src/systems/beasts/forms';
import { makeTeamBeast } from '../src/systems/beasts/team';

const F = (speciesId: string, extra: Partial<BeastForm> = {}): BeastForm => ({
  speciesId,
  variant: 'comune',
  ...extra,
});

describe('i pallini delle evoluzioni (proprietario: "non deve succedere per nessuno")', () => {
  it('con Folgore in squadra conosci Scintilla e Saetta, anche senza averle viste in mare', () => {
    const g = { seen: new Set<string>(), beasts: { team: [makeTeamBeast('f', F('folgore'), 40, true)] } };
    expect(knowsForm(F('scintilla'), g)).toBe(true);
    expect(knowsForm(F('saetta'), g)).toBe(true);
    expect(knowsForm(F('folgore'), g)).toBe(true);
  });

  it('con Saetta conosci Scintilla, non ancora Folgore', () => {
    const g = { seen: new Set<string>(), beasts: { team: [makeTeamBeast('s', F('saetta'), 20, true)] } };
    expect(knowsForm(F('scintilla'), g)).toBe(true);
    expect(knowsForm(F('folgore'), g)).toBe(false);
  });

  it('ogni forma di ogni linea ha la sua illustrazione (nessun pallino nero)', () => {
    const forms = new Map<string, BeastForm>();
    for (const s of GAME_SPECIES) for (const f of evolutionLine(F(s.id))) forms.set(formKey(f), f);
    for (const e of bestiaryEntries()) for (const f of evolutionLine(e.form)) forms.set(formKey(f), f);
    const lines = [...forms.values()].filter((f) => evolutionLine(f).length > 1);
    expect(lines.length).toBeGreaterThan(5);
    for (const f of lines) expect(ART_KEYS, formKey(f)).toContain(formKey(f));
  });
});
