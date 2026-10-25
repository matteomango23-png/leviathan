// The abyssal ship's rare parts (data/abyss.ts, owner 25 ottobre 2026): found in wrecks and in the Gallerie's chests
// (economy/places.ts openWreck), counted here; with all of them (and the teeth) the shipyard builds the ship, and
// the parts go into it. Pure logic.
import { ABYSS_BUILD, ABYSS_PARTS, ABYSS_TEXT } from '../../data/abyss';

interface PartsGear {
  abyssParts: string[];
}

/** Is this the ship built from the parts? */
export const isAbyssShip = (id: string): boolean => id === ABYSS_BUILD.ship;

/** How many of the parts you have. */
export const partsHave = (gear: PartsGear): number =>
  ABYSS_PARTS.filter((p) => gear.abyssParts.includes(p.id)).length;

/** All of them: it can be built. */
export const partsReady = (gear: PartsGear): boolean => partsHave(gear) === ABYSS_PARTS.length;

/** Why it cannot be built yet (null: it can, as far as the parts go). */
export function partsMissing(gear: PartsGear): string | null {
  return partsReady(gear) ? null : ABYSS_TEXT.needParts(partsHave(gear), ABYSS_PARTS.length);
}

/** Built: the parts are in the ship now. */
export function useParts(gear: PartsGear): void {
  gear.abyssParts = [];
}
