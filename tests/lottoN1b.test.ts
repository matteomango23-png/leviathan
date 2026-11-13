// Lot N1b (owner, 13 novembre 2026): "la notte deve essere veramente dark". The night's darkness row by row by depth
// (a little light at the surface, black a few metres down), the floodlights as beams, no round spots under the hull.
import { beforeAll, describe, expect, it } from 'vitest';
import { NIGHT } from '../src/data/daynight';
import { SHIP } from '../src/data/ship';
import { WORLD } from '../src/data/worldLayout';
import { nightDarkAt } from '../src/systems/dayNight';
import { createGame } from '../src/systems/game';
import { floodBeams } from '../src/systems/ship/floodlight';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('il buio della notte', () => {
  it('in superficie si vede un poco, a pochi metri sotto è nero', () => {
    expect(nightDarkAt(0)).toBeCloseTo(NIGHT.surfaceDark);
    expect(nightDarkAt(NIGHT.blackByM)).toBeCloseTo(NIGHT.deepDark);
    expect(nightDarkAt(NIGHT.blackByM / 2)).toBeGreaterThan(nightDarkAt(0));
    expect(nightDarkAt(200)).toBeCloseTo(NIGHT.deepDark);
  });

  it('il cielo è più chiaro all’orizzonte che in alto, e del mare (la nave si staglia)', () => {
    expect(nightDarkAt(-1)).toBeLessThan(nightDarkAt(-NIGHT.skyFadeM));
    expect(nightDarkAt(-1)).toBeLessThan(nightDarkAt(0));
  });
});

describe('le luci della nave', () => {
  it('i fari della nave abissale sono fasci con una direzione, che segue la prua', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.model = 'nightmare';
    g.ship.dive = 100 * WORLD.unitsPerMetre;
    g.ship.face = 1;
    const right = floodBeams(g.ship, 0)[0]!;
    expect(Math.cos(right.angle)).toBeGreaterThan(0.8);
    expect(right.x).toBeGreaterThan(g.ship.x);
    g.ship.face = -1;
    const left = floodBeams(g.ship, 0)[0]!;
    expect(Math.cos(left.angle)).toBeLessThan(-0.8);
    expect(left.x).toBeLessThan(g.ship.x);
  });

  it('sotto lo scafo non ci sono più macchie tonde', () => {
    expect('lights' in SHIP).toBe(false);
  });
});
