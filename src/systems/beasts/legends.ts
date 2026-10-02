// The legends (tappa 13, owner's decisions of 2 ottobre 2026): one of each in the whole world. Each time its
// species comes, in its own place only, it may come instead (its `chance`). Tamed it is yours; defeated it is gone
// forever; if you flee, or it does, it stays in the sea and may come again.
import { UNIQUE_VARIANTS, type UniqueVariantDef } from '../../data/species';
import type { Rng } from '../math';
import { biomeAt, kmFromCoast } from '../world/endless';

/** The legends (the uniques that come by chance; the Guardians of the story are met in their lairs). */
export const LEGENDS: UniqueVariantDef[] = UNIQUE_VARIANTS.filter((u) => u.chance !== undefined);

export const isLegend = (uniqueId: string | undefined): boolean =>
  !!uniqueId && LEGENDS.some((u) => u.id === uniqueId);

/** Is this point in the legend's place? (No place given: wherever its species comes.) */
export function inLegendPlace(u: UniqueVariantDef, x: number): boolean {
  const w = u.where;
  if (!w) return true;
  if (w.biome && biomeAt(x)?.id !== w.biome) return false;
  return w.minKm === undefined || kmFromCoast(x) >= w.minKm;
}

/**
 * A legend that comes instead of a beast of its species here, or null. `unavailable`: legends tamed, gone
 * forever, or already in the sea.
 */
export function rollLegend(
  speciesId: string,
  rng: Rng,
  x: number,
  unavailable: ReadonlySet<string>,
): string | null {
  for (const u of LEGENDS) {
    if (u.speciesId !== speciesId || unavailable.has(u.id) || !inLegendPlace(u, x)) continue;
    if (rng() < u.chance!) return u.id;
  }
  return null;
}
