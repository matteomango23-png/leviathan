// Leviatano — core rules data. Single source of truth for numbers used by gameplay systems.
// Values marked "tuning" are a first balance pass: change them here, never hard-code them in systems.

export type TypeId = 'predatore' | 'abissale' | 'glaciale' | 'tempesta' | 'corazzato';
export type MoveTypeId = TypeId | 'variabile'; // 'variabile' = Leviatano: takes the type that beats the target

export interface TypeDef {
  id: TypeId;
  name: string;        // Italian UI name
  beats: TypeId;       // this type deals bonus damage to `beats`
  why: string;         // flavour text shown in the bestiary
  color: string;       // UI + illustration accent colour
}

// The circle: each type beats the next one.
// Predatore → Abissale → Glaciale → Tempesta → Corazzato → Predatore
export const TYPES: Record<TypeId, TypeDef> = {
  predatore: { id: 'predatore', name: 'Predatore', beats: 'abissale', why: 'Le creature molli del buio sono prede', color: '#c9443f' },
  abissale:  { id: 'abissale',  name: 'Abissale',  beats: 'glaciale', why: 'Il calore delle bocche idrotermali scioglie il ghiaccio', color: '#5ff3d6' },
  glaciale:  { id: 'glaciale',  name: 'Glaciale',  beats: 'tempesta', why: 'Il gelo spegne le correnti', color: '#a9dcff' },
  tempesta:  { id: 'tempesta',  name: 'Tempesta',  beats: 'corazzato', why: 'La scarica passa attraverso il carapace', color: '#b07bff' },
  corazzato: { id: 'corazzato', name: 'Corazzato', beats: 'predatore', why: 'I denti si spezzano sul carapace', color: '#d9a24a' },
};

export const TYPE_ADVANTAGE_MULT = 1.5;    // attacker type beats defender type
export const TYPE_DISADVANTAGE_MULT = 0.66; // defender type beats attacker type

/** Damage multiplier for a move of type `atk` hitting a creature of type `def`. */
export function typeMultiplier(atk: TypeId, def: TypeId): number {
  if (TYPES[atk].beats === def) return TYPE_ADVANTAGE_MULT;
  if (TYPES[def].beats === atk) return TYPE_DISADVANTAGE_MULT;
  return 1;
}

/** For 'variabile' moves (Leviatano): the type that beats the defender. */
export function counterTypeOf(def: TypeId): TypeId {
  return (Object.keys(TYPES) as TypeId[]).find((t) => TYPES[t].beats === def)!;
}

export const PROGRESSION = {
  maxLevel: 50,
  moveUnlockLevels: [1, 7, 15] as const,      // slot 1, 2, 3 (absolute levels, Pokémon style)
  moveDamagePerLevel: 0.04,                   // +4% per level → ~3x at level 50
  statGrowthPerLevel: 0.04,                   // tuning: base stats scale the same way
  growthStartLevel: 31,                       // from here each level also needs nourishment
  growthSizePerLevel: 0.02,                   // +2% size per level from 31 to 50
  finalFormLevel: 50,                         // iconic species reach their final form
  teamSize: 5,                                // beasts in the team; reserve is unlimited
  sanctuaryHealSeconds: 5,                    // gradual heal of HP and oxygen while standing still
  xpCurve: (level: number) => Math.round(20 * Math.pow(level, 1.6)), // tuning: XP needed to go from level to level+1
  nourishmentPerGrowthLevel: 8,              // tuning: fish to eat for each level from 31 upward
};

/** Taming minigame difficulty grows with the level gap between the wild beast and your strongest beast. */
export const TAMING = {
  hitsNeeded: 3,
  missesAllowed: 3,
  baseZoneWidths: [0.30, 0.26, 0.22],        // fraction of the bar, per hit
  baseNeedleSpeeds: [0.5, 0.62, 0.75],       // bar-widths per second, per hit
  tolerance: 0.035,
  // Applied when the wild beast is above your strongest beast: zone /= (1 + gap * k), speed *= (1 + gap * k)
  levelGapFactor: 0.06,                      // tuning: a 15-level gap ≈ zones almost half as wide
  exhaustionThresholdFraction: 0.25,         // tuning: beast is exhausted below 25% HP (shown as a notch on the HP bar)
};

/**
 * On-screen size. All sprites of a species share the same 1000×460 frame (body midline at y=250) (so closed/open and variants swap cleanly);
 * the real size difference is applied at runtime:
 *   drawn length = species.lengthM × variant/unique sizeMult × growth(level) × RENDER.beastScaleBoost, in "diver metres".
 * growth(level) = 1 for level ≤ 30, then +PROGRESSION.growthSizePerLevel per level up to 49; at level 50 the final form uses FINAL_FORM_SIZE_MULT.
 * Example: squalo bianco 6 m → alfa 6.9 m → Sfregiato 7.5 m → final form (Titano) 9 m; megalodonte 18 m, final form 27 m. The Titano stays well below the megalodon.
 */
export const RENDER = {
  diverLengthM: 2,        // the diver (with fins) is the size reference
  beastScaleBoost: 1.5,   // readability: beasts are drawn 1.5× their real ratio to the diver (as in the approved prova-realistica)
};
export const FINAL_FORM_SIZE_MULT = 1.5; // final form = 1.5 × standard length (replaces the growth multiplier at level 50)

export const VARIANT_RULES = {
  albino: { statMult: 1.10, spawnChance: 0.08, sizeMult: 1.0, extraStars: 1 },
  alfa:   { statMult: 1.20, spawnChance: 0.04, sizeMult: 1.15, extraStars: 1 },
};
