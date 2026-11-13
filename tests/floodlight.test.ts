// The floodlights of the top U-Boats and submarines (owner, 15 ottobre 2026).
import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/worldLayout';
import { createGame } from '../src/systems/game';
import { floodBeams, subFloodBeams } from '../src/systems/ship/floodlight';
import { shipModel } from '../src/systems/ship/model';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('floodlights', () => {
  it('a diving Nightmare lights the sea round its hull, less in murky water; afloat, none', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.model = 'nightmare';
    g.ship.dive = 0;
    expect(floodBeams(g.ship, 0)).toEqual([]);
    g.ship.dive = 300 * WORLD.unitsPerMetre;
    const clear = floodBeams(g.ship, 0);
    // beams with a way, not round spots (lot N1b): ahead from the bow, and down
    expect(clear).toHaveLength(2);
    expect(clear[0]!.len).toBeCloseTo(shipModel(g.ship).floodlightM! * WORLD.unitsPerMetre, 0);
    expect(clear[1]!.angle).toBeCloseTo(Math.PI / 2);
    expect(floodBeams(g.ship, 1)[0]!.len).toBeLessThan(clear[0]!.len);
  });

  it('a ship with none (the first one) lights nothing round it', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.dive = 100;
    expect(floodBeams(g.ship, 0)).toEqual([]);
  });

  it('the imperial submarine under water has them, the bathyscaphe not', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    Object.assign(g.sub, { aboard: true, y: WORLD.surfaceY + 200, model: 'imperium_sub' });
    expect(subFloodBeams(g.sub, 0)).toHaveLength(1);
    g.sub.model = 'batiscafo';
    expect(subFloodBeams(g.sub, 0)).toEqual([]);
  });
});
