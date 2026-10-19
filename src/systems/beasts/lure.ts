// A fine bait (owner, 16 ottobre 2026: "un tot di percentuale di trovare uno squalo evoluto"): a beast it draws is
// now and then an alfa or an albino, only where that version has its own pictures. Pure logic.
import { hasAlbinoArt, hasAlfaArt, type BeastForm } from './forms';
import type { Rng } from '../math';

/** The version of a beast drawn by a bait whose `rare` chance is this; a rare, unique or final one stays itself. */
export function luredForm(form: BeastForm, rare: number | undefined, rng: Rng): BeastForm {
  if (!rare || form.variant !== 'comune' || form.unique || form.final || rng() >= rare) return form;
  // only a version with pictures of its own (19 ottobre); none: it stays itself
  const can = [hasAlbinoArt(form.speciesId) && 'albino', hasAlfaArt(form.speciesId) && 'alfa'].filter(
    (v): v is 'albino' | 'alfa' => !!v,
  );
  if (!can.length) return form;
  return { ...form, variant: can[Math.floor(rng() * can.length)]! };
}
