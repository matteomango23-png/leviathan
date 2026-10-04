// Leviatano — the ocean of 30 km (owner's decisions of 4 ottobre 2026): past the hand-made coast, five regions in
// order of difficulty, each with its kinds of stretches (BIOMES in endless.ts), an outpost to discover, its own
// level bonus and the chests of its wrecks. The sea ends at the Abisso del Leviatano. Values marked "tuning" are a
// first pass: change them here, never in systems.
import type { BiomeId } from './endless';
import { WORLD } from './worldLayout';

export type SeaRegionId = 'barriera_esterna' | 'mare_blu' | 'banchisa' | 'grandi_fosse' | 'abisso';

export interface SeaRegionDef {
  id: SeaRegionId;
  name: string;
  /** From and to, in km from the beach. */
  fromKm: number;
  toKm: number;
  /** Which kinds of stretches it is made of, and how often each. */
  biomes: Partial<Record<BiomeId, number>>;
  /** Levels added to the wild beasts here (the danger of each species sets the rest). Tuning. */
  levelBonus: number;
  /** Its outpost: a floating platform with a harbour (cures, fuel, market), at this km. */
  outpost: { name: string; km: number };
  /** One line for the map. */
  note: string;
}

export const SEA_REGIONS: SeaRegionDef[] = [
  {
    id: 'barriera_esterna',
    name: 'Barriera esterna',
    fromKm: 0,
    toKm: 6,
    biomes: { barriera: 3, aperto: 2 },
    levelBonus: 0,
    outpost: { name: 'Avamposto del Corallo', km: 4.2 },
    note: 'Coralli e squali di barriera, i primi relitti ricchi.',
  },
  {
    id: 'mare_blu',
    name: 'Mare blu',
    fromKm: 6,
    toKm: 12,
    biomes: { aperto: 4, foresta: 1 },
    levelBonus: 2,
    outpost: { name: 'Avamposto della Corrente', km: 9.1 },
    note: 'Acqua aperta e profonda: tonni, pesci spada, squali oceanici, balene.',
  },
  {
    id: 'banchisa',
    name: 'Foresta e Banchisa',
    fromKm: 12,
    toKm: 18,
    biomes: { foresta: 2, ghiaccio: 3 },
    levelBonus: 4,
    outpost: { name: 'Avamposto del Gelo', km: 15.1 },
    note: 'Alghe giganti, poi il ghiaccio: foche, narvali, orche.',
  },
  {
    id: 'grandi_fosse',
    name: 'Grandi fosse',
    fromKm: 18,
    toKm: 26,
    biomes: { fossa: 3, aperto: 1 },
    levelBonus: 6,
    outpost: { name: 'Avamposto dell’Orlo', km: 22.1 },
    note: 'Abissi oltre i mille metri: servono mute e sottomarini migliori.',
  },
  {
    id: 'abisso',
    name: 'Abisso del Leviatano',
    fromKm: 26,
    toKm: 30,
    biomes: { fossa: 1 },
    levelBonus: 8,
    outpost: { name: 'Ultimo Avamposto', km: 27.1 },
    note: 'La fine del mondo conosciuto.',
  },
];

/** Where the sea ends (km from the beach). */
export const SEA_END_KM = 30;

/** Chests of the wrecks of each region: at these shares of the region's width, richer farther and deeper. */
export const REGION_CHESTS = {
  perRegion: 3,
  at: [0.22, 0.55, 0.85],
  /** Teeth of a chest: base × (1 + region index) (the deepest one of each region gives double). Tuning. */
  teethBase: 90,
  /** What the last chest of each region also holds (by region index). */
  items: ['alga_rossa', 'krill_dorato', 'alga_reale', 'krill_dorato', 'alga_reale'],
};

export const kmToX = (km: number): number => km * 1000 * WORLD.unitsPerMetre;
