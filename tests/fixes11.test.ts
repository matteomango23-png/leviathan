// The fixes of 11 ottobre 2026: the pool aboard heals slowly and only its places, the light under the ship calls a
// few beasts, the broken ice stays open while a vehicle is out.
import { beforeAll, describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { SHIP } from '../src/data/ship';
import { TILE, WORLD } from '../src/data/worldLayout';
import { maxHpOf } from '../src/systems/beasts/team';
import { spawnWild } from '../src/systems/beasts/wildState';
import { createGame, enterPort, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { inPool, stepPool } from '../src/systems/ship/shipPool';
import { stepLight, toggleLight } from '../src/systems/ship/underLight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const km = WORLD.unitsPerMetre * 1000;

function atSea(model = 'imperium', on: TileMap = map): GameState {
  const g = createGame(on, null, 4);
  giveVessels(g);
  for (let i = 0; i < 5; i++) giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 20);
  Object.assign(g.ship, { model, aboard: true, x: ENDLESS.startX + 3 * km, speed: 0, fuel: 1000 });
  for (const w of g.beasts.wilds) w.motion = 'gone';
  return g;
}

describe('the pool aboard', () => {
  it('heals slowly only as many beasts as its places, the most hurt first', () => {
    const g = atSea('imperium'); // 3 places
    const team = g.beasts.team.filter((b) => b.inTeam);
    expect(team.length).toBeGreaterThan(3);
    team.forEach((b, i) => (b.hp = Math.round(maxHpOf(b) * (0.1 + i * 0.15))));
    const most = team.slice(0, 3);
    expect(inPool(g)).toEqual(most);
    const before = team.map((b) => b.hp);
    stepPool(g, 1);
    team.forEach((b, i) => {
      if (i < 3) expect(b.hp).toBeGreaterThan(before[i]!);
      else expect(b.hp).toBe(before[i]);
    });
    expect(most[0]!.hp).toBeLessThan(maxHpOf(most[0]!)); // slowly, not at once
  });

  it('a KO beast stands again at a quarter; healed, its PP are back', () => {
    const g = atSea();
    const b = g.beasts.team.find((t) => t.inTeam)!;
    Object.assign(b, { hp: 0, ko: true, ppUsed: [3, 1] });
    for (let t = 0; t < SHIP.poolHealSeconds * SHIP.poolStandShare + 2; t++) stepPool(g, 1);
    expect(b.ko).toBe(false);
    expect(b.ppUsed).toBeDefined();
    for (let t = 0; t < SHIP.poolHealSeconds; t++) stepPool(g, 1);
    expect(b.hp).toBe(maxHpOf(b));
    expect(b.ppUsed).toBeUndefined();
  });

  it('a ship without a pool heals nobody; the port heals everyone at once', () => {
    const g = atSea('aurelia');
    const b = g.beasts.team.find((t) => t.inTeam)!;
    b.hp = 1;
    for (let t = 0; t < 10; t++) stepPool(g, 1);
    expect(b.hp).toBe(1);
    enterPort(g, []);
    expect(b.hp).toBe(maxHpOf(b));
  });
});

describe('the light under the ship', () => {
  it('calls at most a few beasts at once, and only by a chance', () => {
    const g = atSea();
    const ws = g.beasts.wilds.filter((w) => !w.spawn.endless).slice(0, 8);
    ws.forEach((w, i) => {
      spawnWild(
        w,
        { speciesId: 'tartaruga_marina', variant: 'comune' },
        8,
        g.ship.x + 100 + i * 30,
        WORLD.surfaceY + 150,
        1,
      );
      w.respawn = 1e9;
    });
    g.rng = () => 0.999; // no chance taken: nobody comes
    toggleLight(g, []);
    stepLight(g, 1 / 30, []);
    expect(ws.filter((w) => w.drawn).length).toBe(0);
    g.rng = () => 0; // every chance taken: still no more than maxDrawn
    for (let t = 0; t < SHIP.underLight.pulseSeconds + 1; t++) stepLight(g, 1, []);
    expect(ws.filter((w) => w.drawn).length).toBe(SHIP.underLight.maxDrawn);
  });
});

describe('the broken ice', () => {
  it('does not freeze again while the speedboat is out of the hold', () => {
    const local = generateWorld(); // its own map: this test freezes a tile
    const g = atSea('imperium', local);
    const i = local.tileIndex(5, 3);
    local.set(5, 3, TILE.water);
    g.ship.broken.push({ i, t: 0 });
    Object.assign(g.boat, { owned: true, bay: 'out' });
    stepGame(g, emptyInput(), 1 / 30);
    expect(g.ship.broken.some((b) => b.i === i)).toBe(true);
    Object.assign(g.boat, { bay: 'docked' });
    stepGame(g, emptyInput(), 1 / 30);
    expect(g.ship.broken.some((b) => b.i === i)).toBe(false);
  });
});
