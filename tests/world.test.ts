import { beforeAll, describe, expect, it } from 'vitest';
import { BONE_WALL, COAST, START, TILE, WORLD } from '../src/data/worldLayout';
import { PORT } from '../src/data/economy';
import { DIVER } from '../src/data/diver';
import { generateWorld, isOpen, landHeight } from '../src/systems/world/worldGen';
import type { TileMap } from '../src/systems/world/tileMap';
import { depthMetres, zoneAt } from '../src/systems/world/zones';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('world generation', () => {
  it('has the prototype size', () => {
    expect(map.cols).toBe(WORLD.cols);
    expect(map.rows).toBe(WORLD.rows);
    expect(map.width).toBe(WORLD.cols * WORLD.tileSize);
  });

  it('is the same every time', () => {
    const again = generateWorld();
    expect(again.data.every((v, i) => v === map.data[i])).toBe(true);
  });

  it('has a mix of water and rock', () => {
    let water = 0;
    for (const v of map.data) if (v === TILE.water) water++;
    const share = water / map.data.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.8);
  });

  it('starts the diver in open water near the surface', () => {
    expect(map.hitCircle(START.x, START.y, DIVER.radius)).toBe(false);
    expect(START.y).toBeGreaterThan(WORLD.surfaceY);
  });

  it('is surrounded by rock', () => {
    expect(isOpen(5, 300)).toBe(false);
    expect(map.solidAt(map.width + 10, 300)).toBe(true);
    expect(map.solidAt(300, map.height + 10)).toBe(true);
  });

  it('places the bone wall', () => {
    let bone = 0;
    for (let ty = BONE_WALL.ty0; ty <= BONE_WALL.ty1; ty++)
      for (let tx = BONE_WALL.tx0; tx <= BONE_WALL.tx1; tx++) if (map.get(tx, ty) === TILE.bone) bone++;
    expect(bone).toBeGreaterThan(0);
  });

  it('has ice under the surface in the east', () => {
    expect(map.tileAtPoint(4800, 36)).toBe(TILE.ice);
  });
});

describe('collisions', () => {
  it('blocks a body swimming into rock', () => {
    // swim straight down from the start until the sea floor stops us
    const body = { x: START.x, y: START.y, vx: 0, vy: 200 };
    let hit = false;
    for (let i = 0; i < 400 && !hit; i++) hit = map.moveBody(body, DIVER.radius, 1 / 60);
    expect(hit).toBe(true);
    expect(map.hitCircle(body.x, body.y, DIVER.radius)).toBe(false);
  });

  it('keeps bodies under the surface', () => {
    const body = { x: START.x, y: START.y, vx: 0, vy: -500 };
    for (let i = 0; i < 30; i++) map.moveBody(body, DIVER.radius, 1 / 60);
    expect(body.y).toBeGreaterThanOrEqual(WORLD.surfaceY + DIVER.radius);
  });

  it('finds the floor below the start', () => {
    const floor = map.floorBelow(START.x, START.y);
    expect(floor).toBeGreaterThan(START.y);
    expect(floor).toBeLessThan(map.height);
  });
});

describe('zones', () => {
  it('names the start zone and measures depth in metres', () => {
    expect(zoneAt(START.x, START.y)).toBe('Baia di Portofosco');
    expect(zoneAt(500, 1300)).toBe('Abisso');
    expect(depthMetres(WORLD.surfaceY)).toBe(0);
    expect(depthMetres(WORLD.surfaceY + WORLD.unitsPerMetre * 10)).toBe(10);
  });
});

describe('the west coast', () => {
  it('has land above the water, a shore sloping into the bay and open water at the pier', () => {
    expect(map.solidAt(COAST.shoreX - 40, WORLD.surfaceY - 6)).toBe(true); // land
    expect(map.solidAt(COAST.shoreX + 40, WORLD.surfaceY - 6)).toBe(false); // sky over the sea
    expect(map.solidAt(COAST.shoreX + 20, 300)).toBe(true); // the shore under water
    expect(map.hitCircle(PORT.x, START.y, DIVER.radius)).toBe(false);
    expect(landHeight(COAST.shoreX + 10)).toBe(0);
  });
});
