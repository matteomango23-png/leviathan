// Leviatano — core rules data. Single source of truth for numbers used by gameplay systems.
// Values marked "tuning" are a first balance pass: change them here, never hard-code them in systems.

export type TypeId = 'predatore' | 'abissale' | 'glaciale' | 'tempesta' | 'corazzato';
export type MoveTypeId = TypeId | 'variabile'; // 'variabile' = Leviatano: takes the type that beats the target

export interface TypeDef {
  id: TypeId;
  name: string;        // Italian UI name
  beats: TypeId[];     // this type's moves are super effective (×2) on these
  /** Why it beats each of the two (same order as `beats`): one short sentence, shown in the bestiary's wheel. */
  beatsWhy: [string, string];
  color: string;       // UI + illustration accent colour
}

// Like Pokémon (owner, 3 ottobre 2026): super effective ×2, not very effective ×½. Five types, each strong against two
// and weak against two (rock-paper-scissors on five): the one after it and the one three after it in this circle.
// Predatore → Abissale → Glaciale → Tempesta → Corazzato → Predatore
export const TYPES: Record<TypeId, TypeDef> = {
  predatore: { id: 'predatore', name: 'Predatore', beats: ['abissale', 'tempesta'], beatsWhy: ['I denti strappano i corpi molli del buio', 'Un cacciatore non teme chi vive di scariche'], color: '#c9443f' },
  abissale:  { id: 'abissale',  name: 'Abissale',  beats: ['glaciale', 'corazzato'], beatsWhy: ['Il calore delle bocche idrotermali scioglie il ghiaccio', 'La pressione degli abissi schiaccia i gusci'], color: '#5ff3d6' },
  glaciale:  { id: 'glaciale',  name: 'Glaciale',  beats: ['tempesta', 'predatore'], beatsWhy: ['Il gelo spegne le scariche', 'Il freddo intorpidisce i cacciatori'], color: '#a9dcff' },
  tempesta:  { id: 'tempesta',  name: 'Tempesta',  beats: ['corazzato', 'abissale'], beatsWhy: ['La scarica passa attraverso il guscio', 'Il lampo illumina il buio e stana chi ci si nasconde'], color: '#b07bff' },
  corazzato: { id: 'corazzato', name: 'Corazzato', beats: ['predatore', 'glaciale'], beatsWhy: ['I denti si spezzano sul guscio', 'Il guscio frantuma il ghiaccio'], color: '#d9a24a' },
};

export const TYPE_ADVANTAGE_MULT = 2;      // superefficace, like Pokémon
export const TYPE_DISADVANTAGE_MULT = 0.5; // poco efficace, like Pokémon

/** Damage multiplier for a move of type `atk` hitting a creature of type `def`. */
export function typeMultiplier(atk: TypeId, def: TypeId): number {
  if (TYPES[atk].beats.includes(def)) return TYPE_ADVANTAGE_MULT;
  if (TYPES[def].beats.includes(atk)) return TYPE_DISADVANTAGE_MULT;
  return 1;
}

/** The types whose moves are super effective on this one. */
export const weakAgainst = (t: TypeId): TypeId[] =>
  (Object.keys(TYPES) as TypeId[]).filter((o) => TYPES[o].beats.includes(t));

/** For 'variabile' moves (Leviatano): a type that beats the defender. */
export function counterTypeOf(def: TypeId): TypeId {
  return (Object.keys(TYPES) as TypeId[]).find((t) => TYPES[t].beats.includes(def))!;
}

export const PROGRESSION = {
  maxLevel: 100, // like Pokémon (owner, 3 ottobre 2026; was 50)
  moveUnlockLevels: [1, 7, 15] as const,      // slot 1, 2, 3 (absolute levels, Pokémon style)
  moveDamagePerLevel: 0.04,                   // +4% per level → ~3x at level 50
  statGrowthPerLevel: 0.04,                   // tuning: base stats scale the same way
  growthStartLevel: 51,                       // from here each level also needs nourishment (was 31 of 50)
  growthSizePerLevel: 0.008,                  // +0.8% size per level from 51 to 99 (about +40% in all, as before)
  // iconic species reach their final form this many levels over the top of their wild levels (owner, 20 ottobre
  // 2026: level 100 was out of reach; "+15/20 over the species' range"): 30 for the manta … 93 for the giants
  finalFormOverWild: 18,
  teamSize: 5,                                // beasts in the team; reserve is unlimited
  nourishmentPerGrowthLevel: 3,              // tuning: fish to eat for each level from 51 upward (was 8 for 20 levels)
};

/**
 * On-screen size. All sprites of a species share the same 1000×460 frame (body midline at y=250) (so closed/open and variants swap cleanly);
 * the real size difference is applied at runtime:
 *   drawn length = species.lengthM × variant/unique sizeMult × growth(level) × RENDER.beastScaleBoost, in "diver metres".
 * growth(level) = 1 for level ≤ 50, then +PROGRESSION.growthSizePerLevel per level up to 99; at level 100 the final form uses FINAL_FORM_SIZE_MULT.
 * Example: squalo bianco 6 m → alfa 6.9 m → Sfregiato 7.5 m → final form (Titano) 9 m; megalodonte 18 m, final form 27 m. The Titano stays well below the megalodon.
 */
export const RENDER = {
  diverLengthM: 2,        // the diver (with fins) is the size reference
  beastScaleBoost: 1.5,   // readability: beasts are drawn 1.5× their real ratio to the diver (as in the approved prova-realistica)
  minLengthM: 1.3,        // tuning: smaller beasts are drawn this long anyway (owner: "pesce palla invisibile, troppo piccolo")
};
export const FINAL_FORM_SIZE_MULT = 1.5; // final form = 1.5 × standard length (replaces the growth multiplier at level 50)

export const VARIANT_RULES = {
  albino: { statMult: 1.10, spawnChance: 0.08, sizeMult: 1.0, extraStars: 1 },
  alfa:   { statMult: 1.20, spawnChance: 0.04, sizeMult: 1.15, extraStars: 1 },
};
