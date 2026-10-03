// Leviatano — turn-based battles, 1 against 1, like Pokémon (owner's decision of 1 ottobre 2026), with one
// twist: when the enemy attacks, a tap at the right moment dodges, and it must be hard.
// Values marked "tuning" are a first pass: change them here, never in systems.

export const BATTLE = {
  secondsPerTurn: 4, // a move's cooldown (seconds, moves.ts) becomes turns of recharge: round(cooldown / this)
  levelEdge: 0.08, // tuning: each level above the target adds 8% damage (each level below takes 8% off)
  levelEdgeClamp: [0.3, 2] as [number, number], // …but never less than 0.3× or more than double (was 0.5: a level 1 hurt a level 11 too much)
  randomRange: [0.85, 1] as [number, number], // damage varies a little, like Pokémon
  critChance: 1 / 16,
  critMult: 1.5,
  /** Move effects (fx in moves.ts) as they work in a turn-based battle. */
  fx: {
    multiHitShare: 0.6, // 'frenzy:N' / 'hits:N': several hits, each this share of the damage…
    multiHitMax: 4, // …at most this many
    woundedMult: 2, // 'x2vsWounded': under MOVE_RULES.woundedFraction of health
    executeMult: 1.5, // 'executeLowHp': under MOVE_RULES.executeHpFraction
    stunChance: 0.5, // 'stun:S' and friends: chance the target loses its next turn
    healShare: 0.3, // 'heal:…': heals this share of the user's health
    guardTurns: 2, // 'shield…' / 'dmgReduce…' / 'taunt…': the next hits on the user are halved
    guardMult: 0.5,
    grabSkipChance: 0.3, // 'grab:S' used by you: chance the target loses its next turn (used on you: no dodge)
  },
  /** The dodge: a ring closes on your beast; tap when it touches it. */
  dodge: {
    closeSeconds: [0.45, 0.95] as [number, number], // tuning: how long the ring takes to close (random each time)
    perfectSeconds: 0.065, // tuning: ± this around the moment it closes = no damage (hard on purpose; was 0.09)
    grazeSeconds: 0.15, // ± this = half damage (was 0.2)
    grazeMult: 0.5,
    pauseChance: 0.45, // the ring sometimes stops for a moment (a feint) before closing
    pauseSeconds: [0.15, 0.35] as [number, number],
  },
  /** Taming (like a Poké Ball): the chance falls with rarity and level, rises when it is worn out. */
  catch: {
    byStars: { 1: 0.85, 2: 0.65, 3: 0.45, 4: 0.28, 5: 0.12 } as Record<number, number>, // tuning
    variantMult: 0.6, // albino and alfa are harder
    uniqueMult: 0.35, // Guardians and legendaries are much harder
    hpWeight: 2 / 3, // at full health the chance is × (1 − hpWeight); nearly worn out, × 1
    levelPenalty: 0.85, // × this for every level the beast is above your strongest
    shakes: 3, // the shell shakes this many times before it holds
    shellItem: 'conchiglia', // each attempt uses one (owner, 2 ottobre: they were endless)
  },
  /** Fleeing: harder from stronger, rarer and giant beasts (owner, 1 ottobre 2026). Tuning. */
  flee: {
    base: 0.6,
    fasterBonus: 0.2,
    perTry: 0.1, // each new try is a little easier
    perLevelAbove: 0.06, // for each level the wild beast is above yours
    perStar: 0.08, // for each star of rarity above one
    giant: 0.25, // legendaries, final forms, Guardians, colossal species
    min: 0.05,
    max: 0.95,
  },
  ai: { randomChoice: 0.2 }, // the wild beast picks its best move, or a random one this often
  /** Backpack items usable in battle (ITEMS in world.ts). */
  items: {
    alga_curativa: { healShare: 0.5 }, // heals half of your beast's health
    arpione_mitico: { tameMult: 3 }, // the next taming attempt is three times as likely
  } as Record<string, { healShare?: number; tameMult?: number }>,
};

/** The battle prototype (link with ?battaglia): your team, the wild beasts you may meet, your backpack. */
export const BATTLE_PROTOTYPE = {
  team: [
    { speciesId: 'squalo_bianco', level: 8 },
    { speciesId: 'tartaruga_marina', level: 6 },
    { speciesId: 'torpedine', level: 6 },
  ],
  foes: [
    { speciesId: 'barracuda', level: [5, 7] },
    { speciesId: 'squalo_bianco', level: [6, 8] },
    { speciesId: 'tartaruga_marina', level: [5, 7] },
    { speciesId: 'torpedine', level: [5, 7] },
    { speciesId: 'coccodrillo_marino', level: [9, 11] },
  ] as { speciesId: string; level: [number, number] }[],
  items: { alga_curativa: 2, arpione_mitico: 1, conchiglia: 5 } as Record<string, number>,
  variantChance: 0.15, // a test foe is sometimes albino or alfa, to try harder taming
};

/**
 * How the battle looks (owner's choices of 1 ottobre 2026). Sizes are relative, like Pokémon: the bigger of
 * the two beasts is drawn at a standard size and the other in proportion to it (squeezed a little, so a small
 * one stays readable): two turtles are both normal-sized, a shark next to a torpedo ray is clearly bigger.
 * Giants (legendaries, final forms, Guardians and named beasts, colossal species) are always huge.
 */
export const BATTLE_STAGE = {
  /**
   * How big each beast is drawn (owner, 3 ottobre: "grandezza relativa massima e minima… sempre dentro il range").
   * Its real length is placed on the spectrum minM…maxM (on a log scale: 25 m and 30 m look alike, so do 2 m
   * and 5 m) and mapped to min…max: the longest side of its picture as a share of the screen height (tuning).
   */
  size: {
    minM: 0.5, // this long or shorter: drawn at `min`
    maxM: 30, // this long or longer: drawn at `max`
    min: 0.4, // a small fish stays well visible…
    max: 1.0, // …and the biggest are as tall as the screen (then `fit` keeps them inside)
    foeDistance: 0.82, // the wild beast is farther away: × this
    youCloser: 1.22, // yours is close to the camera, seen from behind: × this (owner: "looked like a wren")
  },
  /** Where the two beasts stand, as shares of the screen (the ground under each of them). */
  anchors: {
    foe: { x: 0.62, y: 0.5 }, // was 0.64 (owner: the hammerhead a little more to the left)
    you: { x: 0.35, y: 1.0 },
  },
  hover: 0.03, // swimming beasts float this share of the screen height above their ground
  /**
   * Every beast stays whole on screen: at least `margin` (share of the screen height) from every edge, also while
   * it bobs. A wild beast too tall for its place stands lower, down to `foeLowest`; if it still does not fit, or is
   * too wide (or would cover the other beast), it is drawn smaller.
   */
  fit: {
    margin: 0.03,
    foeLowest: 0.62, // was 0.97: a big crocodile stood on top of your beast (owner, 3 ottobre)
    foeLeft: 0.46, // the wild one stays whole, right of this share of the width
    /**
     * Yours is placed like Pokémon (owner, 3 ottobre: "il mio animale quando è grosso mettilo più giù e più a sinistra,
     * mi basta vedere un po' di schiena, le zampe davanti e la testa"): its right edge (the head, seen from behind)
     * at most at youRight, its top at least youTop below the top of the screen; the rest may leave the screen at the
     * bottom and on the left. A small one just stands at the bottom.
     */
    youRight: 0.46,
    youTop: 0.4,
    youMax: 1.5, // and it is never drawn bigger than this share of the screen height
    youWide: 1.5, // …nor wider than this × the width left of youRight, or taller than this × the height under youTop
  },
  /** Battle pictures (npm run art): a square of this side, the beast's longest side `box`, its lowest point at `foot`. */
  picture: { square: 800, box: 760, foot: 780 },
  /**
   * Pictures whose longest side is not the body length: a coiled moray looks far bigger than 3 m, a manta seen
   * flat (wide and thin) far smaller than 7 m. Their battle size × this (tuning, owner's feedback 2 ottobre).
   */
  pictureMult: { murena: 0.62, manta: 1.3 } as Record<string, number>,
  /**
   * A picture much wider than tall (a turtle from behind, a hammerhead head-on) looks smaller than a square one
   * of the same length: it is drawn bigger by (longest side / sqrt(width × height)) ^ exponent, up to max (owner,
   * 3 ottobre: "squalo martello piccolo in battaglia", "la tartaruga è sparita").
   */
  flat: { exponent: 0.8, max: 1.55 },
  /** A beast without battle pictures shows its card (2:3), standing on this share of its height. */
  card: { aspect: 2 / 3, foot: 0.9 },
  /** Places with their own background; any other region uses the bay. */
  places: ['baia', 'delta', 'tana', 'barriera'] as const, // barriera: the coral amphitheatre (3 ottobre)
};
export type BattlePlace = (typeof BATTLE_STAGE.places)[number];

/** Colours of the drawn backgrounds, used until the painted layers of each place arrive (docs/PROMPT-BATTAGLIA.md). */
export interface BattlePalette {
  top: string; // water at the top of the screen
  bottom: string; // water at the bottom
  ray: string; // light from the surface
  fog: string; // drifting haze
  rock: string; // rock silhouettes
  rim: string; // light on the rock edges
  ground: string; // the patch of seabed each beast stands on
  plant: string; // foreground plants or roots
  prop: 'arches' | 'roots' | 'ribs'; // what the middle layer shows: stone arches, mangrove roots, whale ribs
  /** A place without its own painted background borrows the bay's, tinted with this colour (and its props on top). */
  borrowTint: string;
}

export const BATTLE_PALETTES: Record<BattlePlace, BattlePalette> = {
  baia: {
    top: '#1b5966',
    bottom: '#020b12',
    ray: '#c8f4f2',
    fog: '#5a9ca2',
    rock: '#0b252d',
    rim: '#4fa2a6',
    ground: '#3b4a42',
    plant: '#06221c',
    prop: 'arches',
    borrowTint: '#ffffff',
  },
  delta: {
    top: '#3f5130',
    bottom: '#080b06',
    ray: '#e6edb0',
    fog: '#5c6c3c',
    rock: '#141a0d',
    rim: '#7a8a44',
    ground: '#3a3424',
    plant: '#14110a',
    prop: 'roots',
    borrowTint: '#9aa877',
  },
  barriera: {
    top: '#1d4a5a',
    bottom: '#04090e',
    ray: '#d6f0f0',
    fog: '#6a5a62',
    rock: '#2a1414',
    rim: '#c8584a',
    ground: '#4a3a32',
    plant: '#2a0e10',
    prop: 'arches',
    borrowTint: '#e0b0a8',
  },
  tana: {
    top: '#10303a',
    bottom: '#010507',
    ray: '#a8e2ee',
    fog: '#2f5660',
    rock: '#0a1418',
    rim: '#6a9298',
    ground: '#2c2f2c',
    plant: '#050d0e',
    prop: 'ribs',
    borrowTint: '#6f818c',
  },
};

/** Every beast of yours KO and a wild one touches you: you black out, like Pokémon (owner, 1 ottobre 2026). */
export const BLACKOUT = {
  teethLoss: 0.1, // tuning: share of your teeth lost
};
