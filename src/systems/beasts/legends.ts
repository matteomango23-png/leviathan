// The legends (tappa 13, owner's decisions of 2 ottobre 2026; hunted since 4 ottobre): one of each in the whole
// world. They no longer come by chance: each lives in a den and is found by a hunt (data/hunts.ts, hunts.ts).
// Tamed it is yours; defeated it is gone forever; if you flee, or it does, it stays in its den.
import { HUNTS } from '../../data/hunts';
import { UNIQUE_VARIANTS, type UniqueVariantDef } from '../../data/species';

/** The legends: the uniques with a hunt (the Guardians of the story are met in their lairs). */
export const LEGENDS: UniqueVariantDef[] = UNIQUE_VARIANTS.filter((u) =>
  HUNTS.some((h) => h.form.unique === u.id),
);

export const isLegend = (uniqueId: string | undefined): boolean =>
  !!uniqueId && LEGENDS.some((u) => u.id === uniqueId);
