// Which version of a beast this is (common, albino, alpha, a Guardian's unique variant, final form),
// and everything that follows from it: name, sprite, size, stats, stars.
import { RARE_UNIQUES } from '../../data/chapter2';
import { DIVER } from '../../data/diver';
import { FINAL_FORM_SIZE_MULT, PROGRESSION, RENDER, VARIANT_RULES, type TypeId } from '../../data/rules';
import { SPECIES, UNIQUE_VARIANTS, statsAt, type SpeciesDef, type Stats } from '../../data/species';
import type { Rng } from '../math';

export type Variant = 'comune' | 'albino' | 'alfa';

export interface BeastForm {
  speciesId: string;
  variant: Variant;
  /** Guardian unique variant id (e.g. 'sfregiato'). */
  unique?: string;
  /** Final form (level 50 of iconic species). */
  final?: boolean;
}

export function speciesOf(form: BeastForm): SpeciesDef {
  const s = SPECIES.find((sp) => sp.id === form.speciesId);
  if (!s) throw new Error(`Unknown species ${form.speciesId}`);
  return s;
}

const uniqueOf = (form: BeastForm) =>
  form.unique ? UNIQUE_VARIANTS.find((u) => u.id === form.unique) : undefined;

/** Sprite / illustration id (docs/ART.md, "Nomi dei file"). */
export function formKey(form: BeastForm): string {
  if (form.unique) return form.unique;
  const variant = form.variant === 'comune' ? '' : `_${form.variant}`;
  return `${form.speciesId}${variant}${form.final ? '_finale' : ''}`;
}

/** Italian name shown to the player. */
export function formName(form: BeastForm): string {
  const s = speciesOf(form);
  const u = uniqueOf(form);
  if (u) return u.name;
  if (form.final) {
    if (form.variant === 'albino' && s.albinoFinalFormName) return s.albinoFinalFormName;
    if (s.finalFormName) return s.finalFormName;
  }
  if (form.variant === 'albino') return `${s.name} albino`;
  if (form.variant === 'alfa') return `${s.name} alfa`;
  return s.name;
}

/** Size multiplier over the species' standard length (RENDER / VARIANT_RULES / UNIQUE_VARIANTS / FINAL_FORM_SIZE_MULT). */
export function formSizeMult(form: BeastForm, level = 1): number {
  if (form.final) return FINAL_FORM_SIZE_MULT;
  const u = uniqueOf(form);
  const variant = u ? u.sizeMult : form.variant === 'comune' ? 1 : VARIANT_RULES[form.variant].sizeMult;
  const grow =
    level >= PROGRESSION.growthStartLevel
      ? 1 +
        PROGRESSION.growthSizePerLevel *
          (Math.min(level, PROGRESSION.finalFormLevel - 1) - PROGRESSION.growthStartLevel + 1)
      : 1;
  return variant * grow;
}

/** Length in metres (e.g. squalo bianco 6 m, alfa 6.9 m, Sfregiato 7.5 m, Titano 9 m). */
export function formLengthM(form: BeastForm, level = 1): number {
  return speciesOf(form).lengthM * formSizeMult(form, level);
}

/** Drawn length in world units: real ratio to the diver × RENDER.beastScaleBoost for readability. */
export function formLengthUnits(form: BeastForm, level = 1): number {
  return (formLengthM(form, level) / RENDER.diverLengthM) * DIVER.lengthUnits * RENDER.beastScaleBoost;
}

export function formStats(form: BeastForm, level: number): Stats {
  const u = uniqueOf(form);
  return statsAt(speciesOf(form), level, form.variant, u ? u.statMult : 1);
}

export function formStars(form: BeastForm): number {
  const s = speciesOf(form);
  const extra = form.unique || form.variant !== 'comune' ? VARIANT_RULES.alfa.extraStars : 0;
  return Math.min(5, s.rarity + extra);
}

export function formType(form: BeastForm): TypeId | 'variabile' {
  return speciesOf(form).type;
}

/** A wild encounter: albino and alpha are rare (VARIANT_RULES.spawnChance); a few species have a legendary. */
export function rollWildForm(speciesId: string, rng: Rng): BeastForm {
  const rare = RARE_UNIQUES[speciesId];
  if (rare && rng() < rare.chance) return { speciesId, variant: 'comune', unique: rare.unique };
  const r = rng();
  if (r < VARIANT_RULES.albino.spawnChance) return { speciesId, variant: 'albino' };
  if (r < VARIANT_RULES.albino.spawnChance + VARIANT_RULES.alfa.spawnChance)
    return { speciesId, variant: 'alfa' };
  return { speciesId, variant: 'comune' };
}

export function rollWildLevel(form: BeastForm, rng: Rng): number {
  const u = uniqueOf(form);
  if (u) return u.level;
  const [a, b] = speciesOf(form).wildLevel;
  return a + Math.floor(rng() * (b - a + 1));
}

/** The six versions of the white shark (tappa 2), in the order shown in the test panel. */
export const WHITE_SHARK_FORMS: BeastForm[] = [
  { speciesId: 'squalo_bianco', variant: 'comune' },
  { speciesId: 'squalo_bianco', variant: 'alfa' },
  { speciesId: 'squalo_bianco', variant: 'albino' },
  { speciesId: 'squalo_bianco', variant: 'albino', final: true },
  { speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' },
  { speciesId: 'squalo_bianco', variant: 'comune', final: true },
];
