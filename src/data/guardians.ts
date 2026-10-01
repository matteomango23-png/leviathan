// Leviatano — Guardians (tappa 4: Lo Sfregiato, Guardian of the Baia di Portofosco).
// A Guardian waits in its lair; going in it comes at you, and touching it starts a boss battle (turn-based).
// Values marked "tuning" are a first pass: change them here, never in systems.

/** The lair: a closed cave under the floor of the Baia, reached by a shaft closed by ancient bones. */
export const LAIR = {
  guardian: 'sfregiato', // UNIQUE_VARIANTS id
  title: 'Guardiano della Baia', // under its name in the big health bar
  x: 780, // centre of the cave (world units)
  y: 430,
  rx: 200,
  ry: 56,
  wall: 26, // solid rock around the cave, so no other cave ever opens into it
  shaft: { x0: 752, x1: 808, yTop: 300 }, // the way in, from the sea floor down to the cave
  gateRows: [45, 46], // tile rows of ancient bones across the shaft (broken by a charge, level 7)
};

