import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  SaveError,
  exportFileName,
  migrate,
  newSave,
  parseSave,
  serializeSave,
  type Migration,
} from '../src/systems/save/saveData';
import {
  backupBrokenSave,
  loadFromStorage,
  writeToStorage,
  type KeyValueStore,
} from '../src/systems/save/storage';
import { SAVE } from '../src/data/diver';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe('save format', () => {
  it('round-trips through text', () => {
    const s = newSave({ x: 10, y: 50 });
    s.fishCaught = { sardina: 3 };
    s.seen = ['sardina'];
    expect(parseSave(serializeSave(s))).toEqual(s);
  });

  it('carries the current version', () => {
    expect(newSave({ x: 0, y: 0 }).version).toBe(SAVE_VERSION);
  });

  it('rejects broken or foreign files with a clear message', () => {
    expect(() => parseSave('not json')).toThrow(SaveError);
    expect(() => parseSave('[]')).toThrow(SaveError);
    expect(() => parseSave(JSON.stringify({ game: 'altro', version: 1 }))).toThrow(/Leviatano/);
    const bad = { ...newSave({ x: 0, y: 0 }), fishCaught: { sardina: -1 } };
    expect(() => parseSave(JSON.stringify(bad))).toThrow(SaveError);
  });

  it('refuses saves from a newer game version', () => {
    const future = { ...newSave({ x: 0, y: 0 }), version: SAVE_VERSION + 1 };
    expect(() => parseSave(JSON.stringify(future))).toThrow(/più nuova/);
  });

  it('removes duplicate bestiary entries', () => {
    const s = { ...newSave({ x: 0, y: 0 }), seen: ['sardina', 'sardina'] };
    expect(parseSave(JSON.stringify(s)).seen).toEqual(['sardina']);
  });

  it('names export files with the date', () => {
    expect(exportFileName(new Date('2026-09-30T12:00:00Z'))).toBe('leviatano-salvataggio-2026-09-30.json');
  });
});

describe('migrations', () => {
  const chain: Migration[] = [
    { from: 1, migrate: (o) => ({ ...o, coins: 0 }) },
    { from: 2, migrate: (o) => ({ ...o, teeth: o.coins, coins: undefined }) },
  ];

  it('upgrades one version at a time', () => {
    const out = migrate({ game: 'leviatano', version: 1 }, chain, 3);
    expect(out.version).toBe(3);
    expect(out.teeth).toBe(0);
  });

  it('treats a save without version as version 0 and fails if no migration exists', () => {
    expect(() => migrate({ game: 'leviatano' }, chain, 3)).toThrow(/versione 0/);
  });

  it('leaves current saves untouched', () => {
    const s = { game: 'leviatano', version: 3, x: 1 };
    expect(migrate(s, chain, 3)).toEqual(s);
  });
});

describe('storage', () => {
  it('writes and reads back', () => {
    const store = memoryStore();
    const s = newSave({ x: 1, y: 2 });
    expect(writeToStorage(s, store)).toBe(true);
    expect(loadFromStorage(store)).toEqual({ ok: true, save: s });
  });

  it('returns nothing when there is no save', () => {
    expect(loadFromStorage(memoryStore())).toEqual({ ok: true, save: null });
  });

  it('reports a broken save and can back it up', () => {
    const store = memoryStore();
    store.setItem(SAVE.storageKey, '{broken');
    const r = loadFromStorage(store);
    expect(r.ok).toBe(false);
    backupBrokenSave(store);
    expect([...store.data.keys()].some((k) => k.startsWith(`${SAVE.storageKey}-rotto-`))).toBe(true);
  });

  it('survives a storage that throws', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
    };
    expect(loadFromStorage(throwing)).toEqual({ ok: true, save: null });
    expect(writeToStorage(newSave({ x: 0, y: 0 }), throwing)).toBe(false);
  });
});
