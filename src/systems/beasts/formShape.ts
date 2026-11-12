// How a form is drawn, for the body and the look (split from forms.ts in the cleanup of 12 novembre 2026): the real
// outline of its picture (collisions), its back (where a rider sits), and how it swims (whale, serpent, octopus, crab).
import { BODY_BACKS, BODY_SHAPES } from '../../data/bodyShapes.generated';
import { BEAST_TEMPER, CEPHALOPODS, CETACEANS, SERPENTS, SIDE_TAIL_UNIQUES } from '../../data/beasts';
import { artKeysOf, formKey, type BeastForm } from './forms';

const shapeCache = new Map<string, readonly (readonly [number, number])[] | undefined>();
/** The real outline of the picture a form is drawn with (for collisions), if known. */
export function shapeOfForm(form: BeastForm): readonly (readonly [number, number])[] | undefined {
  const key = formKey(form);
  if (!shapeCache.has(key))
    shapeCache.set(
      key,
      artKeysOf(form)
        .map((k) => BODY_SHAPES[k])
        .find((x) => x),
    );
  return shapeCache.get(key);
}

const backCache = new Map<string, readonly number[] | undefined>();

/** Its back from head to tail, fins left out (bodyShapes BODY_BACKS): where a rider sits. */
export function backOfForm(form: BeastForm): readonly number[] | undefined {
  const key = formKey(form);
  if (!backCache.has(key))
    backCache.set(
      key,
      artKeysOf(form)
        .map((k) => BODY_BACKS[k])
        .find((x) => x),
    );
  return backCache.get(key);
}

/** How it swims when drawn: a whale's tail up and down, a serpent's wave, an octopus's arms, a crab's walk
 *  (data/beasts.ts). */
export const swimLook = (
  form: BeastForm,
): { whale: boolean; serpent: boolean; cephalopod: boolean; walker: boolean } => ({
  whale: tailUpDown(form),
  serpent: SERPENTS.includes(form.speciesId),
  cephalopod: CEPHALOPODS.includes(form.speciesId),
  walker: !!BEAST_TEMPER[form.speciesId]?.floor,
});

/** Whales and dolphins beat the tail up and down; a few of their uniques swim like a shark (SIDE_TAIL_UNIQUES). */
export const tailUpDown = (form: BeastForm): boolean =>
  CETACEANS.includes(form.speciesId) && !SIDE_TAIL_UNIQUES.includes(form.unique ?? '');
