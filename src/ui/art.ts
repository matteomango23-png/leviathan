// Where to find a beast's card illustration.
import { ART_KEYS } from '../data/sprites.generated';
import { formKey, type BeastForm } from '../systems/beasts/forms';

/** Card illustration of a form, or of its species when the variant has none yet. */
export function artUrl(form: BeastForm): string {
  const key = formKey(form);
  return `art/${ART_KEYS.includes(key) ? key : form.speciesId}.webp`;
}
