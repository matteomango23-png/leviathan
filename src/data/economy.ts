// Leviatano — port, teeth economy, wrecks, missions, backpack and swarms (tappa 3).
// Prices of suits, upgrades, weapons and items are in world.ts. Values marked "tuning" are a first pass.

import { kmToX, REGION_CHESTS, SEA_REGIONS } from './regions';
import { bay, delta, east, ISLAND_X, LAYOUT, WORLD } from './worldLayout';

/** A harbour at the surface: its pier runs from the shore out over the water. */
export interface PortDef {
  id: string;
  name: string;
  x: number; // end of the pier, on the surface (world units)
  shoreX: number; // where the pier starts, on the land
  reach: number; // how close (horizontally) to the pier you must be, at the surface
  surfaceBand: number; // up to this far below the surface still counts as "at the pier"
  /** Where the expedition ship lies alongside it (deep enough water). */
  shipDock: number;
  /** An outpost of the open sea (a floating platform): found by sailing there. */
  outpost?: boolean;
}

/** Portofosco, on the mainland beach, where a new game starts. */
export const PORT: PortDef = {
  id: 'portofosco',
  name: 'Portofosco',
  x: LAYOUT.shoreX + 70,
  shoreX: LAYOUT.shoreX,
  reach: 60,
  surfaceBand: 48, // 8 m
  shipDock: LAYOUT.shoreX + 190,
};

/** Porto Fango (tappa 10): a full harbour on the east shore of the Isola delle Mangrovie, by the Delta. */
export const PORTO_FANGO: PortDef = {
  id: 'fango',
  name: 'Porto Fango',
  x: LAYOUT.island.x1 + 60,
  shoreX: ISLAND_X + LAYOUT.island.halfWidth - 4,
  reach: 60,
  surfaceBand: 48,
  shipDock: LAYOUT.island.x1 + 110,
};

/** The outposts of the open sea (data/regions.ts): one per region, a platform with a harbour. */
export const OUTPOSTS: PortDef[] = SEA_REGIONS.map((r) => {
  const x = Math.round(kmToX(r.outpost.km));
  return { id: r.id, name: r.outpost.name, x, shoreX: x - 40, reach: 70, surfaceBand: 48, shipDock: x + 140, outpost: true };
});

export const PORTS: PortDef[] = [PORT, PORTO_FANGO, ...OUTPOSTS];

/** Things that open with the context button: wrecks hold a weapon, chests hold teeth. */
export interface WreckDef {
  id: string;
  name: string;
  x: number;
  y: number; // a point above the sea floor it rests on (the floor is found at runtime)
  reward: { weapon?: string; teeth?: number; item?: string };
}
const COAST_WRECKS: WreckDef[] = [
  { id: 'relitto_baia', name: 'Relitto della Baia', x: bay(1250), y: 200, reward: { weapon: 'fiocine', teeth: 20 } },
  { id: 'relitto_barriera', name: 'Relitto della Barriera', x: east(3420), y: 330, reward: { weapon: 'rete', teeth: 30 } },
  { id: 'forziere_baia', name: 'Forziere', x: bay(560), y: 200, reward: { teeth: 60, item: 'bolla_aria' } },
  { id: 'forziere_reef', name: 'Forziere', x: east(3820), y: 200, reward: { teeth: 80 } },
  { id: 'forziere_crepuscolo', name: 'Forziere', x: bay(900), y: 640, reward: { teeth: 150, item: 'alga_curativa' } },
];

/** The wrecks of the regions of the open sea (data/regions.ts: REGION_CHESTS): richer farther out. */
const REGION_WRECKS: WreckDef[] = SEA_REGIONS.flatMap((r, i) =>
  REGION_CHESTS.at.map((share, j) => {
    const from = Math.max(r.fromKm, 1.8); // past the hand-made coast
    const last = j === REGION_CHESTS.at.length - 1;
    return {
      id: `relitto_${r.id}_${j + 1}`,
      name: `Relitto (${r.name})`,
      x: Math.round(kmToX(from + (r.toKm - from) * share)),
      y: WORLD.surfaceY + 40,
      reward: {
        teeth: REGION_CHESTS.teethBase * (1 + i) * (last ? 2 : 1),
        item: last ? REGION_CHESTS.items[i] : undefined,
      },
    };
  }),
);

export const WRECKS: WreckDef[] = [...COAST_WRECKS, ...REGION_WRECKS];
export const WRECK_REACH = 26; // how close you must be to open one

/** Simple missions on the harbour board (tuning). Progress counts only after you accept them. */
export type MissionGoal =
  | { kind: 'catch'; fish: string; count: number }
  | { kind: 'sell'; count: number }
  | { kind: 'exhaust'; species: string; count: number }
  | { kind: 'tame'; region: string; count: number }
  | { kind: 'openWreck'; wreck: string }
  | { kind: 'depth'; metres: number }
  /** Expeditions (4 ottobre 2026): sail this far from the beach; find the traces of a hunt. */
  | { kind: 'reachKm'; km: number }
  | { kind: 'hunt'; hunt: string };
export interface MissionDef {
  id: string;
  title: string;
  text: string;
  goal: MissionGoal;
  reward: number; // teeth
  requires?: string; // appears on the board after this mission is completed
}
export const MISSIONS: MissionDef[] = [
  {
    id: 'sardine_10',
    title: 'Sardine per il mercato',
    text: 'Il mercante vuole sardine fresche. Catturane 10.',
    goal: { kind: 'catch', fish: 'sardina', count: 10 },
    reward: 30,
  },
  {
    id: 'vendi_5',
    title: 'Primo guadagno',
    text: 'Vendi 5 pesci al mercato.',
    goal: { kind: 'sell', count: 5 },
    reward: 20,
  },
  {
    id: 'relitto_baia',
    title: 'Il relitto della Baia',
    text: 'Una nave è affondata nella Baia. Trovala e apri la stiva.',
    goal: { kind: 'openWreck', wreck: 'relitto_baia' },
    reward: 50,
  },
  {
    id: 'sgombri_5',
    title: 'Sgombri',
    text: 'Catturane 5: si vendono bene.',
    goal: { kind: 'catch', fish: 'sgombro', count: 5 },
    reward: 40,
    requires: 'sardine_10',
  },
  {
    id: 'taglia_barracuda',
    title: 'Taglia: barracuda',
    text: 'I barracuda rubano il pescato. Sfiancane 3.',
    goal: { kind: 'exhaust', species: 'barracuda', count: 3 },
    reward: 90,
  },
  {
    id: 'taglia_squalo',
    title: 'Taglia: lo squalo della Baia',
    text: 'Uno squalo bianco terrorizza i pescatori. Sfiancalo.',
    goal: { kind: 'exhaust', species: 'squalo_bianco', count: 1 },
    reward: 120,
  },
  {
    id: 'doma_baia',
    title: 'Il primo domatore',
    text: 'Doma una bestia della Baia.',
    goal: { kind: 'tame', region: 'baia', count: 1 },
    reward: 150,
  },
  {
    id: 'profondo_100',
    title: 'Nel crepuscolo',
    text: 'Scendi a 100 metri.',
    goal: { kind: 'depth', metres: 100 },
    reward: 60,
    requires: 'relitto_baia',
  },
  // expeditions (4 ottobre 2026): farther out, richer
  ...SEA_REGIONS.map(
    (r, i): MissionDef => ({
      id: `spedizione_${r.id}`,
      title: `Spedizione: ${r.outpost.name}`,
      text: `Porta la nave fino all’${r.outpost.name}, a ${r.outpost.km.toString().replace('.', ',')} km dalla costa.`,
      goal: { kind: 'reachKm', km: r.outpost.km },
      reward: [150, 300, 500, 800, 1500][i]!,
      requires: i === 0 ? undefined : `spedizione_${SEA_REGIONS[i - 1]!.id}`,
    }),
  ),
  {
    id: 'caccia_tracce_martello',
    title: 'Le reti strappate',
    text: 'Trova le tracce dello squalo martello preistorico nella Barriera esterna (Diario di caccia).',
    goal: { kind: 'hunt', hunt: 'caccia_martello' },
    reward: 400,
    requires: 'spedizione_barriera_esterna',
  },
  {
    id: 'relitto_lontano',
    title: 'Il relitto dell’Orlo',
    text: 'Apri il relitto più ricco delle Grandi fosse.',
    goal: { kind: 'openWreck', wreck: 'relitto_grandi_fosse_3' },
    reward: 600,
    requires: 'spedizione_grandi_fosse',
  },
];
export const MAX_ACTIVE_MISSIONS = 3;

/** The market: what is on sale (weapons come from wrecks; suits, upgrades and items from world.ts). */
export const MARKET = {
  items: [
    'conchiglia', 'alga_curativa', 'alga_rossa', 'alga_reale', 'corallo_vitale', 'perla_ristoro', 'ambra_risveglio',
    'muschio_luminoso', 'elisir_abissale', 'antidoto', 'benda_alga', 'spugna_isolante', 'sale_aromatico', 'pietra_termale', 'panacea',
    'attacco_x', 'difesa_x', 'attacco_sp_x', 'difesa_sp_x', 'velocita_x', 'precisione_x',
    'bolla_aria', 'esca_sangue', 'esca_gamberi', 'esca_viva', 'esca', 'krill_dorato', 'arpione_mitico',
  ],
  /** Upgrades whose effect is not in the game yet are shown but cannot be bought. */
  upgradesReady: ['apnea', 'lampada_1', 'lampada_2'],
  mythicHarpoonStock: 1, // restocked after each Guardian (tappa 4)
};

/** Effects of suit upgrades (SUIT_UPGRADES in world.ts). */
export const UPGRADE_EFFECTS = {
  apnea: { o2DrainMult: 0.75 },
  lampada_1: { coneMult: 1.3 },
  lampada_2: { coneMult: 1.6, widthMult: 1.25 },
};

/** Items (ITEMS in world.ts). */
export const ITEM_RULES = {
  krillLevels: 1,
  lureSeconds: 1, // the lure calls the beasts of the zone within this time
  bait: { seconds: 90, respawn: 4 }, // a bait: its species come back within `respawn` seconds, for `seconds`
};

/** Fishing weapons (WEAPONS in world.ts). */
export const WEAPON_RULES = {
  fiocine: { darts: 3, spread: 0.22, speed: 300, life: 0.34, catchRadius: 5 },
  rete: { speed: 190, life: 0.5, radius: 26, maxFish: 5 },
};

/** Swarm summons (SWARMS in world.ts). */
export const SWARM_RULES = {
  ringRadius: 16, // sardines circle the diver at this distance
  ringFish: 24,
};

/** Suits: deeper than the suit allows, the pressure makes oxygen drain much faster. */
export const SUIT_RULES = {
  warnEvery: 4, // seconds between warnings
};

/** Small fish schools besides the sardines (FISH in world.ts): position, area and look. */
export interface FishSchoolDef {
  kind: string;
  x: number;
  y: number;
  roam: [number, number, number, number];
}
export const OTHER_FISH_SCHOOLS: FishSchoolDef[] = [
  { kind: 'sgombro', x: bay(700), y: 260, roam: [LAYOUT.bay.x0, 120, bay(1850), 330] },
  { kind: 'sgombro', x: bay(1600), y: 220, roam: [LAYOUT.bay.x0, 120, bay(1850), 330] },
  { kind: 'cefalo', x: delta(2100), y: 150, roam: [delta(1980), 60, delta(2420), 200] }, // the Delta
  { kind: 'cefalo', x: delta(2320), y: 170, roam: [delta(1980), 60, delta(2420), 200] },
  { kind: 'pesce_arciere', x: delta(2250), y: 40, roam: [delta(1980), 30, delta(2420), 70] }, // just under the surface
  // more life (owner, 3 ottobre: "poca vita"): the bay's floor, the reef's colours, the forest, the ice
  { kind: 'sgombro', x: bay(300), y: 200, roam: [LAYOUT.bay.x0, 120, bay(1850), 330] },
  { kind: 'triglia', x: bay(1000), y: 300, roam: [LAYOUT.bay.x0, 230, bay(1850), 360] }, // near the floor
  { kind: 'triglia', x: bay(1500), y: 320, roam: [LAYOUT.bay.x0, 230, bay(1850), 360] },
  { kind: 'pesce_pagliaccio', x: east(2700), y: 230, roam: [east(2500), 150, east(3950), 290] },
  { kind: 'pesce_pagliaccio', x: east(3400), y: 240, roam: [east(2500), 150, east(3950), 290] },
  { kind: 'pesce_chirurgo', x: east(2900), y: 160, roam: [east(2500), 80, east(3950), 260] },
  { kind: 'pesce_chirurgo', x: east(3700), y: 180, roam: [east(2500), 80, east(3950), 260] },
  { kind: 'sgombro', x: east(4400), y: 200, roam: [east(4050), 80, east(5150), 380] }, // the kelp forest
  { kind: 'triglia', x: east(4800), y: 330, roam: [east(4050), 200, east(5150), 420] },
  { kind: 'merluzzo_artico', x: east(5500), y: 160, roam: [east(5250), 70, east(6300), 360] }, // the ice sea
  { kind: 'merluzzo_artico', x: east(6000), y: 220, roam: [east(5250), 70, east(6300), 360] },
  // the shallow coral patches (CORALS.patches) and the reef: coloured fish to catch
  { kind: 'pesce_farfalla', x: 600, y: 120, roam: [400, 70, 1050, 190] }, // the reef off the beach
  { kind: 'pesce_angelo', x: 800, y: 150, roam: [400, 80, 1050, 200] },
  { kind: 'pesce_pagliaccio', x: 500, y: 90, roam: [400, 60, 1050, 170] },
  { kind: 'pesce_chirurgo', x: 900, y: 140, roam: [400, 70, 1050, 200] },
  { kind: 'pesce_farfalla', x: 950, y: 170, roam: [400, 90, 1050, 205] },
  { kind: 'pesce_angelo', x: 450, y: 70, roam: [380, 50, 1050, 160] },
  { kind: 'pesce_farfalla', x: east(3170), y: 200, roam: [east(3120), 140, east(3240), 250] },
  { kind: 'pesce_angelo', x: east(3700), y: 210, roam: [east(3600), 150, east(3800), 260] },
  { kind: 'pesce_farfalla', x: east(2900), y: 120, roam: [east(2500), 60, east(3950), 260] },
  { kind: 'pesce_angelo', x: east(3500), y: 150, roam: [east(2500), 60, east(3950), 260] },
  { kind: 'sgombro', x: east(3300), y: 60, roam: [east(2500), 40, east(3950), 160] },
  { kind: 'sgombro', x: bay(1500), y: 60, roam: [LAYOUT.bay.x0, 40, bay(1850), 160] },
];
export const FISH_LOOK: Record<string, { length: number; tint: number; perSchool: number; speedMult: number }> = {
  sardina: { length: 5, tint: 0xffffff, perSchool: 22, speedMult: 1 }, // owner, 3 ottobre: bigger schools (was 12)
  sgombro: { length: 7, tint: 0xa8d4c8, perSchool: 12, speedMult: 1.2 },
  pesce_farfalla: { length: 4, tint: 0xffe060, perSchool: 7, speedMult: 0.8 },
  pesce_angelo: { length: 5, tint: 0x6a8cff, perSchool: 6, speedMult: 0.8 },
  cefalo: { length: 8, tint: 0xb8b8a0, perSchool: 6, speedMult: 0.9 },
  pesce_arciere: { length: 5, tint: 0xd8e0a0, perSchool: 5, speedMult: 1.1 },
  triglia: { length: 6, tint: 0xffb8a8, perSchool: 6, speedMult: 0.9 },
  pesce_pagliaccio: { length: 4, tint: 0xffa860, perSchool: 6, speedMult: 0.8 },
  pesce_chirurgo: { length: 5, tint: 0x7ab0ff, perSchool: 8, speedMult: 1 },
  merluzzo_artico: { length: 8, tint: 0xc8d4dc, perSchool: 8, speedMult: 0.9 },
};
