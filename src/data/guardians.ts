// Leviatano — Guardians (tappa 4: Lo Sfregiato, Guardian of the Baia di Portofosco).
// A Guardian waits in its lair; going in it comes at you, and touching it starts a boss battle (turn-based).
// Values marked "tuning" are a first pass: change them here, never in systems.

import { bay } from './worldLayout';

/** The lair: a closed cave under the floor of the Baia, reached by a shaft closed by ancient bones. */
export const LAIR = {
  guardian: 'sfregiato', // UNIQUE_VARIANTS id
  title: 'Guardiano della Baia', // under its name in the big health bar
  x: bay(780), // centre of the cave (world units): the cave keeps its exact size, only its place moved
  y: 430,
  rx: 200,
  ry: 56,
  wall: 26, // solid rock around the cave, so no other cave ever opens into it
  shaft: { x0: bay(780) - 28, x1: bay(780) + 28, yTop: 300 }, // the way in, from the sea floor down to the cave
  gateRows: [45, 46], // tile rows of ancient bones across the shaft (a white shark you ride breaks them)
};

