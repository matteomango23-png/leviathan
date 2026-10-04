// Leviatano — chapter 3 (tappa 15): in the Barriera Rossa the Vedova Nera is tearing the Re Corallo from his
// throne with chains and winches. Mad with pain he attacks you in an amphitheatre of coral on the sea floor;
// beaten (exhausted, not gone) you break the three chains and he joins you; the Vedova flees towards the
// Foresta Sommersa. Owner's decisions of 1 and 2 ottobre 2026 (Re Corallo at level 20).
// Values marked "tuning" are a first pass: change them here, never in systems.
import { east } from './worldLayout';

/** The amphitheatre: a stepped bowl carved into the reef floor (open to the sea above). */
export const ARENA = {
  x: east(3000), // centre of the amphitheatre
  y0: 288, // its rim (world y): water from here down into the bowl
  rx: 130, // half width
  depth: 84, // the bottom of the bowl, below the rim
  tiers: 4, // terraces, like the seats of a theatre
  clearAbove: 40, // open water kept over the rim (no stray rock from the noise)
};

export const CORAL_KING = {
  speciesId: 're_corallo',
  level: 20, // owner: "anche livello 20"
  title: 'Re della Barriera', // under his name in the battle
  shipX: east(3000), // the Vedova's ship at anchor right above the amphitheatre
  meetDistance: 150, // the Vedova speaks when you swim this close (horizontally) to her ship
  enterMargin: 10, // he rises when you come this far into the bowl
  walkSpeed: 34, // u/s: he scuttles sideways along the floor of the bowl after you (tuning)
  reach: 6, // touching you (beyond his half width) starts the battle
  chains: [-0.85, 0, 0.85], // the winches on the rim, as shares of ARENA.rx from the centre (0: on the ship)
  chainHp: 8, // tuning: weapon hits to break a chain (like the anchors in the Delta)
  chainReach: 12, // a weapon tip this close to a chain's winch (or its middle) hits it
  shipLeaveDistance: 1200, // after he is free the ship sails east this far, towards the Foresta Sommersa
};

/** What chapter 3 remembers, kept in the story's "seen" list of the save. */
export const CHAPTER3_MARKS = {
  down: 'reCorallo:sfinito',
  reward: 'reCorallo:premio',
  chain: (i: number): string => `reCorallo:catena:${i}`,
};
export const chapter3MarkIds = (): string[] => [
  CHAPTER3_MARKS.down,
  CHAPTER3_MARKS.reward,
  ...CORAL_KING.chains.map((_, i) => CHAPTER3_MARKS.chain(i)),
];

export const CHAPTER3_TEXT = {
  fight: 'Il Re Corallo è impazzito dal dolore: affrontalo nell’anfiteatro',
  chains: (broken: number, total: number): string =>
    `Il Re Corallo è sfinito: spezza le catene degli argani (${broken}/${total})`,
  done: 'Capitolo 3 completato · la Vedova Nera fugge verso la Foresta Sommersa (capitolo 4 in arrivo)',
  chainBroken: (n: number, total: number): string => `Una catena si spezza (${n}/${total}). Il Re Corallo trema.`,
  stillFighting: 'Le catene sono tese come corde d’arco: finché il Re si dibatte non le spezzi. Prima calmalo.',
  exhausted: 'Il Re Corallo crolla sul fondo dell’anfiteatro, sfinito. Ora spezza le catene.',
  caughtFree: 'Il Re Corallo ti ascolta: le catene, strattonate, cedono una dopo l’altra.',
  chapterDone: 'Capitolo 3 completato.',
};
