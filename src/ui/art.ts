// Where to find a beast's card illustration.
import { assetUrl } from '../data/assets';
import { ART_KEYS } from '../data/sprites.generated';
import { artKeysOf, formKey, type BeastForm } from '../systems/beasts/forms';

/** Card illustration of a form, or of its species when the variant has none yet. */
export function artUrl(form: BeastForm): string {
  const card = artKeysOf(form).find((k) => ART_KEYS.includes(k)) ?? form.speciesId;
  return assetUrl(`art/${card}.webp`);
}

/** An albino with no illustration of its own yet: the species' one, drawn pale (it must look different). */
export const isPaleStandIn = (form: BeastForm): boolean =>
  form.variant === 'albino' && !form.unique && !ART_KEYS.includes(formKey(form));

/** Shows a form's illustration in an <img>, pale for an albino without its own art. */
export function setArt(img: HTMLImageElement, form: BeastForm): void {
  img.src = artUrl(form);
  img.classList.toggle('albino-art', isPaleStandIn(form));
}
