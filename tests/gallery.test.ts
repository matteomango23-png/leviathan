// The test gallery (lot Q, 19 ottobre 2026): every beast with pictures, in the sea, as an opponent, as a companion.
import { describe, expect, it } from 'vitest';
import { PROGRESSION } from '../src/data/rules';
import { GAME_SPECIES } from '../src/data/species';
import { ART_KEYS, SPRITE_KEYS } from '../src/data/sprites.generated';
import { artKeysOf, formKey } from '../src/systems/beasts/forms';
import { teamMembers } from '../src/systems/beasts/team';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import {
  fightIt,
  galleryForms,
  galleryLevel,
  makeCompanion,
  newGalleryState,
  setUpGallery,
  showInSea,
} from '../src/systems/gallery';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const fresh = () => {
  const g = createGame(map, null, 3);
  setUpGallery(g);
  return g;
};

describe('the forms of the gallery', () => {
  const forms = galleryForms();

  it('every species of the game, no doubles; albinos, alphas, finals and uniques only with pictures', () => {
    const keys = forms.map(formKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of GAME_SPECIES) expect(forms.some((f) => f.speciesId === s.id)).toBe(true);
    // (a species with no pictures yet, like the Kraken, is shown as the game draws it meanwhile)
    const pictured = (k: string) => ART_KEYS.includes(k) || SPRITE_KEYS.includes(k);
    for (const f of forms.filter((x) => x.variant !== 'comune' || x.final || x.unique))
      expect(artKeysOf(f).some(pictured), formKey(f)).toBe(true);
  });

  it('final forms at their level, the matriarch, the Sfregiato and the albinos are there', () => {
    expect(forms.some((f) => f.unique === 'sfregiato')).toBe(true);
    expect(forms.some((f) => f.speciesId === 'orca' && f.variant === 'alfa')).toBe(true);
    expect(forms.some((f) => f.variant === 'albino')).toBe(true);
    const fin = forms.find((f) => f.final)!;
    expect(galleryLevel(fin)).toBe(PROGRESSION.finalFormLevel);
  });
});

describe('the three tries', () => {
  it('the throwaway game starts in the water with a fighter, no story', () => {
    const g = fresh();
    expect(teamMembers(g.beasts.team)).toHaveLength(1);
    expect(g.diver.y).toBeGreaterThan(g.map.surfaceY);
    expect(g.story.step).toBe('off');
  });

  it('in the sea: it appears calm; the next one takes its place', () => {
    const g = fresh();
    const s = newGalleryState();
    showInSea(g, s, { speciesId: 'orca', variant: 'comune' });
    const w = g.beasts.wilds.find((x) => x.id === s.wildId)!;
    expect(formKey(w.form)).toBe('orca');
    expect(w.calm).toBeGreaterThan(60);
    showInSea(g, s, { speciesId: 'squalo_tigre', variant: 'comune' });
    expect(w.motion === 'gone' || formKey(w.form) === 'squalo_tigre').toBe(true);
  });

  it('as an opponent: the battle opens with that form', () => {
    const g = fresh();
    const events: GameEvent[] = [];
    fightIt(g, newGalleryState(), { speciesId: 'tricheco', variant: 'comune' }, events);
    expect(events.some((e) => e.type === 'battleStart')).toBe(true);
    const w = g.beasts.wilds.find((x) => x.id === g.beasts.battle!.wildId)!;
    expect(formKey(w.form)).toBe('tricheco');
  });

  it('as a companion: in the team in place of the last one, never more than the fighter and one', () => {
    const g = fresh();
    const s = newGalleryState();
    const events: GameEvent[] = [];
    for (const id of ['orca', 'manta', 'tricheco'])
      makeCompanion(g, s, { speciesId: id, variant: 'comune' }, events);
    const team = teamMembers(g.beasts.team);
    expect(team).toHaveLength(2);
    expect(team.some((b) => b.form.speciesId === 'tricheco')).toBe(true);
  });
});
