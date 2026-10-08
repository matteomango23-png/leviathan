// The hunter's card, like Pokémon's trainer card: money, bestiary, play time, deepest dive and relics. The
// Guardians' badges are gone with the paused story (owner, 8 ottobre 2026). Pure data, drawn by
// ui/hunterCardView.ts.
import { GAME_SPECIES } from '../data/species';
import { RELICS } from '../data/temples';
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
}

export function hunterCard(g: GameState): HunterCard {
  const tamedIds = new Set(g.beasts.team.map((b) => b.form.speciesId));
  return {
    teeth: g.gear.teeth,
    playTime: g.playTime,
    seen: GAME_SPECIES.filter((s) => g.seen.has(s.id) || tamedIds.has(s.id)).length,
    tamed: GAME_SPECIES.filter((s) => tamedIds.has(s.id)).length,
    species: GAME_SPECIES.length,
    deepestM: Math.round(g.gear.deepestM),
    relics: g.gear.relics.length,
    relicsTotal: RELICS.length,
  };
}
