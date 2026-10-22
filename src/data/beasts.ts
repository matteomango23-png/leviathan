// Leviatano — beasts in the open sea: how wild beasts roam and start a battle, how you ride your mounts.
// The battle itself is turn-based (battle.ts). Owner's decision of 1 ottobre 2026: no real-time fighting.
// Speeds marked "U/s" are in diver lengths per second (DIVER.lengthUnits).
// Values marked "tuning" are a first pass: change them here, never in systems.

import { ENDLESS } from './endless';
import { bay, delta, east, LAYOUT } from './worldLayout';

/** How wild beasts swim around you (they are seen, like in recent Pokémon games). */
export const ROAM = {
  cruiseSpeed: 1.2, // U/s, wandering slowly
  chaseSpeed: 2.9, // U/s, an aggressive beast swimming at you (slower than you: you can get away; tappa 10: was 3.2)
  shySpeed: 2.2, // U/s, a shy beast slipping away (you can catch it)
  sightRange: 9, // U: it notices you this close
  loseRange: 16, // U: it gives up beyond this
  contactFrac: 0.2, // you touch it when you are this close to its body (× its length): the battle starts
  bodyContact: 2, // units: riding, its body and your beast's body this close count as touching (the battle starts)
  calmAfterBattle: 6, // seconds a beast ignores you after a battle you fled from (or after biting you)
  noTeamKnock: 140, // u/s: with no beast able to fight, it bites you and pushes you away
  spawnMinDistance: 230, // units: it appears at least this far from you, in the dark
  targetReach: 24, // units: it reached the point it was swimming to
  litRadius: 90, // units: this close to your lamp it is in the light, and never turns around
  chaseLeash: 320, // units: a hunting beast follows you this far out of its waters, then goes back home (owner, 2 ottobre)
  homeSeconds: 10, // …after giving up it swims home, leaving you alone this long
  fearRatio: 0.6,
  senseRange: 380, // units: the beast swimming with you (or carrying you) feels a wild one this close, still in the dark…
  senseMin: 150, // …but not if it is already near enough to see // a beast shorter than this × the one you ride does not come at you: it keeps away
  steer: 1.6,
  floorHug: 3, // a crab keeps to the floor: its height follows the floor ahead this fast (× the gap, per second)
  floorSink: 30, // u/s: a crab above the floor (dropped, or off a ledge) sinks down to it this fast
  turnSeconds: 0.8, // a turn (only out of the light), animated from the head
  pitchMax: 0.4,
  pitchRate: 3,
  swimPhaseBase: 2.6,
  swimPhasePerSpeed: 0.9,
};

/** The patrol of the big predators (systems/beasts/patrol.ts; owner, 15 ottobre). Speeds × the diver's length a
 *  second, times as in CLAUDE.md. Tuning. */
export const PATROL = {
  chance: 0.65, // how often a big hunter makes passes first instead of charging at once
  maxPasses: 3,
  turnInView: 0.25, // share of the passes that end with a turn in view
  cruiseMult: 2.5, // × ROAM.cruiseSpeed while it cruises past you
  exitMult: 1.6, // × ROAM.chaseSpeed added as it speeds out of the far edge
  boltMult: 2.2, // × ROAM.chaseSpeed when it bolts away…
  boltOver: 3, // …and at least this much faster than you (U/s)
  catchUpMult: 1.5, // left behind off screen facing in: it catches up
  waitSeconds: [1, 2] as [number, number], // off screen before it turns and comes back
  followSeconds: 1.1, // you follow it this long: it bolts
  followSpeed: 1.4, // U/s: you count as following it above this speed its way
  inViewSeconds: 9, // in view this long without attacking: it bolts
  chargeMult: 1.4, // its charge after the passes is this much faster than a plain chase
};

/** Wild beasts: where they live (world units) and when they come back. */

export interface WildSpawnDef {
  speciesId: string;
  area: [number, number, number, number]; // x0, y0, x1, y1: present while the diver is inside
  respawnSeconds: [number, number];
  /** Where in its danger band its levels fall (0 = bottom; set for the endless sea by its region and depth). */
  band?: number;
  /** A slot of the endless sea: it brings out the resident nearest to you (beasts/residents.ts). */
  endless?: boolean;
  /** The resident it brought out (set when it comes; beasts/residents.ts). */
  resident?: string;
  /** A hunted beast's den (data/hunts.ts): it comes only when its hunt is ready (systems/hunts.ts), as itself. */
  hunt?: string;
  form?: { unique?: string };
}

// Each entry is one beast that comes and goes; a species listed twice can be met two at a time.
// The sea is full of common beasts (barracudas, turtles, rays) and some sharks; the coast up to Porto Fango has
// no superpredators (owner, 8 ottobre: a protected first zone; white sharks and sea crocodiles live out east).
const BAY: [number, number, number, number] = [LAYOUT.bay.x0, 60, bay(1900), 380];
const BAY_HIGH: [number, number, number, number] = [LAYOUT.shoreX + 200, 40, bay(1800), 320]; // also over the beach
const REEF: [number, number, number, number] = [east(2480), 40, east(4000), 420];
const FOREST: [number, number, number, number] = [east(4040), 40, east(5200), 520];
const ICY: [number, number, number, number] = [east(5240), 60, ENDLESS.startX - 40, 420];
const SHALLOW_BAY: [number, number, number, number] = [LAYOUT.bay.x0, 40, bay(1900), 200]; // the first 30 m
const BEACH_REEF: [number, number, number, number] = [380, 40, 1300, 220]; // the coral reef off the beach
const SHALLOW_REEF: [number, number, number, number] = [east(2480), 40, east(4000), 200];
// the abysses (owner, 3 ottobre: "sono stato in un abisso ed era totalmente vuoto")
const ABYSS_BAY: [number, number, number, number] = [bay(150), 1150, bay(1650), 1500]; // under the bone wall
const ABYSS_EAST: [number, number, number, number] = [east(4150), 1150, east(5800), 1480]; // under the eastern shafts
export const WILD_SPAWNS: WildSpawnDef[] = [
  { speciesId: 'barracuda', area: [LAYOUT.shoreX + 300, 50, bay(1900), 340], respawnSeconds: [12, 30] },
  { speciesId: 'barracuda', area: BAY, respawnSeconds: [15, 35] },
  { speciesId: 'tartaruga_marina', area: BAY_HIGH, respawnSeconds: [20, 45] },
  { speciesId: 'tartaruga_marina', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'torpedine', area: [LAYOUT.bay.x0, 180, bay(1900), 380], respawnSeconds: [20, 40] },
  { speciesId: 'torpedine', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'squalo_martello', area: BAY, respawnSeconds: [60, 120] }, // visitors from the reef
  { speciesId: 'squalo_tigre', area: BAY, respawnSeconds: [80, 150] },
  { speciesId: 'tonno', area: BAY_HIGH, respawnSeconds: [20, 45] }, // a school of bluefin tuna
  { speciesId: 'delfino', area: BAY, respawnSeconds: [40, 80] },
  { speciesId: 'varano_nilo', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [35, 70] },
  { speciesId: 'coccodrillo_nilo', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [90, 160] },
  // the Mare di Ghiaccio (hand-made, before the endless sea)
  { speciesId: 'foca_leopardo', area: ICY, respawnSeconds: [25, 50] },
  { speciesId: 'beluga', area: ICY, respawnSeconds: [35, 70] },
  { speciesId: 'tricheco', area: ICY, respawnSeconds: [35, 70] },
  { speciesId: 'elefante_marino', area: ICY, respawnSeconds: [45, 90] },
  { speciesId: 'narvalo', area: ICY, respawnSeconds: [60, 120] },
  // the open sea east: the reef and the kelp forest
  { speciesId: 'pesce_palla', area: REEF, respawnSeconds: [15, 35] }, // its bite picture is the puffed-up one
  { speciesId: 'pesce_palla', area: REEF, respawnSeconds: [20, 40] },
  { speciesId: 'murena', area: REEF, respawnSeconds: [25, 50] },
  { speciesId: 'barracuda', area: REEF, respawnSeconds: [15, 35] },
  { speciesId: 'manta', area: REEF, respawnSeconds: [70, 140] },
  { speciesId: 'torpedine', area: REEF, respawnSeconds: [25, 50] },
  { speciesId: 'tartaruga_marina', area: REEF, respawnSeconds: [25, 50] },
  { speciesId: 'squalo_martello', area: REEF, respawnSeconds: [50, 100] },
  { speciesId: 'squalo_tigre', area: FOREST, respawnSeconds: [40, 80] },
  { speciesId: 'barracuda', area: FOREST, respawnSeconds: [20, 40] },
  { speciesId: 'murena', area: FOREST, respawnSeconds: [30, 60] },
  // more small and medium beasts (owner, 3 ottobre: "poca vita, soprattutto animali piccoli/medi")
  { speciesId: 'pesce_palla', area: BAY, respawnSeconds: [15, 30] },
  { speciesId: 'murena', area: BAY, respawnSeconds: [25, 45] },
  { speciesId: 'barracuda', area: BAY_HIGH, respawnSeconds: [12, 25] },
  { speciesId: 'scorfano', area: REEF, respawnSeconds: [20, 40] },
  { speciesId: 'pesce_napoleone', area: REEF, respawnSeconds: [30, 60] },
  { speciesId: 'tonno', area: REEF, respawnSeconds: [25, 50] },
  { speciesId: 'pesce_luna', area: FOREST, respawnSeconds: [40, 80] },
  { speciesId: 'scorfano', area: FOREST, respawnSeconds: [25, 50] },
  // more life near the surface (owner, 3 ottobre; pictures: lotto Gemini 2)
  { speciesId: 'cernia', area: BEACH_REEF, respawnSeconds: [15, 30] },
  { speciesId: 'pastinaca', area: BEACH_REEF, respawnSeconds: [20, 40] },
  { speciesId: 'pesce_leone', area: BEACH_REEF, respawnSeconds: [20, 40] },
  { speciesId: 'pesce_palla', area: BEACH_REEF, respawnSeconds: [20, 40] },
  { speciesId: 'cernia', area: BAY, respawnSeconds: [15, 30] },
  { speciesId: 'cernia', area: BAY, respawnSeconds: [20, 40] },
  { speciesId: 'pastinaca', area: BAY, respawnSeconds: [15, 30] },
  { speciesId: 'pastinaca', area: BAY, respawnSeconds: [20, 40] },
  { speciesId: 'squalo_nutrice', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'pesce_vela', area: SHALLOW_BAY, respawnSeconds: [35, 70] },
  { speciesId: 'barracuda', area: SHALLOW_BAY, respawnSeconds: [12, 25] },
  { speciesId: 'tonno', area: SHALLOW_BAY, respawnSeconds: [18, 35] },
  { speciesId: 'pesce_leone', area: REEF, respawnSeconds: [15, 30] },
  { speciesId: 'pesce_leone', area: SHALLOW_REEF, respawnSeconds: [20, 40] },
  { speciesId: 'medusa_gigante', area: SHALLOW_REEF, respawnSeconds: [20, 40] },
  { speciesId: 'medusa_gigante', area: REEF, respawnSeconds: [30, 60] },
  { speciesId: 'cernia', area: REEF, respawnSeconds: [20, 40] },
  { speciesId: 'squalo_nutrice', area: REEF, respawnSeconds: [30, 60] },
  { speciesId: 'medusa_gigante', area: FOREST, respawnSeconds: [30, 60] },
  // beasts that lived only out in the endless sea now visit the hand-made waters too (owner, 3 ottobre: "sentirlo vivo")
  { speciesId: 'pesce_spada', area: REEF, respawnSeconds: [40, 80] },
  { speciesId: 'squalo_volpe', area: REEF, respawnSeconds: [45, 90] },
  { speciesId: 'delfino', area: REEF, respawnSeconds: [30, 60] },
  { speciesId: 'delfino', area: SHALLOW_BAY, respawnSeconds: [35, 70] },
  // dolphins almost everywhere (owner, 4 ottobre)
  { speciesId: 'delfino', area: BAY_HIGH, respawnSeconds: [30, 60] },
  { speciesId: 'delfino', area: BEACH_REEF, respawnSeconds: [35, 70] },
  { speciesId: 'delfino', area: SHALLOW_REEF, respawnSeconds: [30, 60] },
  { speciesId: 'delfino', area: FOREST, respawnSeconds: [35, 70] },
  { speciesId: 'delfino', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [40, 80] },
  { speciesId: 'pastinaca', area: [delta(1960), 120, delta(2440), 215], respawnSeconds: [20, 40] },
  { speciesId: 'orca', area: ICY, respawnSeconds: [90, 180] }, // rare up north
  { speciesId: 'megattera', area: SHALLOW_REEF, respawnSeconds: [150, 300] }, // a rare whale passing over the reef
  { speciesId: 'capodoglio', area: ABYSS_EAST, respawnSeconds: [150, 300] }, // rare, hunting squid
  // the abysses: common, uncommon and rare beasts of the deep
  { speciesId: 'rana_pescatrice', area: ABYSS_BAY, respawnSeconds: [15, 30] },
  { speciesId: 'chimera', area: ABYSS_BAY, respawnSeconds: [15, 30] },
  { speciesId: 'dragone_nero', area: ABYSS_BAY, respawnSeconds: [20, 40] },
  { speciesId: 'granchio_ragno', area: ABYSS_BAY, respawnSeconds: [25, 50] },
  { speciesId: 'isopode_gigante', area: ABYSS_BAY, respawnSeconds: [20, 40] },
  { speciesId: 'squalo_capopiatto', area: ABYSS_BAY, respawnSeconds: [45, 90] },
  // the beasts of 15 ottobre 2026
  { speciesId: 'lampuga', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'foca_comune', area: BAY_HIGH, respawnSeconds: [40, 80] },
  { speciesId: 'foca_comune', area: ICY, respawnSeconds: [30, 60] },
  { speciesId: 'squalo_toro', area: BAY, respawnSeconds: [60, 110] },
  { speciesId: 'squalo_mako', area: REEF, respawnSeconds: [30, 60] },
  { speciesId: 'tartaruga_liuto', area: REEF, respawnSeconds: [40, 80] },
  { speciesId: 'squalo_balena', area: REEF, respawnSeconds: [120, 200] },
  { speciesId: 'squalo_elefante', area: ICY, respawnSeconds: [100, 180] },
  { speciesId: 'pesce_sega', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [60, 110] },
  { speciesId: 'squalo_leuca', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [70, 130] },
  { speciesId: 'squalo_goblin', area: ABYSS_BAY, respawnSeconds: [60, 120] },
  { speciesId: 'rana_pescatrice', area: ABYSS_EAST, respawnSeconds: [15, 30] },
  { speciesId: 'chimera', area: ABYSS_EAST, respawnSeconds: [15, 30] },
  { speciesId: 'dragone_nero', area: ABYSS_EAST, respawnSeconds: [20, 40] },
  { speciesId: 'granchio_ragno', area: ABYSS_EAST, respawnSeconds: [25, 50] },
  { speciesId: 'isopode_gigante', area: ABYSS_EAST, respawnSeconds: [20, 40] },
  { speciesId: 'squalo_capopiatto', area: ABYSS_EAST, respawnSeconds: [40, 80] },
  { speciesId: 'squalo_goblin', area: ABYSS_EAST, respawnSeconds: [50, 100] },
  { speciesId: 'calamaro_gigante', area: ABYSS_EAST, respawnSeconds: [90, 180] }, // rare
  // the Foresta Sommersa's own beasts (tappa 18, their pictures from lotto Gemini 1)
  { speciesId: 'anguilla_elettrica', area: FOREST, respawnSeconds: [25, 50] },
  { speciesId: 'polpo_gigante', area: FOREST, respawnSeconds: [40, 80] },
  { speciesId: 'lontra_marina', area: FOREST, respawnSeconds: [20, 40] },
  { speciesId: 'foca_leopardo', area: ICY, respawnSeconds: [25, 50] },
  // the endless sea: a few slots that bring out the residents near you (they live there already: quick)
  ...Array.from({ length: ENDLESS.wildSlots }, () => ({
    speciesId: 'barracuda',
    area: [ENDLESS.startX, 0, ENDLESS.startX, 0] as [number, number, number, number],
    respawnSeconds: [1, 3] as [number, number],
    endless: true,
  })),
];

/**
 * How dangerous each species is (owner, 4 ottobre 2026: "Pokémon with real fear of some sea creatures"): the danger
 * sets a band of levels, the same wherever it is met. A white shark near the shore is still a superpredator. The
 * region and the depth only move it within its band (DANGER_RULES), albino and alfa add more. Tuning.
 */
export type Danger = 1 | 2 | 3 | 4 | 5;
export const DANGER_NAMES: Record<Danger, string> = {
  1: 'Innocuo',
  2: 'Piccolo predatore',
  3: 'Predatore serio',
  4: 'Superpredatore',
  5: 'Gigante preistorico',
};
export const DANGER_LEVELS: Record<Danger, [number, number]> = {
  1: [2, 12],
  2: [8, 20],
  3: [20, 35],
  4: [35, 55],
  5: [55, 75],
};
/** The danger of each species met in the wild (unlisted: from its size, see dangerOf). */
export const SPECIES_DANGER: Record<string, Danger> = {
  // 1 — harmless
  barracuda: 1, tartaruga_marina: 1, torpedine: 1, pesce_palla: 1, cernia: 1, pastinaca: 1, squalo_nutrice: 1,
  tonno: 1, delfino: 1, pesce_luna: 1, manta: 1, lontra_marina: 1, chimera: 1, granchio_ragno: 1,
  isopode_gigante: 1, pesce_napoleone: 1, lampuga: 1, foca_comune: 1, tartaruga_liuto: 1,
  // 2 — small predators
  murena: 2, pesce_leone: 2, medusa_gigante: 2, pesce_vela: 2, scorfano: 2, rana_pescatrice: 2, dragone_nero: 2,
  tricheco: 2, elefante_marino: 2, beluga: 2, varano_nilo: 2, anguilla_elettrica: 2, narvalo: 2, pesce_sega: 2,
  squalo_balena: 2, squalo_elefante: 2,
  // 3 — serious predators (and the great whales: majestic, not to be taken lightly)
  squalo_martello: 3, squalo_tigre: 3, squalo_volpe: 3, coccodrillo_nilo: 3, pesce_spada: 3, foca_leopardo: 3,
  polpo_gigante: 3, squalo_capopiatto: 3, squalo_goblin: 3, megattera: 3, squalo_toro: 3, squalo_leuca: 3, squalo_mako: 3,
  // 4 — superpredators
  squalo_bianco: 4, orca: 4, coccodrillo_marino: 4, capodoglio: 4, calamaro_gigante: 4,
  // 5 — prehistoric giants
  calamaro_colossale: 5, serpente_di_mare: 5, mosasauro: 5, plesiosauro: 5, megalodonte: 5, kraken: 5, dunkleosteus: 5,
  livyatan: 5, leviatano: 5,
};
/**
 * The hand-made waters, from Portofosco to the open sea (owner, 22 ottobre 2026: "bestie fino a circa livello 30 per
 * imparare e far crescere le bestie basse"): levels from `byDanger` (by danger; the others keep their band), the
 * low ones more often (t^`lowBias`). Tuning.
 */
export const COAST_LEVELS = {
  byDanger: { 1: [2, 20], 2: [8, 30] } as Partial<Record<Danger, [number, number]>>,
  lowBias: 1.6,
};

export const DANGER_RULES = {
  /** Where in its band a beast falls: 0 = the bottom (the coast) … this share is added by the region's bandAt and
   *  the depth, then a random spread on top. */
  spread: 0.35,
  depthPerShare: 1500, // metres of depth for +1 share of the band (so 300 m = +0.2)
  depthMax: 0.2,
  variantExtra: { comune: 0, albino: 8, alfa: 12 } as Record<string, number>,
  /** A wild beast this many levels above your strongest one shows a danger warning. */
  warnGap: 8,
};

/**
 * Where in the water column a species lives, for the endless sea (owner, 3 ottobre): deep ones come only when
 * you are deeper than minM, shallow ones only when you are above maxM; they appear within those depths.
 */
export const SPECIES_DEPTH: Record<string, { minM?: number; maxM?: number }> = {
  rana_pescatrice: { minM: 120 },
  chimera: { minM: 120 },
  dragone_nero: { minM: 120 },
  granchio_ragno: { minM: 120 },
  squalo_capopiatto: { minM: 100 },
  lampuga: { maxM: 100 },
  squalo_mako: { maxM: 300 },
  pesce_sega: { maxM: 100 },
  foca_comune: { maxM: 150 },
  squalo_goblin: { minM: 120 },
  isopode_gigante: { minM: 120 },
  calamaro_gigante: { minM: 150 },
  pesce_vela: { maxM: 60 },
  medusa_gigante: { maxM: 80 },
  pesce_leone: { maxM: 80 },
  // owner, 4 ottobre: real habitats (a white shark is never met in the abyss)
  squalo_bianco: { maxM: 250 },
  squalo_martello: { maxM: 250 },
  squalo_tigre: { maxM: 300 },
  orca: { maxM: 300 },
  megattera: { maxM: 200 },
  delfino: { maxM: 200 },
  tonno: { maxM: 300 },
  manta: { maxM: 150 },
  tartaruga_marina: { maxM: 150 },
  pesce_luna: { maxM: 200 },
  barracuda: { maxM: 100 },
  pesce_palla: { maxM: 60 },
  foca_leopardo: { maxM: 150 },
  beluga: { maxM: 300 },
  tricheco: { maxM: 100 },
  lontra_marina: { maxM: 40 },
  pesce_spada: { maxM: 600 },
};

/** At most this many wild beasts are around you at the same time (tuning). */
export const WILD_RULES = {
  maxPresent: 8, // owner, 3 ottobre: more life (was 5)
  /** A wild beast counts as seen (bestiary) only this close to you, in your light (units). */
  seenRadius: 90,
  /** Beasts come out of the dark and go back into it only this far (units) beyond the edge of the screen, so you
   *  never see one pop up or vanish (owner, 9 ottobre: in the U-Boat they appeared on screen). */
  viewMargin: 90,
  /**
   * Who comes when there is room (owner, 4 ottobre: "you always see the same beasts"): a fair draw among the beasts
   * ready to come, not the first of the list. Weight by stars (common ones much more often)…
   */
  rarityWeight: { 1: 10, 2: 6, 3: 3, 4: 1.2, 5: 0.5 } as Record<number, number>,
  /** …less for a species already in the water, or among the last ones that came. */
  presentMult: 0.35,
  recentMult: 0.3,
  recentMemory: 5,
  /** For the map's shares: a beast that takes long to come back counts less (seconds of a "quick" one). */
  quickRespawn: 30,
  minAvailability: 0.15,
};

/** Packs (block 5b, owner 9 ottobre 2026): the beasts with a `school` swim with that many mates. Aggressive packs
 *  fight together (the others come into the battle one after the other, each a level apart at most); the pack
 *  hunters go after the sardine schools near them and bite the fish their mouth touches; orcas chase wild beasts far
 *  smaller than themselves (only a chase: nobody is eaten). Tuning. */
export const PACK_RULES = {
  fightTogether: 'aggressive' as Temper,
  levelSpread: 1,
  hunters: ['barracuda', 'orca', 'tonno', 'delfino'],
  /** Units: how close a school must be to be hunted; how close to the mouth a fish is bitten. */
  huntRange: 260,
  biteRadius: 9,
  /** Who chases beasts this many times shorter than itself (or less), this close (units). */
  preyOf: { orca: 0.5 } as Record<string, number>,
  preyRange: 320,
  /** Seconds between two looks for something to hunt. */
  lookSeconds: 1.5,
};

/** Temperament: 'aggressive' swims at you, 'calm' ignores you, 'shy' slips away (rare ones are always shy). */
export type Temper = 'aggressive' | 'calm' | 'shy';
export const BEAST_TEMPER: Record<
  string,
  { temper: Temper; speedMult?: number; surface?: boolean; floor?: boolean; school?: number }
> = {
  squalo_bianco: { temper: 'aggressive' },
  barracuda: { temper: 'aggressive', school: 3 }, // swims in a small school (the others follow the leader)
  tartaruga_marina: { temper: 'calm', speedMult: 0.6 },
  torpedine: { temper: 'shy', speedMult: 0.7 },
  coccodrillo_marino: { temper: 'aggressive', speedMult: 0.8, surface: true }, // cruises just under the surface
  squalo_tigre: { temper: 'aggressive' },
  squalo_martello: { temper: 'aggressive', speedMult: 0.9 },
  pesce_palla: { temper: 'shy', speedMult: 0.5 },
  anguilla_elettrica: { temper: 'aggressive', speedMult: 0.9 }, // the forest (tappa 18)
  cernia: { temper: 'calm', speedMult: 0.6 }, // more life (3 ottobre)
  pastinaca: { temper: 'shy', speedMult: 0.7 },
  pesce_leone: { temper: 'calm', speedMult: 0.5 },
  squalo_nutrice: { temper: 'calm', speedMult: 0.6 },
  medusa_gigante: { temper: 'calm', speedMult: 0.3 },
  pesce_vela: { temper: 'shy', speedMult: 1.4 },
  chimera: { temper: 'shy', speedMult: 0.7 },
  squalo_capopiatto: { temper: 'aggressive', speedMult: 0.8 },
  lampuga: { temper: 'shy', speedMult: 1.2, school: 3 },
  pesce_sega: { temper: 'calm', speedMult: 0.7, floor: true },
  tartaruga_liuto: { temper: 'calm', speedMult: 0.6 },
  squalo_balena: { temper: 'calm', speedMult: 0.5 },
  squalo_elefante: { temper: 'calm', speedMult: 0.5 },
  squalo_mako: { temper: 'aggressive', speedMult: 1.35 }, // the fastest shark
  squalo_toro: { temper: 'calm', speedMult: 0.8 },
  squalo_leuca: { temper: 'aggressive' },
  foca_comune: { temper: 'shy', speedMult: 1.05 },
  plesiosauro: { temper: 'aggressive', speedMult: 0.9 },
  dragone_nero: { temper: 'aggressive', speedMult: 0.9 },
  granchio_ragno: { temper: 'calm', speedMult: 0.4, floor: true }, // crabs walk on the floor (owner, 8 ottobre)
  rana_pescatrice: { temper: 'aggressive', speedMult: 0.5 },
  isopode_gigante: { temper: 'calm', speedMult: 0.4, floor: true }, // it crawls on the floor too
  squalo_goblin: { temper: 'aggressive', speedMult: 0.9 },
  calamaro_gigante: { temper: 'aggressive', speedMult: 0.9 },
  polpo_gigante: { temper: 'shy', speedMult: 0.7 },
  lontra_marina: { temper: 'shy', speedMult: 1.1 },
  murena: { temper: 'aggressive', speedMult: 0.8 },
  manta: { temper: 'calm', speedMult: 0.8 },
  orca: { temper: 'aggressive', speedMult: 1.1, school: 2 }, // a small pod
  megattera: { temper: 'calm', speedMult: 0.7 },
  capodoglio: { temper: 'calm', speedMult: 0.6 },
  tonno: { temper: 'shy', speedMult: 1.2, school: 4 },
  delfino: { temper: 'calm', speedMult: 1.2, school: 2 },
  pesce_luna: { temper: 'calm', speedMult: 0.4 },
  scorfano: { temper: 'calm', speedMult: 0.3 }, // waits among the rocks
  pesce_napoleone: { temper: 'calm', speedMult: 0.6 },
  pesce_spada: { temper: 'aggressive', speedMult: 1.2 },
  squalo_volpe: { temper: 'aggressive' },
  foca_leopardo: { temper: 'aggressive', speedMult: 1.05 },
  beluga: { temper: 'calm', speedMult: 0.8, school: 1 },
  narvalo: { temper: 'shy', speedMult: 0.9 },
  tricheco: { temper: 'calm', speedMult: 0.6 },
  elefante_marino: { temper: 'calm', speedMult: 0.7 },
  varano_nilo: { temper: 'aggressive', speedMult: 0.9, surface: true },
  coccodrillo_nilo: { temper: 'aggressive', speedMult: 0.8, surface: true },
};

/** The beast you ride, or that follows you, eats the small fish it meets (food chain): into your bag. */
export const FEEDING = {
  reachFrac: 0.22, // × body length, around the head…
  minReach: 6, // …but at least this many units (a 1 m beast would never catch anything)
  interval: 0.25, // seconds between bites
  gulpFrom: 3, // this many fish in one bite: the mouth opens wide and a cloud of scales and bubbles bursts out
};

/** Filter feeders: a mouth `filterReachMult` × wider when they eat a school (owner, 21 ottobre: "quante sardine mangia"). */
export const FILTER_FEEDERS: readonly string[] = ['squalo_balena', 'squalo_elefante', 'megattera', 'manta'];

/**
 * What sets one mount apart from another (docs/PROPOSTA-RUOLI.md, owner 21 ottobre 2026). How deep it takes you
 * (`depthM` by its type, × up to `giantDepthMult` for a giant: rideMotion size 1); its talent in the sea by its type;
 * the superpredators' fear: a superpredator (a Predatore of `apexRarity` stars or more, or one of `apexExtra`) with
 * `fearLevels` levels or more over a wild beast keeps it away and makes it try to flee `fleeTries` times in battle
 * (each `fleeChance`); a legendary one with `frozenLevels` more freezes it with fear for its first turn. The Tempesta's
 * dash stuns wild beasts smaller than `stunSizeShare` of it within `stunReachMult` × its length for `stunSeconds`;
 * the Abissale's light is `abyssLampMult` × longer. The bars on the sheet go 1 … 5 between the `bars` ranges. Tuning.
 */
export const RIDE_TALENTS = {
  depthM: { abissale: 900, glaciale: 450, corazzato: 400, predatore: 250, tempesta: 200 } as Record<string, number>,
  giantDepthMult: 1.5,
  filterReachMult: 1.6,
  apexRarity: 3, // the white shark (3 stars), Zannarossa, the megalodon, Livyatan; with apexExtra the orca
  apexExtra: ['orca'] as readonly string[],
  fearLevels: 30,
  frozenLevels: 10,
  fleeTries: [1, 2] as [number, number],
  fleeChance: 0.5,
  stunReachMult: 1.5,
  stunSizeShare: 0.6,
  stunSeconds: 6,
  abyssLampMult: 1.6,
  bars: {
    speed: [0.6, 1.2] as [number, number], // its riding speed over the white shark's
    stamina: [3, 9] as [number, number], // dashes before it is worn out
    bite: [6, 36] as [number, number], // units its mouth reaches (log scale)
    depth: [200, 1350] as [number, number], // metres
  },
};

/** Each type's talent when ridden, as the sheet tells it (RIDE_TALENTS). */
export const RIDE_TALENT_TEXT: Record<string, { name: string; text: string }> = {
  predatore: { name: 'Assalto', text: 'Se tocchi una bestia mentre scatti, perde il primo turno.' },
  corazzato: { name: 'Ariete', text: 'Sfonda sempre le ossa antiche.' },
  tempesta: { name: 'Scarica', text: 'Quando scatta, stordisce le bestie più piccole vicine.' },
  glaciale: { name: 'Rompighiaccio', text: 'Rompe il ghiaccio degli iceberg.' },
  abissale: { name: 'Occhi del buio', text: 'La tua luce arriva molto più lontano.' },
};

/**
 * The pack (owner, 21 ottobre 2026, docs/PROPOSTA-RUOLI.md): besides the beast you ride, up to `size` companions swim
 * with you. Each hunts the fish in view within `huntReach` of you (a bite every `eatInterval` s), and the pack makes
 * the small wild beasts go round it: one shorter than `scareShare` of the biggest companion, and of a lower level.
 * The second companion keeps `slotBelow` × its length lower. Their powers by type:
 * - Predatore: hunts `hunterReachMult` × farther and `hunterBiteMult` × as often;
 * - Corazzato: the pressure hurts you `shellDepthM` + `shellDepthPerLevel` × its level metres deeper;
 * - Tempesta: scares wild beasts up to `stormScareShare` of it, and no wild beast takes you by surprise;
 * - Glaciale: every `echoSeconds` an echo shows the wild beasts within `echoReach` units of you, hidden in the dark;
 * - Abissale: a light around you `lanternRadius` + `lanternPerLevel` × its level units wide. Tuning.
 */
export const PACK = {
  size: 2,
  huntReach: 140,
  eatInterval: 0.6,
  scareShare: 0.9,
  slotBelow: 0.6,
  huntSpacing: 1.2, // a second companion hunts a fish at least this × the first one's length away from its fish
  hunterReachMult: 1.6,
  hunterBiteMult: 2,
  shellDepthM: 100,
  shellDepthPerLevel: 3,
  stormScareShare: 1.4,
  echoSeconds: 4,
  echoReach: 420,
  lanternRadius: 40,
  lanternPerLevel: 0.8,
  /** Aboard a ship or a boat (owner, 22 ottobre: "segue la nave, poi va"): the pack swims alongside it below this
   *  speed (units/s, about 8 knots: "Avanti adagio"); faster, diving or in the submarine, it swims off. */
  followShipBelow: 75,
};

/** Each type's power in the pack, as the sheet tells it (PACK). */
export const PACK_POWER_TEXT: Record<string, { name: string; text: string }> = {
  predatore: { name: 'Caccia', text: 'Caccia i pesci più lontano e più in fretta.' },
  corazzato: { name: 'Guscio', text: 'Con lui la pressione ti fa male solo più in profondità.' },
  tempesta: { name: 'Scarica', text: 'Tiene lontani anche predatori più grandi; nessuno ti prende di sorpresa.' },
  glaciale: { name: 'Eco', text: 'Ogni tanto ti mostra le bestie nascoste nel buio vicino a te.' },
  abissale: { name: 'Lanterna', text: 'Fa luce attorno a te, più ampia con il suo livello.' },
};

/** A beast's body in the water (hits, collisions). */
export const BEAST_BODY = {
  headRadiusFrac: 0.13, // around the head, × body length
  bodyThicknessFrac: 0.1, // half thickness of the body, × body length
  collideRadiusFrac: 0.07, // radius used against rock at the middle of the body, × body length (no outline known)
  /** With its real outline (bodyShapes.generated.ts): each circle covers this share of the body's height there
   *  (a little less than all: fins and the tips of the tail may brush the rock). Tuning. */
  shapeFill: 0.85,
  /**
   * Against rock the whole body counts, not only its middle (owner, 4 ottobre: big beasts sank into reefs and the
   * floor): circles along the spine, at these places (share of the length from the middle, + towards the head)
   * and with these shares of the middle radius (slimmer to the nose and tail).
   */
  collideAlong: [
    [-0.4, 0.45],
    [-0.2, 0.8],
    [0, 1],
    [0.2, 0.85],
    [0.4, 0.55],
  ] as [number, number][],
  weaponHitMargin: 1.5, // units: a weapon tip this close to the body hits
  hitFlashSeconds: 0.15,
};

/**
 * Swimming on your own (owner, 22 ottobre 2026, the "battaglie a nuoto" proposal): a hunter that reaches you bites
 * (a heart, a `push` in units/s away), then leaves you `truce` seconds before it comes again (× `gentleTruce` while
 * your strongest beast is below `gentleUntilLevel`: the start of the game is easy). While one is after you within
 * `engageRadius` units you can face it (the context button, or a tap on one of your beasts). Tuning.
 */
export const SWIM_BITE = { push: 90, truce: 2.5, gentleTruce: 2, gentleUntilLevel: 12, engageRadius: 160 };

/** Riding: call a mount from your team, it swims to you and you climb on (tuning). */
export const TEAM_RULES = {
  levelWithoutTeam: 1, // your "strongest beast" level when the team is empty (taming difficulty)
  summonDistance: 90, // it arrives from at least this far behind you (from just off the screen: mount.ts callMount)
  arriveSeconds: 4, // at most this long to reach you
  /**
   * Swimming to you (owner, 22 ottobre 2026: climbing on must be smooth): at most `speed` diver lengths/s, slowing
   * by `slowing` per second of distance, steering `steer` per second; it is there within `reach` × its length and
   * at most `reachSpeed` diver lengths/s faster than you (a companion within `joinReach` × its length joins you).
   * Climbing on then takes `mountSeconds`; climbing down you push off at `dismountPush` units/s. Going away it swims off at `leaveSpeed` diver lengths/s; still in sight
   * after leaveSeconds × `leaveFallback` it fades.
   */
  arrive: { speed: 14, slowing: 2.5, steer: 4, reach: 0.15, reachSpeed: 1.5, joinReach: 1 },
  mountSeconds: 0.35,
  dismountPush: 22,
  leaveSpeed: 12,
  leaveFallback: 3,
  /**
   * A companion swims around you, inside the lamp halo: behind you (× its length + gap units) the way you travel,
   * your way of travel smoothed over travelSeconds (moving faster than travelMin diver lengths/s); it wanders a
   * little (× its length) and turns only when it swims faster than turnSpeed diver lengths/s. Spring rate: speed.
   */
  follow: { behind: 0.5, gap: 4, below: 5, speed: 1.6, travelSeconds: 1.5, travelMin: 1.2, wander: 0.15, turnSpeed: 1.5 },
  followFreeAfter: 3, // × its length: left farther behind than this, it catches up straight through (no getting stuck)
  leaveSeconds: 1.5,
  riderOffset: [-0.02, -0.13] as [number, number], // where you sit, × body length (forward, up)
  /** Your beast turns around like a real one seen from the side: nose up (or down) through the vertical and back. */
  turnSeconds: 0.6, // turning around sideways, head first (owner, 3 ottobre: no more loop through the vertical)
  /** Your beast leans into the way it swims, up to nearly vertical when you dive straight down (radians). */
  pitchMax: 1.25,
  rideSpeedMult: 0.48, // tuning: riding speed × the beast's speed stat (tappa 10: a white shark ~55 u/s, 1.3× the diver; was 1.6)
  rideSprintMult: 1.45, // holding the dash button: the beast keeps a faster pace, tiring it (RIDE_MOTION.stamina)
};

/** What mounts can do while you ride them (abilities in species.ts). */
export const ABILITIES = {
  sfondaOssa: { reach: 34, radius: 30 }, // breaks ancient bones this close to the head (or to you, if it follows you)
  /**
   * Sfondamento (owner, 2 ottobre): every Predatore or Corazzato learns it at level 16 and breaks ancient bones
   * like the white shark, ridden or swimming with you. Near bones you cannot break, a hint says what is needed.
   */
  sfondamento: { name: 'Sfondamento', types: ['predatore', 'corazzato'] as string[], level: 16 },
  boneHint: { reach: 70, everySeconds: 25 },
};

/** Sprite frame of big beasts (docs/ART.md). */
export const BEAST_SPRITE = {
  frameW: 1000,
  frameH: 460,
  spineY: 250,
  segments: 26,
  /**
   * Whales and dolphins beat their tail up and down (owner): only the back of the body bends (from `from`, share of
   * the length from the head), up to `amp` radians at the flukes; the thick front stays whole (bending it opened gaps
   * between the pieces of the picture). Tuning.
   */
  whaleWave: { amp: 0.3, from: 0.6, waves: 1.2 },
  /**
   * Serpents and eels (owner, 15 ottobre: Folgore stretched and shrank going up and down, and should move like a
   * snake): a wave runs along the whole body, head to tail, each piece keeping its length. `amp` radians at the tail,
   * `head` share of it at the head. Tuning.
   */
  serpentWave: { amp: 0.32, head: 0.25, waves: 1.6 },
  /**
   * Octopuses and squids (owner, 20 ottobre: "troppo statici, non muovono i tentacoli"): the mantle (the head, the
   * front `from` of the picture) stays whole; down the arms runs a slow wave growing to the tips (`amp` radians,
   * `waves` along them), every piece its full length; with each stroke of their jet the arms open and close across
   * (`spread`: × their height at the most), `pulse` strokes per swimming cycle. Tuning.
   */
  cephalopodWave: { from: 0.42, amp: 0.26, waves: 1.4, spread: 0.18, pulse: 0.5 },
  /** Crabs walking on the floor: no wave down the body, a little step up and down (picture pixels). Tuning. */
  walkerStep: 6,
};

/**
 * How a beast you ride swims (systems/rideMotion.ts, stamina.ts; owner, 21 ottobre 2026: "da 0 a 100 in un attimo… in
 * base all'animale… una barra di stamina"). Each value goes from a small beast (`small`, `size` 0: `sizeM`[0] metres or
 * less) to a giant (`big`, `size` 1: `sizeM`[1] metres or more), on a log scale of its length:
 * - `accelSeconds` to reach its top speed from still, the stick held; `glide` how fast it slows without it (per s);
 * - its dash: up to `boost` × its top speed, rising in `rise` s and fading in `decay` s; `cooldown` s before the next;
 * - `leap` × the highest leap out of the water (RIDE_BREACH.maxLeapSpeed);
 * - `turnGrip` (per second): how fast the sideways drift of a turn fades;
 * - its stamina: `dashes` dashes empty it (fast beasts fewer: × (1 − `fastTires` × how fast it is)); holding the faster
 *   pace costs `sprintDashesPerSec` dashes a second; it refills in `regenSeconds`; empty, it swims at `exhaustedShare`
 *   of its speed with no dash until full again, `exhaustedSeconds` later. How fast: its speed over the white shark's,
 *   0 at `fastFrom`, 1 at `fastTo`. Tuning.
 */
export const RIDE_MOTION = {
  sizeM: [3, 20] as [number, number],
  small: { accelSeconds: 0.6, glide: 1.6, boost: 2.3, rise: 0, decay: 0.5, cooldown: 1.2, leap: 0.85, dashes: 5 },
  big: { accelSeconds: 2.5, glide: 0.6, boost: 1.7, rise: 0.4, decay: 1.5, cooldown: 2.2, leap: 1.3, dashes: 9 },
  fastFrom: 0.7,
  fastTo: 1.5,
  fastTires: 0.35,
  turnGrip: 4, // how fast the sideways drift of a turn fades (per second)
  stamina: { sprintDashesPerSec: 0.5, regenSeconds: 25, exhaustedSeconds: 60, exhaustedShare: 0.45 },
};

/**
 * How fast each beast you can ride really swims (km/h, its fast cruise or short burst; owner, 15 ottobre: "diversi
 * animali, diverse velocità realistiche"). Riding speed follows it, softened (square root) so a slow one is still
 * worth riding and a fast one does not fly off the screen: the white shark (40 km/h) keeps the speed it had.
 * Real figures: sailfish ~100, orca ~56, sperm whale ~37, humpback ~27, manta ~24, narwhal ~22, saltwater
 * crocodile ~29 in bursts; prehistoric ones guessed from their living kin. Tuning.
 */
export const RIDE_KMH: Record<string, number> = {
  squalo_bianco: 40,
  squalo_martello: 40,
  squalo_capopiatto: 40,
  pesce_vela: 100,
  orca: 56,
  capodoglio: 37,
  megattera: 27,
  manta: 24,
  narvalo: 22,
  coccodrillo_marino: 29,
  archelon: 15,
  folgore: 42,
  zannarossa: 45,
  squarcio: 42,
  rocciaguscio: 18,
  saetta: 32,
  piovra: 25,
  mosasauro: 40,
  plesiosauro: 30,
  squalo_leuca: 35,
  squalo_balena: 15,
  squalo_elefante: 12,
  megalodonte: 40,
  livyatan: 37,
  leviatano: 45,
};
/** The reference: a beast of RIDE_KMH.squalo_bianco km/h swims as fast as the white shark did. */
export const RIDE_REF_KMH = 40;

/** The beasts drawn with the serpent's wave (BEAST_SPRITE.serpentWave). */
export const SERPENTS: readonly string[] = ['folgore', 'saetta', 'murena', 'anguilla_elettrica', 'serpente_di_mare'];


/** The beasts drawn with the octopus's arms (BEAST_SPRITE.cephalopodWave). */
export const CEPHALOPODS: readonly string[] = ['polpo_gigante', 'calamaro_gigante', 'calamaro_colossale', 'piovra', 'kraken'];

/** Whales and dolphins: they swim with an up-and-down tail and lend you their air (RIDE_AIR). */
export const CETACEANS: readonly string[] = ['megattera', 'capodoglio', 'livyatan', 'orca', 'beluga', 'narvalo', 'delfino'];
/** Uniques of a whale species that swim like a shark, the tail side to side (owner, 8 ottobre: the prehistoric albino
 *  orca). Their air while you ride them stays a whale's. */
export const SIDE_TAIL_UNIQUES: readonly string[] = ['orca_preistorica_albina'];

/**
 * Riding a whale (owner, 4 ottobre): the air bar is the whale's, bigger and lasting longer than yours, but it too
 * has to come up to breathe; empty, you are back on your own air. × your air, by species. Away from you it breathes
 * again (refillPerSec of its bar). Tuning.
 */
/**
 * The surface for a beast you ride (systems/breach.ts; owner, 16 and 19 ottobre 2026: a leap like Angry Shark, but
 * natural water, no wall): between its swimming line and the surface a `spring` (per second², × units out) pulls it
 * down and `surfaceDrag` (per second) slows it; out of the water it falls under `gravity` (units/s²). Spray and
 * splash only from `sprayFrom` units/s. A gull caught in the air heals it by `birdHealShare` of its health. Tuning: at its
 * pace a little hop, sprinting a few metres, a dash about 8-10 m (tests/lottoL.test.ts).
 */
export const RIDE_BREACH = {
  spring: 7,
  surfaceDrag: 1.2,
  pushAtSurface: 0.5, // of your push up, left at the surface
  maxLeapSpeed: 112, // units/s out of the water at most
  gravity: 130,
  sprayFrom: 45,
  birdHealShare: 0.08,
  /** Its jaws open this many seconds on a gull caught, and already when one is within `birdBiteReach` × the reach
   *  of its mouth (owner, 20 ottobre: "devono aprire la bocca"). */
  birdJawSeconds: 0.45,
  birdBiteReach: 2.2,
  /** A leap that lands on something out of the water (the ship, an iceberg, an islet; owner, 21 ottobre): it hops
   *  `landHop` units/s up and slides back the way it came at `slideSpeed` units/s until it falls in the sea. */
  landHop: 30,
  slideSpeed: 70,
};

/** Forms whose two profile pictures are wings up and down, not a mouth shut and open (owner, 19 ottobre: the
 *  manta's final form): they alternate as it swims, and it never "bites" with them. */
export const WING_FRAME_FORMS: readonly string[] = ['manta_finale'];

export const RIDE_AIR = {
  // owner, 9 ottobre: the whales no longer lend you air (the submarines and U-Boats are for long dives); was
  // { megattera: 5, capodoglio: 7, livyatan: 8, orca: 3, beluga: 2.5, narvalo: 2.5 }
  bySpecies: {} as Record<string, number>,
  refillAwayPerSec: 0.05,
};

/** The test gallery (systems/gallery.ts; owner, 19 ottobre 2026): where its throwaway game starts, the beast you
 *  fight with, how long a beast shown in the sea stays calm. Part of the test tools, to be removed with them. */
export const GALLERY = {
  bayX: 900, // units into the bay: open water
  depth: 120, // units under the surface
  fighter: { speciesId: 'squalo_bianco', variant: 'comune' as const, final: true },
  calmSeconds: 600,
  respawnSeconds: 5,
};

/**
 * Who carries you (owner, 22 ottobre 2026: "pensare che animali sono cavalcature e che animali sono compagni"; his
 * choice: by size): a beast at least `minLengthM` long (more than twice the diver) with a back to hold on to; the
 * ones with none (`noBack`) only ever swim at your side, the great squids and the Kraken carry you sitting on their
 * head (`onHead`, as far forward as the Piovra). Smaller ones are companions. The starters' second stages
 * (rideSpeedMult in species.ts) and RIDEABLE_FORMS carry you too. Tuning.
 */
export const MOUNT_RULE = {
  minLengthM: 4.5,
  noBack: ['medusa_gigante', 'granchio_ragno', 'isopode_gigante', 'polpo_gigante'] as readonly string[],
  onHead: ['calamaro_gigante', 'calamaro_colossale', 'kraken'] as readonly string[],
  headForward: 0.3,
};

/** Forms you can ride though their species only swims at your side: grown big enough (owner, 20 ottobre). Keys as
 *  formKey (systems/beasts/forms.ts). */
export const RIDEABLE_FORMS: readonly string[] = ['varano_nilo_albino_finale', 'pesce_spada_finale', 'tartaruga_preistorica'];
