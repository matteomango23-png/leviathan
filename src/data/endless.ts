// Leviatano — the endless open sea east of the Mare di Ghiaccio (tappa 11, owner's decisions of 1-2 ottobre
// 2026). Past the hand-made coast the sea goes on forever, generated piece by piece from a fixed seed (the same
// sea every time): stretches ("tratti") of different kinds follow one another, the farther the deeper. Which
// kinds come where is set by the regions of the 30 km ocean (regions.ts), the levels by each species' danger
// (beasts.ts). Values marked "tuning" are a first pass: change them here, never in systems.
import { WORLD } from './worldLayout';

export type BiomeId = 'aperto' | 'barriera' | 'foresta' | 'ghiaccio' | 'fossa';

export interface BiomeDef {
  id: BiomeId;
  /** The zone's name on screen and on the map. */
  name: string;
  /** Sea floor depth (world y) in the middle of a stretch, before it gets deeper with distance. */
  floorY: number;
  waves: { amp: number; freq: number }[];
  noise: number;
  /** Rock mounds standing on the floor: how many per stretch, their size (units). */
  mounds: { count: number; rx: [number, number]; ry: [number, number] };
  /** Kelp on rock tops: chance per top tile and strand heights. */
  kelp: { chance: number; minH: number; maxH: number };
  /** Coral colours on rock tops (empty: the usual dim ones). */
  corals: { chance: number; colors: string[] };
  /** An ice ceiling under the surface, with breathing holes, and ice pillars hanging from it. */
  ice?: { ceilingY: number; holeEvery: number; holeWidth: number; pillars: number };
  /** A deep trench in the middle of the stretch: its floor (world y) and width (share of the stretch). */
  trench?: { floorY: number; width: number };
  /** Wild beasts: species and how often each comes (only species with side pictures, see tests). */
  beasts: Record<string, number>;
}

export const ENDLESS = {
  seed: 7177, // tuning: change it to get another sea
  startX: WORLD.cols * WORLD.tileSize, // the hand-made world ends here (east of the Mare di Ghiaccio)
  chunkCols: 64, // tiles generated together
  maxX: 30 * 1000 * WORLD.unitsPerMetre + 300, // units: the sea ends 30 km from the beach (regions.ts)
  endWall: 160, // units before maxX where a cliff closes the world
  stretch: 1800, // units (300 m): the length of a stretch of one kind
  blend: 320, // units: the floor of one stretch blends into the next over this
  deepenPerKm: 60, // units of floor depth added per km from the coast (tuning)
  maxFloorY: 4300, // the floor never goes deeper (WORLD.rows bounds the map)
  firstFloorY: 390, // the hand-made floor at the start (worldLayout, east zone): the first stretch blends from it
  wildSlots: 8, // wild beasts that can be around you out there at once (owner, 3 ottobre: more life; was 5)
  schools: 9, // sardine schools that follow you out there (moved ahead of you when left far behind)
  schoolFar: 900, // units: a school this far from you is moved near you again
  /** Vents on the sea floor breathing out columns of air bubbles: swim into one to refill your air. */
  vents: { perStretch: 2, tries: 8, height: 240, radius: 22, refill: 25, messageBelow: 0.6 },
};

export const BIOMES: BiomeDef[] = [
  {
    id: 'aperto',
    name: 'Mare aperto',
    floorY: 560,
    waves: [{ amp: 60, freq: 0.0021 }, { amp: 14, freq: 0.013 }],
    noise: 50,
    mounds: { count: 2, rx: [30, 70], ry: [30, 90] },
    kelp: { chance: 0.12, minH: 10, maxH: 40 },
    corals: { chance: 0.1, colors: [] },
    beasts: { tonno: 3, barracuda: 2, delfino: 2, tartaruga_marina: 2, manta: 1.2, pesce_luna: 1, pesce_spada: 1, squalo_martello: 1, squalo_tigre: 1, squalo_volpe: 0.8, squalo_bianco: 0.5, megattera: 0.4, pesce_vela: 1.5, medusa_gigante: 1.5, squalo_nutrice: 1, cernia: 1, squalo_capopiatto: 0.8, chimera: 0.8 },
  },
  {
    id: 'barriera',
    name: 'Barriera lontana',
    floorY: 330,
    waves: [{ amp: 20, freq: 0.006 }],
    noise: 60,
    mounds: { count: 9, rx: [25, 60], ry: [25, 70] },
    kelp: { chance: 0.15, minH: 10, maxH: 30 },
    corals: { chance: 0.6, colors: ['#d0584e', '#e8a547', '#d98cb8', '#5fc4b3'] },
    beasts: { pesce_palla: 3, scorfano: 2, pesce_napoleone: 2, murena: 2, tartaruga_marina: 2, torpedine: 2, squalo_martello: 1, manta: 1, pesce_luna: 0.5, pesce_leone: 2.5, cernia: 2, medusa_gigante: 1.5, squalo_nutrice: 1.5, pastinaca: 1.5 },
  },
  {
    id: 'foresta',
    name: 'Foresta di alghe',
    floorY: 440,
    waves: [{ amp: 30, freq: 0.004 }],
    noise: 50,
    mounds: { count: 5, rx: [30, 60], ry: [40, 90] },
    kelp: { chance: 0.85, minH: 40, maxH: 130 },
    corals: { chance: 0.05, colors: [] },
    beasts: { barracuda: 3, squalo_tigre: 2, murena: 2, scorfano: 1.5, delfino: 1, torpedine: 1, anguilla_elettrica: 1.5, polpo_gigante: 1, lontra_marina: 1.5 },
  },
  {
    id: 'ghiaccio',
    name: 'Banchisa',
    floorY: 500,
    waves: [{ amp: 40, freq: 0.003 }],
    noise: 40,
    mounds: { count: 3, rx: [30, 50], ry: [40, 80] },
    kelp: { chance: 0, minH: 0, maxH: 0 },
    corals: { chance: 0, colors: [] },
    ice: { ceilingY: 46, holeEvery: 420, holeWidth: 44, pillars: 2 }, // + icebergs (worldArt.ts)
    beasts: { foca_leopardo: 3, beluga: 2, tricheco: 2, elefante_marino: 2, orca: 2, narvalo: 1.5, megattera: 1, squalo_bianco: 0.5 },
  },
  {
    id: 'fossa',
    name: 'Fossa abissale',
    floorY: 520,
    waves: [{ amp: 30, freq: 0.004 }],
    noise: 60,
    mounds: { count: 2, rx: [30, 60], ry: [40, 80] },
    kelp: { chance: 0, minH: 0, maxH: 0 },
    corals: { chance: 0.08, colors: ['#3b5f66', '#5a4a6e', '#6e7f7a'] },
    trench: { floorY: 2600, width: 0.45 },
    beasts: { capodoglio: 1.2, squalo_bianco: 1, squalo_volpe: 1, orca: 1, murena: 1, pesce_spada: 0.6, rana_pescatrice: 2.5, chimera: 2.5, dragone_nero: 2.5, granchio_ragno: 2, isopode_gigante: 2, squalo_capopiatto: 1.5, squalo_goblin: 1.2, calamaro_gigante: 0.6 },
  },
];
