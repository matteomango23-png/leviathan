// The harpoon hits more easily (owner, 15 ottobre 2026): it checks the whole stretch it flies each step, and a fish or
// beast just off its line pulls the shot gently onto itself.
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON } from '../src/data/diver';
import { WORLD } from '../src/data/worldLayout';
import { createDiver } from '../src/systems/diver';
import type { GameEvent } from '../src/systems/events';
import { createFish } from '../src/systems/fish';
import { assistAim, createHarpoon, fireHarpoon, stepHarpoon } from '../src/systems/harpoon';
import { makeRng } from '../src/systems/math';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('the harpoon', () => {
  it('hooks a fish that sits between two of its steps', () => {
    const fish = createFish(map, makeRng(1));
    const at = map.nearestOpen(3600, WORLD.surfaceY + 150, 40);
    const d = createDiver(at.x, at.y);
    for (const f of fish.fish) f.alive = false;
    const f = fish.fish[0]!;
    // on the line of the shot, where a 1/30 s step jumps over it (the old check looked only at each step's end)
    Object.assign(f, {
      alive: true,
      x: at.x + HARPOON.muzzleOffset + HARPOON.speed / 30 / 2,
      y: at.y,
      vx: 0,
      vy: 0,
    });
    const h = createHarpoon();
    const ev: GameEvent[] = [];
    expect(fireHarpoon(h, d, 0, ev)).toBe(true);
    for (let i = 0; i < 4; i++) stepHarpoon(h, d, fish, map, 1 / 30, ev);
    expect(f.hooked).toBe(true);
  });

  it('bends a little onto a fish just off its line, not onto one far off', () => {
    const from = { x: 0, y: 0 };
    const near = { x: 100, y: 100 * Math.tan((4 * Math.PI) / 180) };
    const far = { x: 100, y: 100 * Math.tan((20 * Math.PI) / 180) };
    expect(assistAim(from, 0, [near])).toBeCloseTo(Math.atan2(near.y, near.x), 5);
    expect(assistAim(from, 0, [far])).toBe(0);
  });
});
