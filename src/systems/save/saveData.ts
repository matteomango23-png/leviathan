// What is saved, and how old saves are upgraded.
// Every save carries `version`. When the format changes: bump SAVE_VERSION and add a migration
// from the previous version below. Never edit an existing migration.

import { PROGRESSION } from '../../data/rules';
import { SUB_MODELS, SUBMARINE } from '../../data/submarine';
import type { SavedSub } from '../submarine';
import { SPECIES, UNIQUE_VARIANTS } from '../../data/species';
import { validateGear, type SavedGear } from './gearSave';
import { validateStory, type SavedStory } from './storySave';

export type { SavedGear } from './gearSave';

export const SAVE_VERSION = 11;
export const SAVE_GAME_ID = 'leviatano';

/** A tamed beast as stored in the save. */
export interface SavedBeast {
  uid: string;
  form: { speciesId: string; variant: 'comune' | 'albino' | 'alfa'; unique?: string; final?: boolean };
  level: number;
  xp: number; // v4
  food: number; // v4
  hp: number;
  ko: boolean;
  inTeam: boolean;
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
  sanctuary: number | null; // respawn sanctuary index (v2)
  brokenTiles: number[]; // tiles broken open, e.g. the bone wall (v2)
  gear: SavedGear | null; // teeth, bag, suits, weapons, items, backpack, swarms, wrecks, missions (v3)
  story: SavedStory | null; // where the story is (v5); null = older save, picked up from progress
  homePort: string; // the last harbour you came into: you wake up there (v7)
  sub: SavedSub | null; // your submarine: where it waits, its model, the ones you own, its hull (v11); null = not yours yet
  legendsGone: string[]; // legends defeated: gone forever (v10)
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
    sanctuary: null,
    brokenTiles: [],
    gear: null,
    story: null,
    homePort: 'portofosco',
    sub: null,
    legendsGone: [],
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
];

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
  const sanctuary = data.sanctuary;
  if (sanctuary !== null && (!Number.isInteger(sanctuary) || (sanctuary as number) < 0))
    throw new SaveError('Santuario non valido.');
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
    sanctuary: sanctuary as number | null,
    brokenTiles: [...new Set(data.brokenTiles as number[])],
    gear: data.gear === null || data.gear === undefined ? null : checkedGear(data.gear),
    story: validateStory(data.story),
    homePort: typeof data.homePort === 'string' ? data.homePort : 'portofosco',
    sub: checkedSub(data.sub),
    legendsGone: Array.isArray(data.legendsGone)
      ? [...new Set(data.legendsGone.filter((x): x is string => typeof x === 'string'))]
      : [],
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
  return {
    uid: raw.uid,
    form,
    level: level as number,
    xp: isFiniteNumber(raw.xp) ? Math.max(0, raw.xp) : 0,
    food: isFiniteNumber(raw.food) ? Math.max(0, Math.floor(raw.food)) : 0,
    hp: raw.hp,
    ko: raw.ko === true,
    inTeam: raw.inTeam === true,
  };
}

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
  return { x: raw.x, y: raw.y, model, models, hull };
}
