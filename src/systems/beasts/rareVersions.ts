// The rare versions in the bestiary (owner, 15 ottobre 2026: the ones seen too, not only the tamed ones; 16 ottobre:
// only those with pictures of their own). An albino or a final form is a beast of its own in the bestiary
// (bestiaryEntries.ts): what is left here are the alphas with their own pictures. Pure logic.
import { rareAlphas } from './bestiaryEntries';
import { formKey, type BeastForm } from './forms';
import type { TeamBeast } from './team';

export interface RareVersion {
  form: BeastForm;
  state: 'tamed' | 'seen' | 'unknown';
}

/** Each rare version and what you know of it. */
export function rareVersions(g: {
  seen: Set<string>;
  beasts: { team: readonly TeamBeast[] };
}): RareVersion[] {
  const tamed = new Set(g.beasts.team.filter((b) => !b.form.final).map((b) => formKey(b.form)));
  return rareAlphas().map((form) => {
    const key = formKey(form);
    return { form, state: tamed.has(key) ? 'tamed' : g.seen.has(key) ? 'seen' : 'unknown' };
  });
}
