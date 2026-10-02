// Leviatano — chapter 2 (tappa 6): in the Delta delle Mangrovie the Company ship of La Vedova Nera is anchored
// with the humpback whale of the opening in chains. Break the three chain anchors on the sea floor while
// her crocodile attacks; freed, the whale joins you. Owner's decisions of 1 ottobre 2026.
// Values marked "tuning" are a first pass: change them here, never in systems.

import { delta } from './worldLayout';

export const VEDOVA = {
  shipX: delta(2250), // the ship at anchor on the surface, in the middle of the Delta
  whale: { speciesId: 'megattera', x: delta(2250), y: 125, level: 10 }, // chained under the keel; joins you when freed
  anchors: [delta(2150), delta(2255), delta(2365)], // x of the chain anchors on the sea floor (y found from the map)
  anchorHp: 8, // tuning: harpoon hits to break an anchor (fiocine darts count one each)
  anchorReach: 12, // a weapon tip this close to an anchor hits it
  croc: { speciesId: 'coccodrillo_marino', variant: 'alfa' as const, level: 12, title: 'Coccodrillo della Vedova Nera' },
  meetDistance: 140, // the Vedova speaks when you swim this close (horizontally) to her ship: it is on screen
  shipLeaveDistance: 900, // after the whale is freed the ship sails east this far, then it is gone
};

