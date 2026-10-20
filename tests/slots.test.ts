// The list of games of the title menu (19 ottobre 2026): the old saves move in, nothing is ever written over.
import { describe, expect, it } from 'vitest';
import { SAVE, SLOTS } from '../src/data/diver';
import { newSave, serializeSave } from '../src/systems/save/saveData';
import {
  createSlot,
  deleteSlot,
  importSlot,
  lastSlot,
  listSlots,
  loadSlot,
  migrateLegacySaves,
  nextGameName,
  renameSlot,
  slotText,
  storageUse,
  writeSlot,
  type SlotStore,
} from '../src/systems/save/slots';

const memoryStore = (): SlotStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
  };
};

const saveAt = (x: number, playTime = 60): ReturnType<typeof newSave> => {
  const s = newSave({ x, y: 50 });
  s.playTime = playTime;
  s.savedAt = new Date(2026, 9, 19, 12, 0, playTime).toISOString();
  return s;
};

describe('moving the old saves into the list', () => {
  it('the save, the previous game and the unreadable copies all become games; the old keys go', () => {
    const st = memoryStore();
    st.setItem(SAVE.storageKey, serializeSave(saveAt(10)));
    st.setItem(`${SAVE.storageKey}-precedente`, serializeSave(saveAt(20)));
    st.setItem(`${SAVE.storageKey}-rotto-1760000000000`, '{ rotto');
    migrateLegacySaves(st);
    const games = listSlots(st);
    expect(games).toHaveLength(3);
    expect(games.map((g) => g.name)).toContain(`${SLOTS.defaultName} 1`);
    expect(games.map((g) => g.name)).toContain(SLOTS.previousName);
    expect(games.find((g) => g.broken)?.name).toMatch(SLOTS.brokenName);
    expect(st.getItem(SAVE.storageKey)).toBeNull();
    expect(st.getItem(`${SAVE.storageKey}-precedente`)).toBeNull();
    // Riprendi opens the old current save
    const last = lastSlot(st)!;
    expect(last.name).toBe(`${SLOTS.defaultName} 1`);
    const loaded = loadSlot(last.id, st);
    expect(loaded.ok && loaded.save?.diver.x).toBe(10);
  });

  it('runs only once: a second start changes nothing', () => {
    const st = memoryStore();
    st.setItem(SAVE.storageKey, serializeSave(saveAt(10)));
    migrateLegacySaves(st);
    st.setItem(SAVE.storageKey, serializeSave(saveAt(99))); // (cannot happen, but must not be taken again)
    migrateLegacySaves(st);
    expect(listSlots(st)).toHaveLength(1);
  });

  it('with nothing saved the list is empty', () => {
    const st = memoryStore();
    migrateLegacySaves(st);
    expect(listSlots(st)).toEqual([]);
    expect(lastSlot(st)).toBeNull();
  });
});

describe('games side by side', () => {
  it('a new game leaves the others as they are', () => {
    const st = memoryStore();
    const a = createSlot('Prima', st)!;
    writeSlot(a, saveAt(10), st);
    const before = slotText(a, st);
    const b = createSlot(nextGameName(st), st)!;
    expect(b).not.toBe(a);
    expect(slotText(a, st)).toBe(before);
    expect(loadSlot(b, st)).toEqual({ ok: true, save: null }); // a new game starts from the beginning
    writeSlot(b, saveAt(30), st);
    expect(listSlots(st)[0]!.id).toBe(b); // the last played first
    expect(listSlots(st)).toHaveLength(2);
  });

  it('an unreadable game is never written over', () => {
    const st = memoryStore();
    st.setItem(SAVE.storageKey, '{ rotto');
    migrateLegacySaves(st);
    const g = listSlots(st)[0]!;
    expect(g.broken).toBeTruthy();
    expect(loadSlot(g.id, st).ok).toBe(false);
    expect(lastSlot(st)).toBeNull(); // Riprendi does not open it
    expect(writeSlot(g.id, saveAt(5), st)).toBe(false);
    expect(slotText(g.id, st)).toBe('{ rotto'); // still there, to export
  });

  it('a game imported from a file joins the list; the others stay as they are (20 ottobre)', () => {
    const st = memoryStore();
    const a = createSlot('Prima', st)!;
    writeSlot(a, saveAt(10), st);
    const before = slotText(a, st);
    const b = importSlot('leviatano-backup', saveAt(77), st)!;
    expect(b).not.toBe(a);
    expect(slotText(a, st)).toBe(before);
    expect(listSlots(st).find((g) => g.id === b)?.name).toBe('leviatano-backup');
    const loaded = loadSlot(b, st);
    expect(loaded.ok && loaded.save?.diver.x).toBe(77);
  });

  it('rename and delete', () => {
    const st = memoryStore();
    const a = createSlot('Prima', st)!;
    writeSlot(a, saveAt(10), st);
    expect(renameSlot(a, '  La mia   partita  ', st)).toBe(true);
    expect(listSlots(st)[0]!.name).toBe('La mia partita');
    renameSlot(a, '   ', st);
    expect(listSlots(st)[0]!.name).toBe(SLOTS.defaultName);
    expect(deleteSlot(a, st)).toBe(true);
    expect(listSlots(st)).toEqual([]);
    expect(slotText(a, st)).toBeNull();
  });

  it('the names count on: Partita 1, Partita 2…', () => {
    const st = memoryStore();
    createSlot(nextGameName(st), st);
    expect(nextGameName(st)).toBe(`${SLOTS.defaultName} 2`);
  });

  it('a game takes a small share of the storage', () => {
    const st = memoryStore();
    const a = createSlot('Prima', st)!;
    writeSlot(a, saveAt(10), st);
    expect(storageUse(st)).toBeLessThan(0.05);
  });
});
