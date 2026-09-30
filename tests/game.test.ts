import { beforeAll, describe, expect, it } from 'vitest';
import { DIVER, HARPOON } from '../src/data/diver';
import { START } from '../src/data/worldLayout';
import { WEAPONS } from '../src/data/world';
import { createGame, stepGame, toSave, applySave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { generateWorld } from '../src/systems/world/worldGen';
import type { TileMap } from '../src/systems/world/tileMap';
import type { GameEvent } from '../src/systems/events';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const run = (g: GameState, seconds: number, input = emptyInput()): GameEvent[] => {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) all.push(...stepGame(g, input, 1 / 60));
  return all;
};

/** Puts one sardine right in front of the diver and keeps the others far away. */
function sardineAhead(g: GameState, dx: number): void {
  const d = g.diver;
  for (const f of g.fish.fish) {
    f.x = 20;
    f.y = 40;
    f.alive = false;
    f.respawn = 999;
  }
  const f = g.fish.fish[0]!;
  f.alive = true;
  f.x = d.x + dx;
  f.y = d.y;
}

describe('diver', () => {
  it('swims where the stick points and faces that way', () => {
    const g = createGame(map, null, 1);
    const x0 = g.diver.x;
    run(g, 0.5, { ...emptyInput(), moveX: -1 });
    expect(g.diver.x).toBeLessThan(x0);
    expect(g.diver.face).toBe(-1);
  });

  it('never exceeds max speed without dashing', () => {
    const g = createGame(map, null, 1);
    run(g, 1, { ...emptyInput(), moveX: 1, moveY: 1 });
    expect(Math.hypot(g.diver.vx, g.diver.vy)).toBeLessThanOrEqual(DIVER.maxSpeed + 1e-6);
  });

  it('dashes faster than swimming, then has to wait', () => {
    const g = createGame(map, null, 1);
    const events = stepGame(g, { ...emptyInput(), moveX: 1, dash: true }, 1 / 60);
    expect(events.some((e) => e.type === 'dash')).toBe(true);
    expect(Math.hypot(g.diver.vx, g.diver.vy)).toBeGreaterThan(DIVER.maxSpeed);
    const again = stepGame(g, { ...emptyInput(), moveX: 1, dash: true }, 1 / 60);
    expect(again.some((e) => e.type === 'dash')).toBe(false);
  });

  it('loses oxygen underwater, refills at the surface', () => {
    const g = createGame(map, null, 1);
    g.diver.y = 200;
    g.diver.x = 2400;
    run(g, 2);
    expect(g.diver.o2).toBeLessThan(DIVER.maxO2);
    g.diver.y = START.y;
    run(g, 2, { ...emptyInput(), moveY: -1 });
    expect(g.diver.o2).toBe(DIVER.maxO2);
  });

  it('chokes without air, dies, and comes back at the start', () => {
    const g = createGame(map, null, 1);
    g.diver.x = 2400;
    g.diver.y = 200;
    g.diver.o2 = 0;
    const events = run(g, DIVER.oxygen.chokeInterval * (DIVER.maxHp + 1) + DIVER.respawnDelay + 1);
    expect(events.some((e) => e.type === 'died')).toBe(true);
    expect(events.some((e) => e.type === 'respawned')).toBe(true);
    expect(g.diver.hp).toBe(DIVER.maxHp);
  });
});

describe('harpoon and sardines', () => {
  it('catches a sardine, heals a heart and counts it', () => {
    const g = createGame(map, null, 1);
    g.diver.hp = DIVER.maxHp - 1;
    sardineAhead(g, 30);
    const events = run(g, 1, { ...emptyInput(), fireHeld: true, aim: 0 });
    const caught = events.find((e) => e.type === 'fishCaught');
    expect(caught).toMatchObject({ fishId: 'sardina', count: 1, healed: true });
    expect(g.diver.hp).toBe(DIVER.maxHp);
    expect(g.fishCaught.sardina).toBe(1);
    expect(g.seen.has('sardina')).toBe(true);
  });

  it('respects the weapon cooldown from the data', () => {
    const g = createGame(map, null, 1);
    sardineAhead(g, 1000);
    const events = run(g, 1, { ...emptyInput(), fireHeld: true, aim: Math.PI / 2 });
    const shots = events.filter((e) => e.type === 'harpoonFired').length;
    const cooldown = WEAPONS.find((w) => w.id === 'arpione')!.cooldown;
    const flight = (2 * HARPOON.range) / HARPOON.speed; // at most: out and back
    expect(shots).toBeGreaterThan(0);
    expect(shots).toBeLessThanOrEqual(Math.ceil(1 / Math.min(cooldown, flight)) + 1);
  });

  it('misses fish that are out of range', () => {
    const g = createGame(map, null, 1);
    sardineAhead(g, HARPOON.range + 60);
    g.fish.fish[0]!.y = g.diver.y + 40;
    const events = run(g, 0.4, { ...emptyInput(), fireHeld: true, aim: 0 });
    expect(events.some((e) => e.type === 'fishCaught')).toBe(false);
  });
});

describe('save round trip through the game', () => {
  it('keeps position, catches and bestiary', () => {
    const g = createGame(map, null, 1);
    g.fishCaught.sardina = 7;
    g.seen.add('sardina');
    g.diver.x = 2500;
    g.diver.y = 100;
    const s = toSave(g, new Date('2026-09-30T10:00:00Z'));
    const g2 = createGame(map, s, 2);
    expect(g2.fishCaught.sardina).toBe(7);
    expect(g2.seen.has('sardina')).toBe(true);
    expect(g2.diver.x).toBe(2500);
    const g3 = createGame(map, null, 3);
    applySave(g3, s);
    expect(g3.fishCaught.sardina).toBe(7);
  });
});
