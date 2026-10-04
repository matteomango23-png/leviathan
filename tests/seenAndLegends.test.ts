import { beforeAll, describe, expect, it } from 'vitest';
import { UNIQUE_VARIANTS } from '../src/data/species';
import { WILD_RULES } from '../src/data/beasts';
import { rollWildLevel } from '../src/systems/beasts/forms';
import { spawnWild } from '../src/systems/beasts/wildState';
import { stepWildSpawns } from '../src/systems/encounters';
import { createGame } from '../src/systems/game';
import { makeRng } from '../src/systems/math';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { bay } from '../src/data/worldLayout';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('leggende sempre fortissime (4 ottobre)', () => {
  it('una leggenda incontrata per caso ha un livello dal 50 al 100', () => {
    const rng = makeRng(1);
    for (const u of UNIQUE_VARIANTS.filter((x) => x.chance)) {
      expect(u.wildLevel, u.id).toBeDefined();
      for (let i = 0; i < 50; i++) {
        const lv = rollWildLevel({ speciesId: u.speciesId, variant: 'comune', unique: u.id }, rng);
        expect(lv, u.id).toBeGreaterThanOrEqual(50);
        expect(lv, u.id).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('bestiario: vista solo se l’hai vista davvero (4 ottobre)', () => {
  it('una bestia lontana nel buio non entra tra le viste; vicina sì', () => {
    const g = createGame(map, null, 2);
    Object.assign(g.diver, { x: bay(900), y: 150 });
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'squalo_tigre')!;
    spawnWild(
      w,
      { speciesId: 'squalo_tigre', variant: 'comune' },
      12,
      g.diver.x + WILD_RULES.seenRadius * 3,
      150,
      -1,
    );
    w.calm = 99;
    stepWildSpawns(g, 1 / 30, []);
    expect(g.seen.has('squalo_tigre')).toBe(false);
    Object.assign(w, { x: g.diver.x + 20, y: 150 });
    stepWildSpawns(g, 1 / 30, []);
    expect(g.seen.has('squalo_tigre')).toBe(true);
  });
});
