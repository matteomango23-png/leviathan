// Leviatano — Guardians (tappa 4: Lo Sfregiato, Guardian of the Baia di Portofosco).
// A Guardian waits in its lair; going in starts the fight. Exhausted, it can be tamed as its unique variant.
// Values marked "tuning" are a first pass: change them here, never in systems.
// Speeds marked "U/s" are in diver lengths per second, like BIG_BEAST_MOTION.

/** The lair: a closed cave under the floor of the Baia, reached by a shaft closed by ancient bones. */
export const LAIR = {
  guardian: 'sfregiato', // UNIQUE_VARIANTS id
  x: 780, // centre of the cave (world units)
  y: 430,
  rx: 200,
  ry: 56,
  wall: 26, // solid rock around the cave, so no other cave ever opens into it
  shaft: { x0: 752, x1: 808, yTop: 300 }, // the way in, from the sea floor down to the cave
  gateRows: [45, 46], // tile rows of ancient bones across the shaft (broken by a charge, level 7)
};

/** How the Guardian fights (tuning). */
export const GUARDIAN_FIGHT = {
  escortSpecies: 'squalo_bianco',
  escortLevel: 4,
  escortCount: 2,
  cruiseSpeed: 2.6, // U/s, circling the cave
  attackSpeed: 9.5, // U/s, lunging
  attackRange: 9, // U: lunges when the diver is this close ahead
  telegraph: [0.55, 0.35] as [number, number], // seconds of open jaws before a lunge, phase 1 / phase 2
  attackPause: [2.2, 3.6] as [number, number], // seconds between attacks
  burstBites: 3, // phase 2: bites in a row
  phase2HpFraction: 0.7, // below this share of health: bites in bursts and tail swipes
  escortHpFraction: 0.5, // below this share it calls its escort, once per fight
  tailReachFrac: 0.4, // × body length, around the tail
  tailCooldown: 3,
  tailKnock: 170, // u/s push on the diver
  extraBiteHearts: 1, // its bites take one more heart than a normal shark's
  fleeSeconds: 5, // escorts and an escaping Guardian swim out through the shaft for at most this long
};
