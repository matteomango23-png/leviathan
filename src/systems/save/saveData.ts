// What is saved, and how old saves are upgraded.
// Every save carries `version`. When the format changes: bump SAVE_VERSION and add a migration
// from the previous version below. Never edit an existing migration.

export const SAVE_VERSION = 1;
export const SAVE_GAME_ID = 'leviatano';

export interface SaveData {
  game: typeof SAVE_GAME_ID;
  version: number;
  savedAt: string; // ISO date
  playTime: number; // seconds
  diver: { x: number; y: number };
  fishCaught: Record<string, number>;
  seen: string[]; // bestiary ids seen at least once
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
  };
}

/** A migration turns a save of version `from` into version `from + 1`. */
export interface Migration {
  from: number;
  migrate: (old: Record<string, unknown>) => Record<string, unknown>;
}

/** Real migrations of the game, in order. Empty until the save format changes for the first time. */
export const MIGRATIONS: Migration[] = [];

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
  return {
    game: SAVE_GAME_ID,
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date(0).toISOString(),
    playTime: data.playTime,
    diver: { x: diver.x, y: diver.y },
    fishCaught,
    seen: [...new Set(data.seen as string[])],
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
