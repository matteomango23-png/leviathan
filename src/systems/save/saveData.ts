// What is saved, and how it is checked when read back. Every save carries `version`: when the format changes, bump
// SAVE_VERSION and add a migration from the previous version in migrations.ts (never edit an existing one).

import { PROGRESSION } from '../../data/rules';
import { checkedTarget, type Target } from '../tracking';
import { checkedWeather, type SavedWeather } from '../weather';
import { checkedNotes, type SonarNotes } from '../sonarNotes';
import { TRACKER } from '../../data/hunts';
import { SUB_MODELS } from '../../data/submarine';
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
import { isFiniteNumber, isObject } from './guards';
import { MIGRATIONS, type Migration } from './migrations';

export type { SavedGear } from './gearSave';
export type { Migration } from './migrations';

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
  weather?: SavedWeather | null; // the weather above the sea (added 9 ottobre; missing = a random start)
  target?: { target: Target; name: string } | null; // the beast the compass follows (part 4d; a resident only)
  trackLeft?: number | null; // its tracker's trace: seconds left (block 5a; missing = no limit)
  sonarNotes?: SonarNotes; // what the sonar taught you about each species (block 5a; missing = nothing yet)
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

export class SaveError extends Error {}

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
    ...(checkedWeather(data.weather) ? { weather: checkedWeather(data.weather) } : {}),
    ...(checkedTarget(data.target) ? { target: checkedTarget(data.target) } : {}),
    ...(checkedTarget(data.target) && typeof data.trackLeft === 'number' && data.trackLeft > 0
      ? { trackLeft: Math.min(TRACKER.seconds, data.trackLeft) }
      : {}),
    ...(Object.keys(checkedNotes(data.sonarNotes)).length
      ? { sonarNotes: checkedNotes(data.sonarNotes) }
      : {}),
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
  const air = isFiniteNumber(raw.air) ? Math.max(0, raw.air) : undefined;
  return { x: raw.x, y: raw.y, model, models, hull, fuel, ...(air !== undefined ? { air } : {}) };
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
    ...(isFiniteNumber(raw.hull) ? { hull: Math.max(0, raw.hull) } : {}),
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
    ...(isFiniteNumber(raw.dive) ? { dive: Math.max(0, raw.dive) } : {}),
    ...(isFiniteNumber(raw.air) ? { air: Math.max(0, raw.air) } : {}),
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
