// Leviatano — places of the old story kept as scenery (owner, 8 ottobre 2026: the story is paused until it is
// rethought). The bone cave under the Baia, the coral amphitheatre of the Barriera Rossa and the galleon sunk in
// the Foresta Sommersa stay in the world; nothing happens there for now.
import { bay, east } from './worldLayout';

/** The bone cave: a closed cave under the floor of the Baia, reached by a shaft closed by ancient bones. */
export const LAIR = {
  x: bay(780), // centre of the cave (world units)
  y: 430,
  rx: 200,
  ry: 56,
  wall: 26, // solid rock around the cave, so no other cave ever opens into it
  shaft: { x0: bay(780) - 28, x1: bay(780) + 28, yTop: 300 }, // the way in, from the sea floor down to the cave
  gateRows: [45, 46], // tile rows of ancient bones across the shaft (a strong beast you ride breaks them)
};

/** The amphitheatre: a stepped bowl carved into the reef floor (open to the sea above). */
export const ARENA = {
  x: east(3000), // centre of the amphitheatre
  y0: 288, // its rim (world y): water from here down into the bowl
  rx: 130, // half width
  depth: 84, // the bottom of the bowl, below the rim
  tiers: 4, // terraces, like the seats of a theatre
  clearAbove: 40, // open water kept over the rim (no stray rock from the noise)
};

/** The galleon on the floor of the kelp forest (the floor there is at ~446). */
export const WRECK = {
  x: east(4700),
  floorY: 446,
  length: 150, // units, as drawn
};

export const BONE_TEXT = {
  hint: 'Ossa antiche, dure come ferro. Serve una bestia Predatore o Corazzato di livello 16 o più: impara Sfondamento e le rompe (pulsante Sfonda).',
};
