import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  SaveError,
  migrate,
  newSave,
  parseSave,
  serializeSave,
  type Migration,
} from '../src/systems/save/saveData';
import { createSlot, listSlots, loadSlot, writeSlot, type SlotStore } from '../src/systems/save/slots';

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
  it('survives a storage that throws', () => {
    const throwing: SlotStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
      length: 0,
      key: () => null,
    };
    expect(loadSlot('p1', throwing).ok).toBe(false);
    expect(writeSlot('p1', newSave({ x: 0, y: 0 }), throwing)).toBe(false);
    expect(createSlot('Prima', throwing)).toBeNull();
    expect(listSlots(throwing)).toEqual([]);
  });
});
