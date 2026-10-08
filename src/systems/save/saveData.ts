// What is saved, and how old saves are upgraded.
// Every save carries `version`. When the format changes: bump SAVE_VERSION and add a migration
// from the previous version below. Never edit an existing migration.

import { PROGRESSION } from '../../data/rules';
import { SUB_MODELS, SUBMARINE } from '../../data/submarine';
import type { SavedSub } from '../submarine';
import type { SavedShip } from '../ship/ship';
import type { SavedBoat } from '../boat';
import { checkedFleet, type MooredShip } from '../ship/shipyard';
import { BOAT_MODELS } from '../../data/boats';
import { FIRST_SHIP, SHIP_MODELS } from '../../data/fleet';
import { HUNTS } from '../../data/hunts';
import { SPECIES, UNIQUE_VARIANTS } from '../../data/species';
import { validateGear, type SavedGear } from './gearSave';
import { validateStory, type SavedStory } from './storySave';

export type { SavedGear } from './gearSave';

export const SAVE_VERSION = 20;
export const SAVE_GAME_ID = 'leviatano';

/** A tamed beast as stored in the save. */
export interface SavedBeast {
  uid: string;
  form: {
    speciesId: string;
    variant: 'comune' | 'albino' | 'alfa';
    unique?: string;
    final?: boolean;
    seed?: number;
  };
  level: number;
  xp: number; // v4
  food: number; // v4
  hp: number;
  ko: boolean;
  inTeam: boolean;
  ppUsed?: number[]; // v13: PP its moves have spent (same order as known)
  known?: string[]; // its battle moves (0.24); missing: the last 4 it learned by its level
  pendingMoves?: string[]; // moves waiting for you to choose what to forget
  evolveReady?: boolean; // it evolves after the battle or from its sheet
  status?: string; // its condition, kept after the battle like Pokémon
  sleepTurns?: number;
  met?: { level: number; place: string }; // where you tamed it
}

export interface SaveData {
  game: typeof SAVE_GAME_ID;
  version: number;
  savedAt: string; // ISO date
  playTime: number; // seconds
  diver: { x: number; y: number };
  fishCaught: Record<string, number>;
  seen: string[]; // bestiary ids seen at least once
  team: SavedBeast[]; // team and reserve (v2)
  brokenTiles: number[]; // tiles broken open, e.g. the bone wall (v2)
  gear: SavedGear | null; // teeth, bag, suits, weapons, items, backpack, swarms, wrecks, missions (v3)
  story: SavedStory | null; // where the story is (v5, the new start v17); null = older save, picked up from progress
  homePort: string; // the last harbour you came into: you wake up there (v7)
  sub: SavedSub | null; // your submarine: where it waits, its model, the ones you own, its hull (v11); null = not yours yet
  legendsGone: string[]; // legends defeated: gone forever (v10)
  ship: SavedShip | null; // your expedition ship: where it is, its hatches, the submarine in its hold (v14, v19)
  boat: SavedBoat | null; // its speedboat or jet ski (v19); null = the ship has none
  fleet: MooredShip[]; // your other ships, moored at Porto Fango (v20)
  hunts: Record<string, { heard?: boolean; echo?: boolean; traces?: boolean }>; // the hunting diary (v16)
  huntPinned?: string | null; // the hunt you follow (added 5 ottobre; missing = none)
}

export function newSave(start: { x: number; y: number }): SaveData {
  return {
    game: SAVE_GAME_ID,
    version: SAVE_VERSION,
    savedAt: new Date(0).toISOString(),
    playTime: 0,
    diver: { x: start.x, y: start.y },
    fishCaught: {},
    seen: [],
    team: [],
    brokenTiles: [],
    gear: null,
    story: null,
    homePort: 'portofosco',
    sub: null,
    legendsGone: [],
    ship: null,
    boat: null,
    fleet: [],
    hunts: {},
    huntPinned: null,
  };
}

/** A migration turns a save of version `from` into version `from + 1`. */
export interface Migration {
  from: number;
  migrate: (old: Record<string, unknown>) => Record<string, unknown>;
}

/** Real migrations of the game, in order. Never edit one: add the next. */
export const MIGRATIONS: Migration[] = [
  // v1 → v2 (tappa 2): tamed beasts, respawn sanctuary, broken tiles
  { from: 1, migrate: (o) => ({ ...o, team: [], sanctuary: null, brokenTiles: [] }) },
  // v2 → v3 (tappa 3): equipment and economy start empty (the game fills in defaults)
  { from: 2, migrate: (o) => ({ ...o, gear: null }) },
  // v3 → v4 (tappa 4): tamed beasts gain experience and a nourishment bar
  {
    from: 3,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team) ? o.team.map((b) => (isObject(b) ? { ...b, xp: 0, food: 0 } : b)) : o.team,
    }),
  },
  // v4 → v5 (tappa 5): the story; older saves pick it up from where the player is
  { from: 4, migrate: (o) => ({ ...o, story: null }) },
  // v5 → v6 (tappa 6): the Delta widened the world by 520 units (65 tiles) at x 1940; the map had 720 columns.
  // Broken tiles are stored as row × columns + column: re-number them, and move a diver saved in the east.
  {
    from: 5,
    migrate: (o) => {
      const [oldCols, at, add] = [720, 1940, 520];
      const newCols = oldCols + add / 8;
      const tiles = Array.isArray(o.brokenTiles) ? o.brokenTiles : [];
      const brokenTiles = tiles.map((i) => {
        if (typeof i !== 'number') return i;
        const tx = i % oldCols;
        const ty = Math.floor(i / oldCols);
        return ty * newCols + tx + (tx * 8 >= at ? add / 8 : 0);
      });
      const d = o.diver;
      const diver = isObject(d) && isFiniteNumber(d.x) && d.x >= at ? { ...d, x: d.x + add } : d;
      return { ...o, brokenTiles, diver };
    },
  },
  // v6 → v7 (tappa 10): the coast. The world grew from 785 to 1207 columns: the land and the pier moved 150 east,
  // a beach came before the bay, the bay was stretched ×1.6 from x 1700, the Isola delle Mangrovie came before the
  // Delta (also ×1.6, from x 5000) and the open sea moved 3372 east. The bone wall and the bones closing the lair
  // got new tiles: if they were broken, they stay broken.
  {
    from: 6,
    migrate: (o) => {
      const moveX = (x: number): number =>
        x < 300 ? x + 150 : x < 1940 ? 1700 + (x - 110) * 1.6 : x < 2460 ? 5000 + (x - 1940) * 1.6 : x + 3372;
      const [oldCols, newCols] = [785, 1207];
      const old = new Set(Array.isArray(o.brokenTiles) ? o.brokenTiles : []);
      const wasBroken = (tx0: number, tx1: number, rows: number[]): boolean =>
        rows.some((ty) => {
          for (let tx = tx0; tx <= tx1; tx++) if (old.has(ty * oldCols + tx)) return true;
          return false;
        });
      const brokenTiles: number[] = [];
      const breakAll = (tx0: number, tx1: number, rows: number[]): void => {
        for (const ty of rows) for (let tx = tx0; tx <= tx1; tx++) brokenTiles.push(ty * newCols + tx);
      };
      if (wasBroken(25, 60, [125, 126, 127, 128])) breakAll(230, 288, [125, 126, 127, 128]); // the bone wall
      if (wasBroken(94, 101, [45, 46])) breakAll(343, 350, [45, 46]); // the bones over the lair
      const d = o.diver;
      const diver = isObject(d) && isFiniteNumber(d.x) ? { ...d, x: Math.round(moveX(d.x)) } : d;
      return { ...o, brokenTiles, diver, homePort: 'portofosco' };
    },
  },
  // v7 → v8 (2 ottobre): taming uses a shell from the backpack; old games receive the starting 5 once
  // (literal, as saved then: data may change later)
  {
    from: 7,
    migrate: (o) => {
      const gear = isObject(o.gear) ? o.gear : null;
      if (!gear) return o;
      const inv = isObject(gear.inventory) ? gear.inventory : {};
      const had = isFiniteNumber(inv.conchiglia) ? inv.conchiglia : 0;
      return { ...o, gear: { ...gear, inventory: { ...inv, conchiglia: had + 5 } } };
    },
  },
  // v8 → v9 (tappa 12): the boat. Not in older saves: the game gives it again if chapter 1 is over.
  { from: 8, migrate: (o) => ({ ...o, boat: null }) },
  // v9 → v10 (tappa 13): the legends; none defeated yet
  { from: 9, migrate: (o) => ({ ...o, legendsGone: [] }) },
  // v10 → v11 (tappa 16): the boat becomes Aurelio's bathyscaphe, where the boat was
  {
    from: 10,
    migrate: (o) => {
      const boat = isObject(o.boat) && isFiniteNumber(o.boat.x) ? o.boat.x : null;
      const rest: Record<string, unknown> = { ...o };
      delete rest.boat;
      const first = SUB_MODELS[0]!;
      const sub =
        boat === null
          ? null
          : { x: boat, y: SUBMARINE.restY, model: first.id, models: [first.id], hull: first.hull };
      return { ...rest, sub };
    },
  },
  // v11 → v12 (3 ottobre 2026): beast health is ×10 (data/species.ts ROLE_BASE)
  {
    from: 11,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team)
        ? o.team.map((b) => (isObject(b) && isFiniteNumber(b.hp) ? { ...b, hp: b.hp * 10 } : b))
        : o.team,
    }),
  },
  // v12 → v13 (3 ottobre 2026): statistics follow the Pokémon formula (data/stats.ts): the old health means nothing
  // any more, so every beast comes back healed (restoreTeam caps it at its new maximum)
  {
    from: 12,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team)
        ? o.team.map((b) => (isObject(b) ? { ...b, hp: Number.MAX_SAFE_INTEGER, ko: false } : b))
        : o.team,
    }),
  },
  // v13 → v14 (4 ottobre 2026): the expedition ship. Not in older saves: the game gives it if chapter 4 is over.
  { from: 13, migrate: (o) => ({ ...o, ship: null }) },
  // v14 → v15 (4 ottobre 2026): fuel, full tanks to start with (checkedSub / checkedShip fill a missing one);
  // the sanctuaries are gone
  {
    from: 14,
    migrate: (o) => {
      const rest: Record<string, unknown> = { ...o };
      delete rest.sanctuary;
      return rest;
    },
  },
  // v15 → v16 (4 ottobre 2026): the hunting diary, empty
  { from: 15, migrate: (o) => ({ ...o, hunts: {} }) },
  // v16 → v17 (8 ottobre 2026): the story is paused. Its beasts leave the team (owner), the chapters are gone:
  // with the ship the sea is open, without it Aurelio waits at Porto Fango with ship and submarine.
  { from: 16, migrate: migrateTo17 },
  // v17 → v18 (8 ottobre 2026): the fleet. Your ship is the Aurelia; the parts bought for it and the submarines
  // bought on their own are gone, their teeth given back; the submarine is the Aurelia's bathyscaphe again.
  { from: 17, migrate: migrateTo18 },
  // v18 → v19 (8 ottobre 2026, block 4b): a hatch per bay (`hatches`), and the speedboat (none yet in v18 ships)
  {
    from: 18,
    migrate: (o) => {
      const ship = isObject(o.ship) ? { ...o.ship, hatches: [o.ship.hatchOpen === true] } : o.ship;
      if (isObject(ship)) delete ship.hatchOpen;
      return { ...o, ship, boat: null };
    },
  },
  // v19 → v20 (8 ottobre 2026): you may own several ships (the shipyard keeps the others moored)
  { from: 19, migrate: (o) => ({ ...o, fleet: [] }) },
];

function migrateTo18(o: Record<string, unknown>): Record<string, unknown> {
  // prices of the time (data/ship.ts and data/submarine.ts at v0.48.0)
  const partPrice: Record<string, number> = { serbatoio: 900, sonar_profondo: 1500, motori: 2500 };
  const subPrice: Record<string, number> = { squalo_ferro: 1800, leviatano_ottone: 6000 };
  let refund = 0;
  let ship = o.ship;
  if (isObject(ship)) {
    const parts = Array.isArray(ship.upgrades) ? ship.upgrades : [];
    for (const p of parts) refund += partPrice[String(p)] ?? 0;
    const rest: Record<string, unknown> = { ...ship, model: 'aurelia' };
    delete rest.upgrades;
    ship = rest;
  }
  let sub = o.sub;
  if (isObject(sub)) {
    const models = Array.isArray(sub.models) ? sub.models : [];
    for (const m of models) refund += subPrice[String(m)] ?? 0;
    sub = { ...sub, model: 'batiscafo', models: ['batiscafo'] };
  }
  const gear = isObject(o.gear) ? { ...o.gear } : o.gear;
  if (isObject(gear) && refund) gear.teeth = (isFiniteNumber(gear.teeth) ? gear.teeth : 0) + refund;
  return { ...o, ship, sub, gear };
}

function migrateTo17(o: Record<string, unknown>): Record<string, unknown> {
  const storySpecies = ['re_corallo', 'piovra'];
  const storyUniques = ['sfregiato'];
  const isStoryBeast = (b: unknown): boolean => {
    const f = isObject(b) && isObject(b.form) ? b.form : null;
    return !!f && (storySpecies.includes(String(f.speciesId)) || storyUniques.includes(String(f.unique)));
  };
  let team = o.team;
  if (Array.isArray(team)) {
    // a beast of the team that leaves: the first ones of the reserve take its place
    let free = team.filter((b) => isStoryBeast(b) && isObject(b) && b.inTeam).length;
    team = team
      .filter((b) => !isStoryBeast(b))
      .map((b) => {
        if (free > 0 && isObject(b) && !b.inTeam) {
          free--;
          return { ...b, inTeam: true };
        }
        return b;
      });
  }
  let story: unknown = null;
  if (isObject(o.story)) {
    const old = o.story;
    const seen = Array.isArray(old.seen) && old.seen.includes('starter') ? ['starter'] : [];
    if (old.step === 'intro' || old.step === 'tutorial') {
      // the old guided dive had four tasks: swim, fish, dash, surface (a fifth, tame, comes before surface)
      const t = typeof old.tutorial === 'number' ? old.tutorial : 0;
      story = { step: old.step, tutorial: t >= 3 ? t + 1 : t, count: 0, seen };
    } else story = { step: o.ship ? 'free' : 'toPortoFango', tutorial: 0, count: 0, seen };
  }
  const gear = isObject(o.gear) ? { ...o.gear } : o.gear;
  if (isObject(gear)) delete gear.guardians;
  return { ...o, team, story, gear };
}

export class SaveError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Brings any old save up to `target` by applying migrations one version at a time. */
export function migrate(
  raw: Record<string, unknown>,
  migrations: Migration[] = MIGRATIONS,
  target = SAVE_VERSION,
): Record<string, unknown> {
  let data = raw;
  let version = isFiniteNumber(data.version) ? data.version : 0;
  if (version > target) throw new SaveError('Salvataggio creato da una versione più nuova del gioco.');
  while (version < target) {
    const m = migrations.find((mm) => mm.from === version);
    if (!m) throw new SaveError(`Manca la conversione dalla versione ${version}.`);
    data = { ...m.migrate(data), version: version + 1 };
    version++;
  }
  return data;
}

/** Checks that a (migrated) object really is a valid save, and returns a clean copy. */
export function validate(data: Record<string, unknown>): SaveData {
  if (data.game !== SAVE_GAME_ID) throw new SaveError('Questo file non è un salvataggio di Leviatano.');
  const diver = data.diver;
  if (!isObject(diver) || !isFiniteNumber(diver.x) || !isFiniteNumber(diver.y))
    throw new SaveError('Posizione del sub mancante o non valida.');
  if (!isFiniteNumber(data.playTime) || data.playTime < 0) throw new SaveError('Tempo di gioco non valido.');
  const fishCaught: Record<string, number> = {};
  if (!isObject(data.fishCaught)) throw new SaveError('Pesci catturati non validi.');
  for (const [k, v] of Object.entries(data.fishCaught)) {
    if (!isFiniteNumber(v) || v < 0) throw new SaveError('Pesci catturati non validi.');
    fishCaught[k] = Math.floor(v);
  }
  if (!Array.isArray(data.seen) || !data.seen.every((s) => typeof s === 'string'))
    throw new SaveError('Bestiario non valido.');
  if (!Array.isArray(data.team)) throw new SaveError('Squadra non valida.');
  const team = data.team.map(validateBeast);
  if (new Set(team.map((b) => b.uid)).size !== team.length) throw new SaveError('Squadra non valida.');
  const inTeam = team.filter((b) => b.inTeam);
  for (const b of inTeam.slice(PROGRESSION.teamSize)) b.inTeam = false;
  if (!Array.isArray(data.brokenTiles) || !data.brokenTiles.every((t) => Number.isInteger(t) && t >= 0))
    throw new SaveError('Mappa non valida.');
  return {
    game: SAVE_GAME_ID,
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date(0).toISOString(),
    playTime: data.playTime,
    diver: { x: diver.x, y: diver.y },
    fishCaught,
    seen: [...new Set(data.seen as string[])],
    team,
    brokenTiles: [...new Set(data.brokenTiles as number[])],
    gear: data.gear === null || data.gear === undefined ? null : checkedGear(data.gear),
    story: validateStory(data.story),
    homePort: typeof data.homePort === 'string' ? data.homePort : 'portofosco',
    sub: checkedSub(data.sub),
    legendsGone: Array.isArray(data.legendsGone)
      ? [...new Set(data.legendsGone.filter((x): x is string => typeof x === 'string'))]
      : [],
    ship: checkedShip(data.ship),
    boat: checkedBoat(data.boat),
    fleet: checkedFleet(data.fleet, isObject(data.ship) ? String(data.ship.model) : null),
    hunts: checkedHunts(data.hunts),
    huntPinned: HUNTS.some((h) => h.id === data.huntPinned) ? (data.huntPinned as string) : null,
  };
}

function checkedGear(raw: unknown): SavedGear {
  try {
    return validateGear(raw);
  } catch {
    throw new SaveError('Equipaggiamento non valido.');
  }
}

function validateBeast(raw: unknown): SavedBeast {
  const bad = (): never => {
    throw new SaveError('Una bestia della squadra non è valida.');
  };
  if (!isObject(raw) || typeof raw.uid !== 'string' || !isObject(raw.form)) return bad();
  const f = raw.form;
  if (typeof f.speciesId !== 'string' || !SPECIES.some((s) => s.id === f.speciesId)) return bad();
  if (f.variant !== 'comune' && f.variant !== 'albino' && f.variant !== 'alfa') return bad();
  if (f.unique !== undefined && !UNIQUE_VARIANTS.some((u) => u.id === f.unique)) return bad();
  const level = raw.level;
  if (!Number.isInteger(level) || (level as number) < 1 || (level as number) > PROGRESSION.maxLevel)
    return bad();
  if (!isFiniteNumber(raw.hp) || raw.hp < 0) return bad();
  const form: SavedBeast['form'] = { speciesId: f.speciesId, variant: f.variant };
  if (typeof f.unique === 'string') form.unique = f.unique;
  if (f.final === true) form.final = true;
  if (Number.isInteger(f.seed) && (f.seed as number) >= 0) form.seed = f.seed as number; // v13
  return {
    uid: raw.uid,
    form,
    level: level as number,
    xp: isFiniteNumber(raw.xp) ? Math.max(0, raw.xp) : 0,
    food: isFiniteNumber(raw.food) ? Math.max(0, Math.floor(raw.food)) : 0,
    hp: raw.hp,
    ko: raw.ko === true,
    inTeam: raw.inTeam === true,
    ...(Array.isArray(raw.ppUsed) && raw.ppUsed.every((n) => Number.isInteger(n) && (n as number) >= 0)
      ? { ppUsed: raw.ppUsed as number[] }
      : {}),
    ...(isStringList(raw.known) && raw.known.length ? { known: raw.known } : {}),
    ...(isStringList(raw.pendingMoves) && raw.pendingMoves.length ? { pendingMoves: raw.pendingMoves } : {}),
    ...(raw.evolveReady === true ? { evolveReady: true } : {}),
    ...(typeof raw.status === 'string' && STATUS_IDS.includes(raw.status) ? { status: raw.status } : {}),
    ...(Number.isInteger(raw.sleepTurns) ? { sleepTurns: raw.sleepTurns as number } : {}),
    ...(isMet(raw.met) ? { met: { level: raw.met.level, place: raw.met.place } } : {}),
  };
}

const STATUS_IDS = ['avvelenato', 'ferito', 'paralizzato', 'stordito', 'congelato'];
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isMet = (v: unknown): v is { level: number; place: string } =>
  !!v &&
  typeof v === 'object' &&
  Number.isInteger((v as { level?: unknown }).level) &&
  typeof (v as { place?: unknown }).place === 'string';

/** Text (from storage or an imported file) → a valid, up-to-date save. Throws SaveError. */
export function parseSave(text: string): SaveData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('Il file è rovinato o non è un salvataggio.');
  }
  if (!isObject(raw)) throw new SaveError('Il file è rovinato o non è un salvataggio.');
  return validate(migrate(raw));
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save, null, 2);
}

/** Suggested file name for an export, e.g. leviatano-salvataggio-2026-09-30.json */
export function exportFileName(date: Date): string {
  const d = date.toISOString().slice(0, 10);
  return `leviatano-salvataggio-${d}.json`;
}

/** The saved submarine, checked: unknown models dropped, numbers kept in range. */
function checkedSub(raw: unknown): SavedSub | null {
  if (!isObject(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return null;
  const known = SUB_MODELS.map((m) => m.id);
  const models = Array.isArray(raw.models)
    ? [...new Set(raw.models.filter((m): m is string => typeof m === 'string' && known.includes(m)))]
    : [];
  if (!models.length) models.push(SUB_MODELS[0]!.id);
  const model = typeof raw.model === 'string' && models.includes(raw.model) ? raw.model : models[0]!;
  const max = SUB_MODELS.find((m) => m.id === model)!.hull;
  const hull = isFiniteNumber(raw.hull) ? Math.max(0, Math.min(max, raw.hull)) : max;
  const tank = SUB_MODELS.find((m) => m.id === model)!.tank;
  const fuel = isFiniteNumber(raw.fuel) ? Math.max(0, Math.min(tank, raw.fuel)) : tank;
  return { x: raw.x, y: raw.y, model, models, hull, fuel };
}

/** The saved speedboat, checked: a broken one is dropped (the next shipyard visit gives none: newBoat). */
function checkedBoat(raw: unknown): SavedBoat | null {
  if (!isObject(raw) || !BOAT_MODELS.some((m) => m.id === raw.model)) return null;
  const num = (v: unknown): number => (isFiniteNumber(v) ? Math.max(0, v) : 0);
  return {
    model: String(raw.model),
    x: num(raw.x),
    face: raw.face === -1 ? -1 : 1,
    fuel: isFiniteNumber(raw.fuel) ? Math.max(0, raw.fuel) : Infinity, // newBoat caps it at its tank
    drums: num(raw.drums),
    out: raw.out === true,
    aboard: raw.aboard === true,
  };
}

/** The saved ship, checked: a broken one is dropped (the story gives it again at Porto Fango). */
function checkedShip(raw: unknown): SavedShip | null {
  if (!isObject(raw) || !isFiniteNumber(raw.x)) return null;
  const bay = raw.bay === 'docked' || raw.bay === 'out' ? raw.bay : 'none';
  return {
    x: raw.x,
    face: raw.face === -1 ? -1 : 1,
    hatches: Array.isArray(raw.hatches) ? raw.hatches.map((h) => h === true) : [],
    bay,
    aboard: raw.aboard === true,
    fuel: isFiniteNumber(raw.fuel) ? Math.max(0, raw.fuel) : Infinity, // newShip caps it at its tank
    engineOn: raw.engineOn === true,
    model: SHIP_MODELS.some((m) => m.id === raw.model) ? String(raw.model) : FIRST_SHIP,
  };
}

/** The hunting diary, checked: only the hunts that exist, only true steps. */
function checkedHunts(raw: unknown): SaveData['hunts'] {
  const out: SaveData['hunts'] = {};
  if (!isObject(raw)) return out;
  for (const h of HUNTS) {
    const p = raw[h.id];
    if (!isObject(p)) continue;
    out[h.id] = {
      ...(p.heard === true ? { heard: true } : {}),
      ...(p.echo === true ? { echo: true } : {}),
      ...(p.traces === true ? { traces: true } : {}),
    };
  }
  return out;
}
