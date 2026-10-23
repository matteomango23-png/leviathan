// Leviatano — the painted harbours, outposts and islets (lot P1; owner, 23 ottobre 2026: "i porti e gli avamposti
// sono tutti uguali, bisogna abbellirli, creare dei paeselli… anche la laguna coccodrilli fa un po' cagare"). The
// pictures are in public/world (`npm run art`); without one, the old drawing stays. World units (the diver is 12).
// Values marked "tuning" are a first pass, by eye.
import { ISLAND_X, LAYOUT } from './worldLayout';

/** A painted village on a harbour's land: its middle, its width, and the share of the picture's height that sits
 *  on the ground there (its streets; the rocks under them reach lower). */
export interface VillageArt {
  art: string;
  x: number;
  width: number;
  share: number;
}

/** Portofosco's fishing village on the mainland, behind its pier; Porto Fango's stilt huts on the Isola delle
 *  Mangrovie, behind its trading house and fish market. Tuning. */
export const VILLAGES: Record<'portofosco' | 'fango', VillageArt> = {
  portofosco: { art: 'paese_portofosco', x: LAYOUT.shoreX - 128, width: 220, share: 0.76 },
  fango: { art: 'paese_fango', x: ISLAND_X - 70, width: 230, share: 0.93 },
};

/** An outpost's painting: its width and the share of its height at the waterline. */
export interface OutpostArt {
  art: string;
  width: number;
  waterline: number;
}

/**
 * Each outpost its own (by region, data/regions.ts): the Corallo's tents on a coral rock, the Corrente's old barge
 * (Gemini could not give a clean windmill barge), the Gelo's frozen hulk, the Orlo's forge on basalt pillars, the Ultimo's big barge. Without its
 * picture, `fallback`. The width stays the old one: the ship docks by it (data/ship.ts). Tuning.
 */
export const OUTPOST_ART: Record<string, OutpostArt> = {
  barriera_esterna: { art: 'avamposto_corallo', width: 240, waterline: 0.5 },
  mare_blu: { art: 'avamposto_medio', width: 240, waterline: 0.66 }, // the old barge (owner, 23 ottobre)
  banchisa: { art: 'avamposto_gelo', width: 240, waterline: 0.66 },
  grandi_fosse: { art: 'avamposto_orlo', width: 240, waterline: 0.56 },
  abisso: { art: 'avamposto_grande', width: 240, waterline: 0.66 },
};
export const OUTPOST_FALLBACK: OutpostArt = { art: 'avamposto_medio', width: 240, waterline: 0.66 };

/** The painted mangrove islets of the Delta, one per islet of DELTA.islands (its collisions stay the islet's
 *  mound): which picture, its width × the islet's, mirrored or not, and the share of its height at the water. */
export const DELTA_ISLETS: { art: string; widthMult: number; flip: boolean; waterline: number }[] = [
  { art: 'delta_isola_2', widthMult: 1.5, flip: false, waterline: 0.66 },
  { art: 'delta_isola_1', widthMult: 1.35, flip: false, waterline: 0.6 },
  { art: 'delta_isola_2', widthMult: 1.7, flip: true, waterline: 0.66 },
];
