// What glows on a beast (owner, 21 ottobre 2026: "le rune gialle… si illuminassero… con un leggero fade stile
// pulsazione che ne segue il movimento tipo una scossa"; "occhi gialli o verdi… luce fissa… un pochino glowing").
// `npm run art` takes from each picture of these beasts (profile, open mouth, battle) only its pixels of this colour
// (hue in degrees, saturation and brightness 0 … 1), softly blurred, into public/glow/; the game lays them over the
// beast, added like light. No imports: the art script reads this file too. Tuning.
export interface GlowDef {
  /** Hue range of what glows, in degrees (yellow ~50, green ~120, cyan ~180). */
  hue: [number, number];
  minSat: number;
  minVal: number;
  /** 'pulse': a wave of light runs along the body and back, like a shock; 'steady': a soft fixed glow. */
  mode: 'pulse' | 'steady';
  /** How bright, 0 … 1 (its strongest moment for a pulse). */
  strength: number;
}

const RUNES: GlowDef = { hue: [32, 68], minSat: 0.45, minVal: 0.55, mode: 'pulse', strength: 1 };
const EYES: GlowDef = { hue: [60, 200], minSat: 0.35, minVal: 0.5, mode: 'steady', strength: 0.7 };

/** By picture key (a species, or a version with its own pictures). */
export const GLOW: Readonly<Record<string, GlowDef>> = {
  // the little one's marks are fainter
  scintilla: { ...RUNES, hue: [25, 70], minSat: 0.3, minVal: 0.4 },
  saetta: RUNES,
  folgore: RUNES,
  dunkleosteus: EYES,
  chimera: EYES,
  squalo_capopiatto_alfa: EYES,
  polpo_gigante: EYES,
  squalo_goblin: EYES,
  rana_pescatrice: EYES,
  rana_pescatrice_alfa: EYES,
  dragone_nero: EYES,
};

/**
 * The pulse of the runes: a bright band `width` (share of the body) wide runs from head to tail and back every
 * `seconds`; elsewhere they keep `rest` of their light, flickering by `flicker`, `flickerHz` times a second.
 */
export const GLOW_PULSE = { seconds: 1.6, width: 0.22, rest: 0.35, flicker: 0.08, flickerHz: 6 };

/** Blur of the glow pictures in pixels (of a 1000-wide profile) and how much of the light spills round them. */
export const GLOW_ART = { blur: 5, spill: 0.85 };
