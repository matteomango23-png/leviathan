// The hunter's card, like Pokémon's trainer card: money, bestiary, play time, deepest dive, relics, and the
// Guardians beaten (our badges). Pure data, drawn by ui/hunterCardView.ts.
import { LAIR } from '../data/guardians';
import { SPECIES, UNIQUE_VARIANTS } from '../data/species';
import { RELICS } from '../data/temples';
import { kingDown } from './chapter3';
import { piovraDown } from './chapter4';
import type { GameState } from './game';

export interface HunterCard {
  teeth: number;
  playTime: number;
  seen: number;
  tamed: number;
  species: number;
  deepestM: number;
  relics: number;
  relicsTotal: number;
  /** The Guardians, in story order: beaten or not yet (a badge each). */
  badges: { name: string; beaten: boolean }[];
}

export function hunterCard(g: GameState): HunterCard {
  const tamedIds = new Set(g.beasts.team.map((b) => b.form.speciesId));
  const sfregiato = UNIQUE_VARIANTS.find((u) => u.id === LAIR.guardian);
  const name = (id: string): string => SPECIES.find((s) => s.id === id)?.name ?? id;
  return {
    teeth: g.gear.teeth,
    playTime: g.playTime,
    seen: SPECIES.filter((s) => g.seen.has(s.id) || tamedIds.has(s.id)).length,
    tamed: SPECIES.filter((s) => tamedIds.has(s.id)).length,
    species: SPECIES.length,
    deepestM: Math.round(g.gear.deepestM),
    relics: g.gear.relics.length,
    relicsTotal: RELICS.length,
    badges: [
      { name: sfregiato?.name ?? 'Lo Sfregiato', beaten: g.gear.guardians.includes(LAIR.guardian) },
      { name: name('re_corallo'), beaten: kingDown(g) },
      { name: name('piovra'), beaten: piovraDown(g) },
      { name: name('calamaro_colossale'), beaten: false }, // the next chapters
    ],
  };
}
