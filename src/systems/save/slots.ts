// Several games side by side, each with its own name (owner, 19 ottobre 2026: "posso iniziare una nuova partita, ma
// so che non perderò i salvataggi dell'ultima"). An index lists them; each game lives under its own key. Nothing here
// ever writes over a game it could not read: an unreadable one stays in the list, to be exported.
// Before this there was one save, one "previous" copy and hidden copies of the unreadable ones: on the
// first start they all move into the list (migrateLegacySaves).
import { SAVE, SLOTS } from '../../data/diver';
import { speciesById } from '../../data/species';
import { parseSave, serializeSave, SaveError, type SaveData } from './saveData';

export interface SlotMeta {
  id: string;
  name: string;
  /** ISO date of the last save; '' for a game not saved yet. */
  savedAt: string;
  playTime: number;
  /** The first beast of the team (its species' name), for the list. */
  lead: string | null;
  teeth: number;
  /** The text could not be read: the game is kept, it can only be exported or deleted. */
  broken?: string;
}

interface SlotIndex {
  last: string | null;
  slots: SlotMeta[];
}

type SlotLoad = { ok: true; save: SaveData | null } | { ok: false; error: string };

/** The browser's storage (localStorage), or a stand-in in the tests. Never trusted not to throw: storage can be
 *  blocked or full. It can also list its keys (for the old hidden copies of unreadable saves). */
export interface SlotStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

function defaultStore(): SlotStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const slotKey = (id: string): string => `${SLOTS.keyPrefix}${id}`;
const legacyPrevious = (): string => `${SAVE.storageKey}-precedente`;
const legacyBroken = (): string => `${SAVE.storageKey}-rotto-`;

function readIndex(store: SlotStore): SlotIndex | null {
  const text = store.getItem(SLOTS.indexKey);
  if (text === null) return null;
  try {
    const raw = JSON.parse(text) as Partial<SlotIndex>;
    if (!Array.isArray(raw.slots)) return null;
    return { last: typeof raw.last === 'string' ? raw.last : null, slots: raw.slots };
  } catch {
    return null;
  }
}

function writeIndex(store: SlotStore, index: SlotIndex): void {
  store.setItem(SLOTS.indexKey, JSON.stringify(index));
}

/** What the list shows of a save. */
function metaOf(id: string, name: string, save: SaveData): SlotMeta {
  const lead = save.team[0];
  return {
    id,
    name,
    savedAt: save.savedAt,
    playTime: save.playTime,
    lead: lead ? (speciesById(lead.form.speciesId)?.name ?? null) : null,
    teeth: save.gear?.teeth ?? 0,
  };
}

function metaOfText(id: string, name: string, text: string): SlotMeta {
  try {
    return metaOf(id, name, parseSave(text));
  } catch (e) {
    const error = e instanceof SaveError ? e.message : 'Salvataggio illeggibile.';
    return { id, name, savedAt: '', playTime: 0, lead: null, teeth: 0, broken: error };
  }
}

function newId(index: SlotIndex): string {
  let n = index.slots.length + 1;
  const used = new Set(index.slots.map((s) => s.id));
  while (used.has(`p${n}`)) n++;
  return `p${n}`;
}

/** The next free "Partita N". */
export function nextGameName(store = defaultStore()): string {
  const names = new Set(listSlots(store).map((s) => s.name));
  let n = 1;
  while (names.has(`${SLOTS.defaultName} ${n}`)) n++;
  return `${SLOTS.defaultName} ${n}`;
}

/**
 * The old single save, its "previous" copy and the hidden copies of unreadable saves move into the list, once.
 * Each old key is removed only after its copy was written: nothing can be lost on the way.
 */
export function migrateLegacySaves(store = defaultStore()): void {
  if (!store) return;
  try {
    if (readIndex(store)) return;
    const index: SlotIndex = { last: null, slots: [] };
    const take = (key: string, name: string): void => {
      const text = store.getItem(key);
      if (text === null) return;
      const id = newId(index);
      store.setItem(slotKey(id), text);
      index.slots.push(metaOfText(id, name, text));
      writeIndex(store, index);
      store.removeItem(key);
    };
    take(SAVE.storageKey, `${SLOTS.defaultName} 1`);
    index.last = index.slots[0]?.id ?? null;
    take(legacyPrevious(), SLOTS.previousName);
    const broken: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k?.startsWith(legacyBroken())) broken.push(k);
    }
    for (const k of broken.sort()) {
      const when = new Date(Number(k.slice(legacyBroken().length)));
      take(
        k,
        `${SLOTS.brokenName} ${Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString('it-IT')}`.trim(),
      );
    }
    writeIndex(store, index);
  } catch {
    // storage blocked or full: the old keys stay where they were
  }
}

/** The games, the last played first. */
export function listSlots(store = defaultStore()): SlotMeta[] {
  if (!store) return [];
  try {
    const index = readIndex(store);
    if (!index) return [];
    return [...index.slots].sort(
      (a, b) =>
        (b.id === index.last ? 1 : 0) - (a.id === index.last ? 1 : 0) || b.savedAt.localeCompare(a.savedAt),
    );
  } catch {
    return [];
  }
}

/** The game "Riprendi" opens: the last one played, if it can still be read. */
export function lastSlot(store = defaultStore()): SlotMeta | null {
  const first = listSlots(store)[0];
  return first && !first.broken ? first : null;
}

/** A new empty game in the list (nothing else touched); its id, or null if the storage is blocked. */
export function createSlot(name: string, store = defaultStore()): string | null {
  if (!store) return null;
  try {
    const index = readIndex(store) ?? { last: null, slots: [] };
    const id = newId(index);
    index.slots.push({ id, name: cleanName(name), savedAt: '', playTime: 0, lead: null, teeth: 0 });
    index.last = id;
    writeIndex(store, index);
    return id;
  } catch {
    return null;
  }
}

export function loadSlot(id: string, store = defaultStore()): SlotLoad {
  if (!store) return { ok: true, save: null };
  try {
    const text = store.getItem(slotKey(id));
    if (text === null) return { ok: true, save: null }; // a new game, never saved yet
    return { ok: true, save: parseSave(text) };
  } catch (e) {
    return { ok: false, error: e instanceof SaveError ? e.message : 'Salvataggio illeggibile.' };
  }
}

/** The raw text of a game, to export it (also an unreadable one). */
export function slotText(id: string, store = defaultStore()): string | null {
  try {
    return store?.getItem(slotKey(id)) ?? null;
  } catch {
    return null;
  }
}

/** Saves the game into its place in the list; false if the storage is blocked or full. */
export function writeSlot(id: string, save: SaveData, store = defaultStore()): boolean {
  if (!store) return false;
  try {
    const index = readIndex(store) ?? { last: null, slots: [] };
    const at = index.slots.findIndex((s) => s.id === id);
    if (at >= 0 && index.slots[at]!.broken) return false; // never over a game that could not be read
    store.setItem(slotKey(id), serializeSave(save));
    const meta = metaOf(id, at >= 0 ? index.slots[at]!.name : nextGameName(store), save);
    if (at >= 0) index.slots[at] = meta;
    else index.slots.push(meta);
    index.last = id;
    writeIndex(store, index);
    return true;
  } catch {
    return false;
  }
}

export function markPlayed(id: string, store = defaultStore()): void {
  try {
    const index = store && readIndex(store);
    if (!index || !index.slots.some((s) => s.id === id)) return;
    index.last = id;
    writeIndex(store, index);
  } catch {
    // nothing to do
  }
}

/** A game that could not be read when opened: kept, never written over, no longer offered by Riprendi. */
export function markBroken(id: string, error: string, store = defaultStore()): void {
  try {
    const index = store && readIndex(store);
    const slot = index?.slots.find((x) => x.id === id);
    if (!store || !index || !slot) return;
    slot.broken = error;
    writeIndex(store, index);
  } catch {
    // nothing to do
  }
}

const cleanName = (name: string): string =>
  name.replace(/\s+/g, ' ').trim().slice(0, SLOTS.maxNameLength) || SLOTS.defaultName;

export function renameSlot(id: string, name: string, store = defaultStore()): boolean {
  try {
    const index = store && readIndex(store);
    const slot = index?.slots.find((s) => s.id === id);
    if (!store || !index || !slot) return false;
    slot.name = cleanName(name);
    writeIndex(store, index);
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(id: string, store = defaultStore()): boolean {
  try {
    const index = store && readIndex(store);
    if (!store || !index) return false;
    index.slots = index.slots.filter((s) => s.id !== id);
    if (index.last === id) index.last = null;
    writeIndex(store, index);
    store.removeItem(slotKey(id));
    return true;
  } catch {
    return false;
  }
}

/** Roughly how much of the browser's storage the games use, 0 … 1 (it holds about SLOTS.storageBytes). */
export function storageUse(store = defaultStore()): number {
  if (!store) return 0;
  let chars = 0;
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k) chars += k.length + (store.getItem(k)?.length ?? 0);
    }
  } catch {
    return 0;
  }
  return (chars * 2) / SLOTS.storageBytes; // UTF-16: two bytes a character
}
