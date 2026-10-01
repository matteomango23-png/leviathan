// Leviatano — beasts in the open sea: how wild beasts roam and start a battle, how you ride your mounts.
// The battle itself is turn-based (battle.ts). Owner's decision of 1 ottobre 2026: no real-time fighting.
// Speeds marked "U/s" are in diver lengths per second (DIVER.lengthUnits).
// Values marked "tuning" are a first pass: change them here, never in systems.

import { bay, delta, east, LAYOUT } from './worldLayout';

/** How wild beasts swim around you (they are seen, like in recent Pokémon games). */
export const ROAM = {
  cruiseSpeed: 1.2, // U/s, wandering slowly
  chaseSpeed: 2.9, // U/s, an aggressive beast swimming at you (slower than you: you can get away; tappa 10: was 3.2)
  shySpeed: 2.2, // U/s, a shy beast slipping away (you can catch it)
  sightRange: 9, // U: it notices you this close
  loseRange: 16, // U: it gives up beyond this
  contactFrac: 0.2, // you touch it when you are this close to its body (× its length): the battle starts
  calmAfterBattle: 6, // seconds a beast ignores you after a battle you fled from (or after biting you)
  noTeamKnock: 140, // u/s: with no beast able to fight, it bites you and pushes you away
  spawnMinDistance: 230, // units: it appears at least this far from you, in the dark
  targetReach: 24, // units: it reached the point it was swimming to
  litRadius: 90, // units: this close to your lamp it is in the light, and never turns around
  steer: 1.6,
  turnSeconds: 0.8, // a turn (only out of the light), animated from the head
  pitchMax: 0.4,
  pitchRate: 3,
  swimPhaseBase: 2.6,
  swimPhasePerSpeed: 0.9,
};

/** Wild beasts: where they live (world units) and when they come back. */

export interface WildSpawnDef {
  speciesId: string;
  area: [number, number, number, number]; // x0, y0, x1, y1: present while the diver is inside
  respawnSeconds: [number, number];
  /** A visitor outside its home region: its levels here (otherwise the species' wildLevel). */
  level?: [number, number];
}

// Each entry is one beast that comes and goes; a species listed twice can be met two at a time.
// The sea is full of common beasts (barracudas, turtles, rays), some sharks, the white shark rarer (tuning).
const BAY: [number, number, number, number] = [LAYOUT.bay.x0, 60, bay(1900), 380];
const BAY_HIGH: [number, number, number, number] = [LAYOUT.shoreX + 200, 40, bay(1800), 320]; // also over the beach
const REEF: [number, number, number, number] = [east(2480), 40, east(4000), 420];
const FOREST: [number, number, number, number] = [east(4040), 40, east(5200), 520];
export const WILD_SPAWNS: WildSpawnDef[] = [
  { speciesId: 'barracuda', area: [LAYOUT.shoreX + 300, 50, bay(1900), 340], respawnSeconds: [12, 30] },
  { speciesId: 'barracuda', area: BAY, respawnSeconds: [15, 35] },
  { speciesId: 'tartaruga_marina', area: BAY_HIGH, respawnSeconds: [20, 45] },
  { speciesId: 'tartaruga_marina', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'torpedine', area: [LAYOUT.bay.x0, 180, bay(1900), 380], respawnSeconds: [20, 40] },
  { speciesId: 'torpedine', area: BAY, respawnSeconds: [25, 50] },
  { speciesId: 'squalo_martello', area: BAY, respawnSeconds: [60, 120], level: [5, 7] }, // visitors from the reef
  { speciesId: 'squalo_tigre', area: BAY, respawnSeconds: [80, 150], level: [6, 8] },
  { speciesId: 'squalo_bianco', area: BAY, respawnSeconds: [120, 220] }, // rarer
  { speciesId: 'coccodrillo_marino', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [40, 80] }, // the Delta
  { speciesId: 'coccodrillo_marino', area: [delta(1960), 30, delta(2440), 215], respawnSeconds: [70, 120] },
  // the open sea east: the reef and the kelp forest
  // pesce palla, murena and manta join when their side pictures exist (only battle pictures so far)
  { speciesId: 'barracuda', area: REEF, respawnSeconds: [15, 35], level: [6, 8] },
  { speciesId: 'barracuda', area: REEF, respawnSeconds: [20, 40], level: [6, 8] },
  { speciesId: 'squalo_martello', area: REEF, respawnSeconds: [60, 110] },
  { speciesId: 'torpedine', area: REEF, respawnSeconds: [25, 50], level: [6, 8] },
  { speciesId: 'tartaruga_marina', area: REEF, respawnSeconds: [25, 50], level: [6, 8] },
  { speciesId: 'squalo_martello', area: REEF, respawnSeconds: [50, 100] },
  { speciesId: 'squalo_tigre', area: FOREST, respawnSeconds: [40, 80] },
  { speciesId: 'barracuda', area: FOREST, respawnSeconds: [20, 40], level: [10, 12] },
];

/** At most this many wild beasts are around you at the same time (tuning). */
export const WILD_RULES = { maxPresent: 5 };

/** Temperament: 'aggressive' swims at you, 'calm' ignores you, 'shy' slips away (rare ones are always shy). */
export type Temper = 'aggressive' | 'calm' | 'shy';
export const BEAST_TEMPER: Record<string, { temper: Temper; speedMult?: number; surface?: boolean }> = {
  squalo_bianco: { temper: 'aggressive' },
  barracuda: { temper: 'aggressive' },
  tartaruga_marina: { temper: 'calm', speedMult: 0.6 },
  torpedine: { temper: 'shy', speedMult: 0.7 },
  coccodrillo_marino: { temper: 'aggressive', speedMult: 0.8, surface: true }, // cruises just under the surface
  squalo_tigre: { temper: 'aggressive' },
  squalo_martello: { temper: 'aggressive', speedMult: 0.9 },
  pesce_palla: { temper: 'shy', speedMult: 0.5 },
  murena: { temper: 'aggressive', speedMult: 0.8 },
  manta: { temper: 'calm', speedMult: 0.8 },
};

/** Big beasts you ride eat the small fish they swim through (food chain): into your bag. */
export const FEEDING = {
  sizes: ['grande', 'colossale'], // species size classes that eat fish
  reachFrac: 0.22, // × body length, around the head
  interval: 0.25, // seconds between bites
};

/** A beast's body in the water (hits, collisions). */
export const BEAST_BODY = {
  headRadiusFrac: 0.13, // around the head, × body length
  bodyThicknessFrac: 0.1, // half thickness of the body, × body length
  collideRadiusFrac: 0.07, // radius used against rock, × body length
  weaponHitMargin: 1.5, // units: a weapon tip this close to the body hits
  hitFlashSeconds: 0.15,
};

/** Riding: call a mount from your team, it swims to you and you climb on (tuning). */
export const TEAM_RULES = {
  levelWithoutTeam: 1, // your "strongest beast" level when the team is empty (taming difficulty)
  summonDistance: 90, // the mount arrives from this far behind you
  arriveSeconds: 1.2, // at most this long to reach you
  follow: { behind: 0.5, gap: 4, below: 5, speed: 3 }, // a companion swims just behind you, inside the lamp halo: × its length + gap units, spring rate
  leaveSeconds: 1.5,
  riderOffset: [-0.02, -0.13] as [number, number], // where you sit, × body length (forward, up)
  turnSeconds: 0.6, // your mount turns around (animated from the head)
  accelMult: 1.7, // riding: acceleration × the beast's speed
  rideSpeedMult: 0.48, // tuning: riding speed × the beast's speed stat (tappa 10: a white shark ~55 u/s, 1.3× the diver; was 1.6)
  rideDash: { speedMult: 2.4, duration: 0.35, cooldown: 1.2 }, // the dash button while riding
};

/** What mounts can do while you ride them (abilities in species.ts). */
export const ABILITIES = {
  sfondaOssa: { reach: 34, radius: 30 }, // breaks ancient bones this close to the head
  staz_ossigeno: { o2DrainMult: 0 }, // you do not use air while riding it
};

/** Move effects shared by the battle (fx names in moves.ts). */
export const MOVE_RULES = {
  executeHpFraction: 0.25, // 'executeLowHp': targets under this share of health are overwhelmed
  woundedFraction: 0.5, // 'x2vsWounded': double damage under this share of health
};

/** Sanctuaries: stand still inside to heal (PROGRESSION.sanctuaryHealSeconds). */
export const SANCTUARY_RULES = {
  radius: 26,
  stillSpeed: 14, // u/s: slower than this counts as standing still
};

/** Sprite frame of big beasts (docs/ART.md). */
export const BEAST_SPRITE = {
  frameW: 1000,
  frameH: 460,
  spineY: 250,
  segments: 26,
};
