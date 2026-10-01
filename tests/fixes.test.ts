// Fixes after the owner's full play test (1 ottobre 2026): each would have caught the problem.
import { describe, expect, it } from 'vitest';
import { DIVER, SAVE } from '../src/data/diver';
import { WRECKS } from '../src/data/economy';
import { callMount } from '../src/systems/beasts/mount';
import { createGame, currentAction, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import {
  hasPreviousGame,
  startOverInStorage,
  swapWithPreviousGame,
  type KeyValueStore,
} from '../src/systems/save/storage';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

/** A diver with a white shark following close by. */
function withMount(x: number, y: number): GameState {
  const g = createGame(map, null, 2);
  giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 8);
  Object.assign(g.diver, { x, y, vx: 0, vy: 0 });
  const c = callMount(g.beasts.team[0]!, g.diver, map);
  Object.assign(c, { x: x + 20, y, state: 'ride' });
  g.beasts.mount = c;
  return g;
}

describe('new game and previous game', () => {
  it('a new game keeps the current one aside, and you can swap back', () => {
    const s = memoryStore();
    s.setItem(SAVE.storageKey, 'A');
    expect(startOverInStorage(s)).toBe(true);
    expect(s.getItem(SAVE.storageKey)).toBeNull();
    expect(hasPreviousGame(s)).toBe(true);
    s.setItem(SAVE.storageKey, 'B');
    expect(swapWithPreviousGame(s)).toBe(true);
    expect(s.getItem(SAVE.storageKey)).toBe('A');
    expect(swapWithPreviousGame(s)).toBe(true);
    expect(s.getItem(SAVE.storageKey)).toBe('B');
  });
});

describe('the context button (bug: it offered to ride instead of opening)', () => {
  it('a chest nearby: Apri, even while riding', () => {
    const chest = g0chest();
    const g = withMount(chest.x, chest.y - 6);
    expect(currentAction(g)).toBe('apri');
    g.beasts.riding = true;
    expect(currentAction(g)).toBe('apri');
  });
});

function g0chest(): { x: number; y: number } {
  const g = createGame(map, null, 1);
  const w = g.wrecks.find((x) => x.def.id === WRECKS[0]!.id)!;
  return { x: w.x, y: w.y };
}

describe('stuck in the sea floor (bug)', () => {
  it('a diver inside rock is moved to the nearest open water', () => {
    const g = createGame(map, null, 1);
    const x = 900;
    const floor = map.floorBelow(x, 100);
    Object.assign(g.diver, { x, y: floor + 12, vx: 0, vy: 0 });
    expect(map.hitCircle(g.diver.x, g.diver.y, DIVER.radius)).toBe(true);
    stepGame(g, emptyInput(), 1 / 30);
    expect(map.hitCircle(g.diver.x, g.diver.y, DIVER.radius)).toBe(false);
    expect(Math.abs(g.diver.y - floor)).toBeLessThan(30);
  });
});

describe('the speargun', () => {
  it('does not shoot while riding', () => {
    const g = withMount(900, 200);
    g.beasts.riding = true;
    const ev = stepGame(g, { ...emptyInput(), fireHeld: true, aim: 0 }, 1 / 30);
    expect(ev.some((e) => e.type === 'harpoonFired')).toBe(false);
  });
});
