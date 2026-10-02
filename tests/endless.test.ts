// The endless open sea (tappa 11): generated piece by piece east of the Mare di Ghiaccio, always the same,
// stretch after stretch of different kinds, deeper and more dangerous the farther you go.
import { beforeAll, describe, expect, it } from 'vitest';
import { WILD_SPAWNS } from '../src/data/beasts';
import { BIOMES, ENDLESS } from '../src/data/endless';
import { SPRITE_KEYS } from '../src/data/sprites.generated';
import { TILE, WORLD } from '../src/data/worldLayout';
import { prepareEndlessSpawn, stepEndlessSchools, stepVents } from '../src/systems/endlessLife';
import { SUITS } from '../src/data/world';
import { DIVER } from '../src/data/diver';
import { createWild } from '../src/systems/beasts/wildState';
import { createFish } from '../src/systems/fish';
import { makeRng } from '../src/systems/math';
import { seaMap } from '../src/systems/seaMap';
import {
  biomeOf,
  endlessFloor,
  endlessTile,
  generateChunk,
  ventAt,
  ventsOf,
} from '../src/systems/world/endless';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { zoneAt } from '../src/systems/world/zones';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const S = ENDLESS.startX;
const km = WORLD.unitsPerMetre * 1000;

describe('the endless sea', () => {
  it('is the same every time', () => {
    for (let i = 0; i < 200; i++) {
      const x = S + i * 397;
      const y = 40 + ((i * 53) % 900);
      expect(endlessTile(x, y)).toBe(endlessTile(x, y));
    }
    const a = generateChunk(WORLD.cols + 640, 64, WORLD.rows, WORLD.tileSize);
    const b = generateChunk(WORLD.cols + 640, 64, WORLD.rows, WORLD.tileSize);
    expect(a).toEqual(b);
  });

  it('starts with open sea and then mixes every kind of stretch', () => {
    expect(biomeOf(0).id).toBe('aperto');
    const kinds = new Set(Array.from({ length: 80 }, (_, k) => biomeOf(k).id));
    expect(kinds.size).toBe(BIOMES.length);
  });

  it('has a floor without steps, from the hand-made coast on, and deeper far away', () => {
    // where one stretch meets the next (and where the hand-made coast ends) the floor joins smoothly; the walls of
    // a trench are steep on purpose, inside its stretch
    expect(Math.abs(endlessFloor(S) - ENDLESS.firstFloorY)).toBeLessThan(2); // the hand-made floor goes on
    for (let k = 1; k < 120; k++) {
      const x = S + k * ENDLESS.stretch;
      const step = Math.abs(endlessFloor(x + 1) - endlessFloor(x - 1));
      expect(step, `stretch ${k}`).toBeLessThan(20);
    }
    const near = (endlessFloor(S + 900) + endlessFloor(S + 2700)) / 2;
    let far = 0;
    for (let i = 0; i < 20; i++) far += endlessFloor(S + 40 * km + i * 911) / 20;
    expect(far).toBeGreaterThan(near);
    expect(map.width).toBeGreaterThan(500 * km);
  });

  it('can always be swum through near the surface (no wall across the sea)', () => {
    for (let x = S - 400; x < S + 20 * km; x += 40) {
      let open = false;
      for (let y = 60; y < 220 && !open; y += 8) if (!map.solidAt(x, y)) open = true;
      expect(open, `x ${x}`).toBe(true);
    }
  });

  it('names the zones out there and shows them on the map', () => {
    expect(zoneAt(S + 100, 200)).toBe('Mare aperto');
    const names = BIOMES.map((b) => b.name);
    expect(seaMap(new Set()).some((z) => names.includes(z.name))).toBe(true);
  });

  it('keeps broken tiles apart from the hand-made ones', () => {
    for (const [tx, ty] of [
      [WORLD.cols + 5, 40],
      [WORLD.cols + 777, 3],
      [12, 100],
    ] as const) {
      const i = map.tileIndex(tx, ty);
      expect(map.tileOf(i)).toEqual({ tx, ty });
    }
    expect(map.tileIndex(WORLD.cols, 0)).toBeGreaterThan(map.tileIndex(WORLD.cols - 1, WORLD.rows - 1));
  });

  it('makes its pieces quickly enough for a phone', () => {
    const t = performance.now();
    for (let i = 0; i < 20; i++) generateChunk(WORLD.cols + 5000 + i * 64, 64, WORLD.rows, WORLD.tileSize);
    expect((performance.now() - t) / 20).toBeLessThan(60); // ms per piece (a piece is ~85 m)
    expect(endlessTile(S + 100, 10)).toBe(TILE.water);
  });
});

describe('life out there', () => {
  it('beasts of the stretch you are in, stronger the farther you go', () => {
    const def = WILD_SPAWNS.find((s) => s.endless)!;
    const rng = makeRng(3);
    const w = createWild(1, def);
    const levelAt = (x: number): number => {
      expect(prepareEndlessSpawn(w, { x }, rng)).toBe(true);
      expect(Object.keys(biomeOf(Math.floor((x - S) / ENDLESS.stretch)).beasts)).toContain(w.spawn.speciesId);
      return w.spawn.level![0];
    };
    expect(levelAt(S + 2 * km)).toBeLessThan(levelAt(S + 20 * km));
    expect(prepareEndlessSpawn(w, { x: S - 100 }, rng)).toBe(false); // the hand-made coast keeps its own beasts
  });

  it('only beasts with a side picture live out there (otherwise they would be invisible)', () => {
    for (const b of BIOMES) for (const id of Object.keys(b.beasts)) expect(SPRITE_KEYS, id).toContain(id);
  });

  it('sardines follow you: a school left far behind is moved near you', () => {
    const rng = makeRng(5);
    const fish = createFish(map, rng);
    const diver = { x: S + 10 * km, y: 120 };
    stepEndlessSchools(fish, map, diver, rng);
    const roaming = fish.schools.filter((s) => s.roaming);
    expect(roaming.length).toBe(ENDLESS.schools);
    for (const s of roaming) expect(Math.hypot(s.x - diver.x, s.y - diver.y)).toBeLessThan(ENDLESS.schoolFar);
  });
});

describe('air in the open sea', () => {
  it('there are air vents in every stretch, on the floor, with open water above them', () => {
    let last = ENDLESS.startX;
    for (let k = 0; k < 60; k++) {
      for (const v of ventsOf(k)) {
        expect(v.y).toBeLessThan(endlessFloor(v.x) + 60); // on the floor or a mound, never buried
        expect(map.solidAt(v.x, v.y - 30), `vent of stretch ${k}`).toBe(false);
        expect(v.x - last).toBeLessThan(ENDLESS.stretch * 2.5);
        last = v.x;
      }
    }
  });

  it('breathing in its bubbles fills your air', () => {
    const v = ventsOf(3)[0]!;
    const diver = { x: v.x, y: v.y - 40, o2: 5, maxO2: 60, dead: false };
    const events: { type: string }[] = [];
    const timer = { vent: 0 };
    for (let t = 0; t < 3; t += 1 / 30) stepVents(diver, 1 / 30, timer, events as never);
    expect(diver.o2).toBe(60);
    expect(events.filter((e) => e.type === 'ventBreath')).toHaveLength(1);
    expect(ventAt(v.x + 200, v.y - 40)).toBeNull();
  });

  it('the long-dive suits give 4 to 5 minutes of air', () => {
    const seconds = (id: string): number => {
      const s = SUITS.find((x) => x.id === id)!;
      const drain = DIVER.oxygen.drainBase + DIVER.oxygen.drainDepthExtra * 0.25; // a usual depth
      return DIVER.maxO2 / (drain * s.o2Mult);
    };
    expect(seconds('traversata')).toBeGreaterThan(200);
    expect(seconds('bombole')).toBeGreaterThan(seconds('traversata'));
    expect(seconds('bombole')).toBeLessThan(360);
  });
});
