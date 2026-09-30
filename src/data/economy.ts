// Leviatano — port, teeth economy, wrecks, missions, backpack and swarms (tappa 3).
// Prices of suits, upgrades, weapons and items are in world.ts. Values marked "tuning" are a first pass.

/** Portofosco: the only base, at the surface where a new game starts. */
export const PORT = {
  name: 'Portofosco',
  x: 160, // pier position on the surface, just off the west coast (world units)
  reach: 60, // how close (horizontally) to the pier you must be, at the surface
  surfaceBand: 48, // up to 8 m below the surface still counts as "at the pier"
};

/** Things that open with the context button: wrecks hold a weapon, chests hold teeth. */
export interface WreckDef {
  id: string;
  name: string;
  x: number;
  y: number; // a point above the sea floor it rests on (the floor is found at runtime)
  reward: { weapon?: string; teeth?: number; item?: string };
}
export const WRECKS: WreckDef[] = [
  { id: 'relitto_baia', name: 'Relitto della Baia', x: 1250, y: 200, reward: { weapon: 'fiocine', teeth: 20 } },
  { id: 'relitto_barriera', name: 'Relitto della Barriera', x: 3420, y: 330, reward: { weapon: 'rete', teeth: 30 } },
  { id: 'forziere_baia', name: 'Forziere', x: 560, y: 200, reward: { teeth: 60, item: 'bolla_aria' } },
  { id: 'forziere_reef', name: 'Forziere', x: 3820, y: 200, reward: { teeth: 80 } },
  { id: 'forziere_crepuscolo', name: 'Forziere', x: 900, y: 640, reward: { teeth: 150, item: 'alga_curativa' } },
];
export const WRECK_REACH = 26; // how close you must be to open one

/** Simple missions on the harbour board (tuning). Progress counts only after you accept them. */
export type MissionGoal =
  | { kind: 'catch'; fish: string; count: number }
  | { kind: 'sell'; count: number }
  | { kind: 'exhaust'; species: string; count: number }
  | { kind: 'tame'; region: string; count: number }
  | { kind: 'openWreck'; wreck: string }
  | { kind: 'depth'; metres: number };
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
];
export const MAX_ACTIVE_MISSIONS = 3;

/** The market: what is on sale (weapons come from wrecks; suits, upgrades and items from world.ts). */
export const MARKET = {
  items: ['bolla_aria', 'alga_curativa', 'esca', 'krill_dorato', 'arpione_mitico'],
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
  mythicWindowSeconds: 20, // after using the mythic harpoon, the next hit within this time counts
  lureSeconds: 1, // the lure calls the beasts of the zone within this time
};

/** Fishing weapons (WEAPONS in world.ts). */
export const WEAPON_RULES = {
  fiocine: { darts: 3, spread: 0.22, speed: 300, life: 0.34, catchRadius: 5 },
  rete: { speed: 190, life: 0.5, radius: 26, maxFish: 5, slowSeconds: 3, slowMult: 0.4, trapMaxLength: 20 }, // beasts shorter than trapMaxLength (units) are trapped, not just slowed
};

/** Swarm summons (SWARMS in world.ts). */
export const SWARM_RULES = {
  ringRadius: 16, // sardines circle the diver at this distance
  ringFish: 24,
};

/** Suits: deeper than the suit allows, the pressure makes oxygen drain much faster. */
export const SUIT_RULES = {
  overDepthDrainMult: 3, // oxygen drain × this as soon as you pass the limit…
  overDepthDrainPerM: 0.15, // …plus this much more for every metre beyond it
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
  { kind: 'sgombro', x: 700, y: 260, roam: [80, 120, 1850, 330] },
  { kind: 'sgombro', x: 1600, y: 220, roam: [80, 120, 1850, 330] },
  { kind: 'cefalo', x: 2100, y: 150, roam: [1980, 60, 2420, 200] }, // the Delta
  { kind: 'cefalo', x: 2320, y: 170, roam: [1980, 60, 2420, 200] },
  { kind: 'pesce_arciere', x: 2250, y: 40, roam: [1980, 30, 2420, 70] }, // just under the surface
];
export const FISH_LOOK: Record<string, { length: number; tint: number; perSchool: number; speedMult: number }> = {
  sardina: { length: 5, tint: 0xffffff, perSchool: 12, speedMult: 1 },
  sgombro: { length: 7, tint: 0xa8d4c8, perSchool: 7, speedMult: 1.2 },
  cefalo: { length: 8, tint: 0xb8b8a0, perSchool: 6, speedMult: 0.9 },
  pesce_arciere: { length: 5, tint: 0xd8e0a0, perSchool: 5, speedMult: 1.1 },
};
