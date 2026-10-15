// The sardines go on their way past you (owner, 15 ottobre 2026): the school opens round you and closes behind,
// instead of making a ring around a diver or a submarine.
import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/worldLayout';
import { createFish, stepFish } from '../src/systems/fish';
import { makeRng } from '../src/systems/math';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function crossing(r: number): { beyond: number; ring: number } {
  const rng = makeRng(7);
  const state = createFish(map, rng);
  const sc = state.schools[0]!;
  const you = map.nearestOpen(3600, WORLD.surfaceY + 150, 30);
  Object.assign(sc, {
    x: you.x - 160,
    y: you.y,
    tx: you.x + 400,
    ty: you.y,
    t: 60,
    roam: [you.x - 600, you.y - 40, you.x + 600, you.y + 40],
  });
  const mine = state.fish.filter((f) => f.school === sc);
  for (const f of mine) Object.assign(f, { x: sc.x + f.ox, y: sc.y + f.oy, vx: 0, vy: 0, alive: true });
  let ring = 0;
  for (let t = 0; t < 22; t += 1 / 30) {
    stepFish(state, map, { x: you.x, y: you.y, alive: true, r }, t, 1 / 30, rng);
    // fish hanging around you, neither before nor past you
    ring +=
      mine.filter((f) => Math.abs(f.x - you.x) < 30 && Math.hypot(f.x - you.x, f.y - you.y) < 80).length / 30;
  }
  return { beyond: mine.filter((f) => f.x > you.x + 40).length / mine.length, ring: ring / mine.length };
}

describe('a school stopped on you', () => {
  it('moves on instead of making a ring round you', () => {
    const rng = makeRng(3);
    const state = createFish(map, rng);
    const sc = state.schools[0]!;
    const you = map.nearestOpen(3600, WORLD.surfaceY + 150, 30);
    Object.assign(sc, {
      x: you.x + 5,
      y: you.y,
      tx: you.x + 5,
      ty: you.y,
      t: 60,
      roam: [you.x - 600, you.y - 40, you.x + 600, you.y + 40],
    });
    const mine = state.fish.filter((f) => f.school === sc);
    for (const f of mine) Object.assign(f, { x: sc.x + f.ox, y: sc.y + f.oy, vx: 0, vy: 0, alive: true });
    let around = 0;
    let steps = 0;
    for (let t = 0; t < 20; t += 1 / 30) {
      stepFish(state, map, { x: you.x, y: you.y, alive: true }, t, 1 / 30, rng);
      around += mine.filter((f) => Math.hypot(f.x - you.x, f.y - you.y) < 70).length / mine.length;
      steps++;
    }
    // on average only a few of them beside you (it used to be all of them, round you, the whole time)
    expect(around / steps).toBeLessThan(0.3);
  });
});

describe('a school crossing you', () => {
  it('passes a diver standing still and goes on the other side', () => {
    const { beyond, ring } = crossing(0);
    expect(beyond).toBeGreaterThan(0.8);
    expect(ring).toBeLessThan(3); // each fish spends only a few seconds beside you
  });

  it('passes a submarine as big as it is', () => {
    const { beyond } = crossing(40);
    expect(beyond).toBeGreaterThan(0.8);
  });
});
