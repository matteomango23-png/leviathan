// Tappa 10, the coast: a gentle beach from Portofosco, the wider bay, the Isola delle Mangrovie (you dive under it,
// Porto Fango on its east shore), the Delta at the mouth of its river; slower swimming; old saves moved over.
import { beforeAll, describe, expect, it } from 'vitest';
import { DIVER } from '../src/data/diver';
import { PORT, PORTO_FANGO } from '../src/data/economy';
import { LAIR } from '../src/data/guardians';
import { BONE_WALL, COAST, DELTA, LAYOUT, START, TILE, WORLD } from '../src/data/worldLayout';
import { portAt, portStart } from '../src/systems/economy/places';
import { createGame, enterPort, respawnPoint, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld, landHeight } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

/** Tiles of open water reachable from a point (flood fill through water). */
function reachable(m: TileMap, x: number, y: number): Uint8Array {
  const seen = new Uint8Array(m.cols * m.rows);
  const stack = [Math.floor(y / m.tileSize) * m.cols + Math.floor(x / m.tileSize)];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || m.get(i % m.cols, Math.floor(i / m.cols)) !== TILE.water) continue;
    seen[i] = 1;
    const tx = i % m.cols;
    if (tx > 0) stack.push(i - 1);
    if (tx < m.cols - 1) stack.push(i + 1);
    if (i >= m.cols) stack.push(i - m.cols);
    if (i < m.cols * (m.rows - 1)) stack.push(i + m.cols);
  }
  return seen;
}

describe('the coast', () => {
  it('slopes gently: shallow water far out from the beach, deep water at the bay', () => {
    expect(map.hitCircle(PORT.x, START.y, DIVER.radius)).toBe(false); // water under the pier
    expect(map.floorBelow(LAYOUT.shoreX + 400, START.y) - WORLD.surfaceY).toBeLessThan(
      WORLD.unitsPerMetre * 25,
    );
    expect(map.floorBelow(LAYOUT.bay.x0 + 300, START.y) - WORLD.surfaceY).toBeGreaterThan(
      WORLD.unitsPerMetre * 40,
    );
    expect(COAST.slope).toBeGreaterThan(3);
  });

  it('has the island out of the water: at the surface you cannot swim across it', () => {
    const mid = (LAYOUT.island.x0 + LAYOUT.island.x1) / 2;
    expect(landHeight(mid)).toBeGreaterThan(10);
    expect(map.solidAt(mid, WORLD.surfaceY + 6)).toBe(true);
  });

  it('lets you swim from the beach to the Delta under the island, and to the open sea', () => {
    const seen = reachable(map, START.x, START.y);
    const at = (x: number, y: number): boolean =>
      seen[Math.floor(y / map.tileSize) * map.cols + Math.floor(x / map.tileSize)] === 1;
    const mid = (LAYOUT.island.x0 + LAYOUT.island.x1) / 2;
    expect(at(mid, 250)).toBe(true); // the passage under the island
    expect(at((DELTA.x0 + DELTA.x1) / 2, 100)).toBe(true);
    expect(at(PORTO_FANGO.x, START.y)).toBe(true);
    expect(at(DELTA.x1 + 400, 150)).toBe(true);
    expect(at(LAIR.x, LAIR.shaft.yTop - 20)).toBe(true); // the lair's entrance on the bay floor
  });
});

describe('Porto Fango', () => {
  it('is a harbour of its own: you come in, and wake up there afterwards', () => {
    const g = createGame(map, null, 1);
    Object.assign(g.diver, portStart(PORTO_FANGO));
    expect(portAt(g.diver, map)?.id).toBe('fango');
    g.port = portAt(g.diver, map);
    enterPort(g);
    expect(g.homePort).toBe('fango');
    expect(respawnPoint(g).x).toBeCloseTo(portStart(PORTO_FANGO).x);
    expect(parseSave(JSON.stringify(toSave(g, new Date()))).homePort).toBe('fango');
  });
});

describe('saves from before the coast', () => {
  it('move the diver into the new world and keep the broken bones', () => {
    const g = createGame(map, null, 1);
    const v6 = JSON.parse(JSON.stringify(toSave(g, new Date()))) as Record<string, unknown>;
    v6.version = 6;
    delete v6.homePort;
    v6.brokenTiles = [125 * 785 + 30, 45 * 785 + 96]; // the bone wall and the bones over the lair, old numbering
    v6.diver = { x: 1000, y: 200 }; // the middle of the old bay
    const save = parseSave(JSON.stringify(v6));
    expect(save.diver.x).toBe(LAYOUT.bay.x0 + (1000 - LAYOUT.bay.from) * LAYOUT.bay.stretch);
    expect(save.homePort).toBe('portofosco');
    expect(save.brokenTiles).toContain(BONE_WALL.ty0 * WORLD.cols + BONE_WALL.tx0);
    const gateTile = 45 * WORLD.cols + Math.floor((LAIR.shaft.x0 + LAIR.shaft.x1) / 2 / WORLD.tileSize);
    expect(save.brokenTiles).toContain(gateTile);
    const moved = createGame(generateWorld(), save, 1);
    expect(map.hitCircle(moved.diver.x, moved.diver.y, DIVER.radius)).toBe(false);
  });
});
