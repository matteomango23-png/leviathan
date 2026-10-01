// Keeps the save in the browser (localStorage). Never throws: storage can be blocked or full.
import { SAVE } from '../../data/diver';
import { parseSave, serializeSave, SaveError, type SaveData } from './saveData';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type LoadResult = { ok: true; save: SaveData | null } | { ok: false; error: string };

export function loadFromStorage(store = defaultStore()): LoadResult {
  if (!store) return { ok: true, save: null };
  let text: string | null;
  try {
    text = store.getItem(SAVE.storageKey);
  } catch {
    return { ok: true, save: null };
  }
  if (text === null) return { ok: true, save: null };
  try {
    return { ok: true, save: parseSave(text) };
  } catch (e) {
    return { ok: false, error: e instanceof SaveError ? e.message : 'Salvataggio illeggibile.' };
  }
}

export function writeToStorage(save: SaveData, store = defaultStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE.storageKey, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}

/** Keeps a copy of an unreadable save instead of overwriting it, so nothing is lost for good. */
export function backupBrokenSave(store = defaultStore()): void {
  if (!store) return;
  try {
    const text = store.getItem(SAVE.storageKey);
    if (text !== null) store.setItem(`${SAVE.storageKey}-rotto-${Date.now()}`, text);
  } catch {
    // nothing else we can do
  }
}

const previousKey = (): string => `${SAVE.storageKey}-precedente`;

/** "Nuova partita": the current save is kept aside as the previous game (one copy), then removed. */
export function startOverInStorage(store = defaultStore()): boolean {
  if (!store) return false;
  try {
    const text = store.getItem(SAVE.storageKey);
    if (text !== null) store.setItem(previousKey(), text);
    store.removeItem(SAVE.storageKey);
    return true;
  } catch {
    return false;
  }
}

export function hasPreviousGame(store = defaultStore()): boolean {
  try {
    return !!store && store.getItem(previousKey()) !== null;
  } catch {
    return false;
  }
}

/** Swaps the current game and the previous one (so going back is never a loss either). */
export function swapWithPreviousGame(store = defaultStore()): boolean {
  if (!store) return false;
  try {
    const prev = store.getItem(previousKey());
    if (prev === null) return false;
    const cur = store.getItem(SAVE.storageKey);
    store.setItem(SAVE.storageKey, prev);
    if (cur !== null) store.setItem(previousKey(), cur);
    else store.removeItem(previousKey());
    return true;
  } catch {
    return false;
  }
}
