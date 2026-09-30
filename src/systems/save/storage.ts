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
