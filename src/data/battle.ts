// Leviatano — turn-based battles, 1 against 1, like Pokémon (owner's decision of 1 ottobre 2026), with one
// twist: when the enemy attacks, a tap at the right moment dodges, and it must be hard.
// Values marked "tuning" are a first pass: change them here, never in systems.

export const BATTLE = {
  secondsPerTurn: 4, // a move's cooldown (seconds, moves.ts) becomes turns of recharge: round(cooldown / this)
  levelEdge: 0.08, // tuning: each level above the target adds 8% damage (each level below takes 8% off)
  levelEdgeClamp: [0.5, 2] as [number, number], // …but never less than half or more than double
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
    closeSeconds: [0.55, 1.05] as [number, number], // tuning: how long the ring takes to close (random each time)
    perfectSeconds: 0.09, // tuning: ± this around the moment it closes = no damage (hard on purpose)
    grazeSeconds: 0.2, // ± this = half damage
    grazeMult: 0.5,
    pauseChance: 0.35, // the ring sometimes stops for a moment (a feint) before closing
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
  },
  flee: { base: 0.5, fasterBonus: 0.3, perTry: 0.15 }, // tuning
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
  items: { alga_curativa: 2, arpione_mitico: 1 } as Record<string, number>,
  variantChance: 0.15, // a test foe is sometimes albino or alfa, to try harder taming
};
