// What is saved, and how old saves are upgraded.
// Every save carries `version`. When the format changes: bump SAVE_VERSION and add a migration
// from the previous version below. Never edit an existing migration.

import { PROGRESSION } from '../../data/rules';
import { SPECIES, UNIQUE_VARIANTS } from '../../data/species';
import { validateGear, type SavedGear } from './gearSave';

export type { SavedGear } from './gearSave';

export const SAVE_VERSION = 3;
export const SAVE_GAME_ID = 'leviatano';

/** A tamed beast as stored in the save. */
export interface SavedBeast {
  uid: string;
  form: { speciesId: string; variant: 'comune' | 'albino' | 'alfa'; unique?: string; final?: boolean };
  level: number;
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
