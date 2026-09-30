// Shape of a Guardian's lair (LAIR in data/guardians.ts): the cave, the shaft that leads down to it,
// and the shell of solid rock around the cave.
import { LAIR } from '../../data/guardians';

const ellipse = (x: number, y: number, grow: number): number =>
  ((x - LAIR.x) / (LAIR.rx + grow)) ** 2 + ((y - LAIR.y) / (LAIR.ry + grow)) ** 2;

/** Inside the cave itself. `margin` shrinks it (e.g. to keep a body away from the walls). */
export const inLairCave = (x: number, y: number, margin = 0): boolean => ellipse(x, y, -margin) < 1;

/** Inside the shaft from the sea floor down to the cave. */
export const inLairShaft = (x: number, y: number): boolean =>
  x > LAIR.shaft.x0 && x < LAIR.shaft.x1 && y > LAIR.shaft.yTop && y < LAIR.y;

/** Inside the rock shell around the cave (the cave and shaft excluded). */
export const inLairShell = (x: number, y: number): boolean =>
  ellipse(x, y, LAIR.wall) < 1 && !inLairCave(x, y) && !inLairShaft(x, y);

/** The y of the cave's roof, where the shaft opens into it. */
export const lairRoofY = (): number => LAIR.y - LAIR.ry;
