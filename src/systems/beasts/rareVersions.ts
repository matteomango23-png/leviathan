// The rare versions of the beasts for the bestiary (owner, 15 ottobre 2026: "al posto che domate sarebbe bello averle
// in generale quelle viste"): every alpha, every albino with its own pictures, every final form, and whether you have
// seen it (close, in your light, or in a battle) or tamed it. Pure logic.
import { GAME_SPECIES } from '../../data/species';
import { formKey, hasAlbinoArt, hasFinalForm, type BeastForm } from './forms';
import type { TeamBeast } from './team';

export interface RareVersion {
  form: BeastForm;
  state: 'tamed' | 'seen' | 'unknown';
}

/** Every rare version there is in the game now. */
export function allRareForms(): BeastForm[] {
  const out: BeastForm[] = [];
  for (const s of GAME_SPECIES) {
    out.push({ speciesId: s.id, variant: 'alfa' });
    if (hasAlbinoArt(s.id)) out.push({ speciesId: s.id, variant: 'albino' });
    if (hasFinalForm(s.id, 'comune')) out.push({ speciesId: s.id, variant: 'comune', final: true });
    if (hasFinalForm(s.id, 'alfa')) out.push({ speciesId: s.id, variant: 'alfa', final: true });
    // an albino's final form only once the albino itself is in the sea
    if (hasFinalForm(s.id, 'albino') && hasAlbinoArt(s.id))
      out.push({ speciesId: s.id, variant: 'albino', final: true });
  }
  return out;
}

/** Each rare version and what you know of it. */
export function rareVersions(g: {
  seen: Set<string>;
  beasts: { team: readonly TeamBeast[] };
}): RareVersion[] {
  const tamed = new Set(g.beasts.team.map((b) => formKey(b.form)));
  return allRareForms().map((form) => {
    const key = formKey(form);
    return { form, state: tamed.has(key) ? 'tamed' : g.seen.has(key) ? 'seen' : 'unknown' };
  });
}
