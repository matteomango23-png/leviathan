// A fine bait (owner, 16 ottobre 2026: "un tot di percentuale di trovare uno squalo evoluto"): a beast it draws is
// now and then an alfa, or an albino where the albino has its own pictures. Pure logic.
import { hasAlbinoArt, type BeastForm } from './forms';
import type { Rng } from '../math';

/** The version of a beast drawn by a bait whose `rare` chance is this; a rare, unique or final one stays itself. */
export function luredForm(form: BeastForm, rare: number | undefined, rng: Rng): BeastForm {
  if (!rare || form.variant !== 'comune' || form.unique || form.final || rng() >= rare) return form;
  const albino = hasAlbinoArt(form.speciesId) && rng() < 0.5;
  return { ...form, variant: albino ? 'albino' : 'alfa' };
}
