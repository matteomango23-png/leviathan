// Which version of a beast this is (common, albino, alpha, a Guardian's unique variant, final form),
// and everything that follows from it: name, sprite, size, stats, stars.
import { ABILITIES, WILD_LEVELS } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { FINAL_FORM_SIZE_MULT, PROGRESSION, RENDER, VARIANT_RULES, type TypeId } from '../../data/rules';
import { SPECIES, UNIQUE_VARIANTS, statsAt, type SpeciesDef, type Stats } from '../../data/species';
import { ART_KEYS, BATTLE_ART_KEYS, SPRITE_KEYS } from '../../data/sprites.generated';
import type { Rng } from '../math';
import { rollLegend } from './legends';

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

export const uniqueOf = (form: BeastForm) =>
  form.unique ? UNIQUE_VARIANTS.find((u) => u.id === form.unique) : undefined;

/** Sprite / illustration id (docs/ART.md, "Nomi dei file"). */
export function formKey(form: BeastForm): string {
  if (form.unique) return form.unique;
  const variant = form.variant === 'comune' ? '' : `_${form.variant}`;
  return `${form.speciesId}${variant}${form.final ? '_finale' : ''}`;
}

/** Whose moves a form uses: an evolved stage keeps the moves of the first stage of its line. */
export function moveSpeciesOf(form: BeastForm): string {
  return speciesOf(form).movesFrom ?? form.speciesId;
}

/**
 * Picture keys to try for a form, best first: its own, its species', then the stand-in pictures of a species
 * that has none yet (a starter until its own images arrive).
 */
export function artKeysOf(form: BeastForm): string[] {
  const keys = [formKey(form)];
  if (form.variant === 'alfa' && !form.final && speciesOf(form).alfaArt) keys.push(speciesOf(form).alfaArt!);
  keys.push(form.speciesId);
  const stand = speciesOf(form).artFrom;
  if (stand) keys.push(stand);
  return keys;
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
  if (form.variant === 'alfa') return s.alfaName ?? `${s.name} alfa`;
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
  const m = Math.max(RENDER.minLengthM, formLengthM(form, level));
  return (m / RENDER.diverLengthM) * DIVER.lengthUnits * RENDER.beastScaleBoost;
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

/** Legendaries, final forms, Guardians and named beasts, colossal species: drawn huge, hard to flee from. */
export function isGiant(form: BeastForm): boolean {
  const s = speciesOf(form);
  return !!form.final || !!form.unique || !!s.legendary || s.size === 'colossale';
}

export function formType(form: BeastForm): TypeId | 'variabile' {
  return speciesOf(form).type;
}

/**
 * An albino exists only where it has its own pictures (owner, 3 ottobre 2026: "togli questi albini finti", the
 * species' pictures drawn pale): card, profile and both battle views.
 */
export function hasAlbinoArt(speciesId: string): boolean {
  const k = `${speciesId}_albino`;
  return (
    ART_KEYS.includes(k) &&
    SPRITE_KEYS.includes(k) &&
    BATTLE_ART_KEYS.includes(`${k}_front`) &&
    BATTLE_ART_KEYS.includes(`${k}_back`)
  );
}

/**
 * A wild encounter: albino and alpha are rare (VARIANT_RULES.spawnChance); in its place a legend of the species may
 * come instead (`where`: the point where it comes, and the legends not available: tamed, gone, already out).
 */
export function rollWildForm(
  speciesId: string,
  rng: Rng,
  where?: { x: number; unavailable: ReadonlySet<string> },
): BeastForm {
  const legend = where ? rollLegend(speciesId, rng, where.x, where.unavailable) : null;
  if (legend) return { speciesId, variant: 'comune', unique: legend };
  const r = rng();
  if (r < VARIANT_RULES.albino.spawnChance) {
    if (hasAlbinoArt(speciesId)) return { speciesId, variant: 'albino' };
    return { speciesId, variant: 'comune' };
  }
  if (r < VARIANT_RULES.albino.spawnChance + VARIANT_RULES.alfa.spawnChance)
    return { speciesId, variant: 'alfa' };
  return { speciesId, variant: 'comune' };
}

export function rollWildLevel(form: BeastForm, rng: Rng, levels?: [number, number]): number {
  const u = uniqueOf(form);
  if (u) return u.level;
  const W = WILD_LEVELS;
  const [a, b] = levels ?? speciesOf(form).wildLevel;
  let lv = a + Math.floor(rng() * (b - a + 1));
  const floor = wildLevelFloor(form);
  if (lv < floor) lv = floor + Math.floor(rng() * (W.aboveFloor + 1));
  if (rng() < W.outlierChance)
    lv += W.outlierExtra[0] + Math.floor(rng() * (W.outlierExtra[1] - W.outlierExtra[0] + 1));
  return Math.min(PROGRESSION.maxLevel, lv);
}

/** The usual levels of a wild beast of this form (its species' range, lifted to its floor), outliers aside. */
export function wildLevelRange(form: BeastForm): [number, number] {
  const [a, b] = speciesOf(form).wildLevel;
  const f = wildLevelFloor(form);
  return a >= f ? [a, b] : [f, Math.max(b, f + WILD_LEVELS.aboveFloor)];
}

/** The lowest level a wild beast of this form can have: bigger and rarer means stronger. */
export function wildLevelFloor(form: BeastForm): number {
  const s = speciesOf(form);
  const W = WILD_LEVELS;
  const base = Math.max(s.minLevel ?? 0, (W.sizeFloor[s.size] ?? 0) + (W.starFloor[s.rarity] ?? 0));
  return Math.max(1, base + (W.variantExtra[form.variant] ?? 0));
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

/** Breaks ancient bones: a bone breaker (the white shark line) or a Predatore/Corazzato with Sfondamento. */
export function breaksBones(form: BeastForm, level: number): boolean {
  const s = speciesOf(form);
  const S = ABILITIES.sfondamento;
  return !!s.abilities?.includes('sfondaOssa') || (S.types.includes(s.type) && level >= S.level);
}
