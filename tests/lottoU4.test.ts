// Lot U4 (owner, 12 novembre 2026): the battle at the very touch, the harpoon felt by every beast and never jumping
// over a body, the pool passing to the next beast, the chance to tame shown.
import { beforeAll, describe, expect, it } from 'vitest';
import { BEAST_BODY } from '../src/data/beasts';
import { createBattle } from '../src/systems/battle/battle';
import { makeFighter } from '../src/systems/battle/fighter';
import { tameChance } from '../src/systems/battle/tameFlee';
import { distanceToBody } from '../src/systems/beasts/combat';
import { createGame } from '../src/systems/game';
import { hitAlong } from '../src/systems/shotPath';
import { inPool, stepPool, togglePool } from '../src/systems/ship/shipPool';
import { weaponHitsBeast } from '../src/systems/swimFight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('l’arpione', () => {
  it('una bestia calma colpita viene ferita e reagisce', () => {
    const g = createGame(map, null, 4);
    const w = g.beasts.wilds.find((x) => !x.spawn.hunt)!;
    Object.assign(w, { motion: 'roam', x: 1500, y: 200, calm: 6, mood: 'wander', wounds: 0 });
    expect(weaponHitsBeast(g, 1500, 200, [])).toBe(true);
    expect(w.wounds).toBeGreaterThan(0);
    expect(w.calm).toBe(0);
    expect(w.mood === 'flee' || !!w.stalk).toBe(true);
  });

  it('un tiro veloce con un fotogramma lungo non salta un corpo sottile', () => {
    const body = { x: 50, y: 0, face: 1 as const, pitch: Math.PI / 2, length: 20 }; // upright: 2 units thick
    const hit = (x: number, y: number): boolean => distanceToBody(body, x, y) <= BEAST_BODY.weaponHitMargin;
    expect(hitAlong(0, 0, 100, 0, hit)).toBe(true); // 100 units in one frame, across it
    expect(hit(0, 0) || hit(100, 0) || hit(50, 0)).toBe(true); // (the old two points: the middle happened to land)
    expect(hitAlong(0, 0, 37, 0, hit)).toBe(false);
  });

  it('le murene hanno il corpo un po’ più largo per l’onda che fanno', () => {
    const eel = { x: 0, y: 0, face: 1 as const, pitch: 0, length: 30, form: { speciesId: 'murena' } };
    const fish = { ...eel, form: { speciesId: 'barracuda' } };
    expect(distanceToBody(eel, 0, 5)).toBeLessThan(distanceToBody(fish, 0, 5));
  });
});

describe('la vasca', () => {
  it('una bestia scelta e guarita lascia il posto alla più ferita', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    for (let i = 0; i < 4; i++) giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 10);
    Object.assign(g.ship, { aboard: true, model: 'eh1' }); // a pool of two
    const [a, b, c] = g.beasts.team.filter((x) => x.inTeam);
    a!.hp = 1;
    b!.hp = 2;
    c!.hp = c!.hp - 1; // barely hurt: the pool would leave it out
    togglePool(g, c!.uid); // your pick
    expect(inPool(g).some((x) => x.uid === c!.uid)).toBe(true);
    expect(inPool(g).some((x) => x.uid === b!.uid)).toBe(false);
    stepPool(g, 1); // one second heals it
    expect(g.ship.poolPicks ?? []).not.toContain(c!.uid);
    expect(inPool(g).some((x) => x.uid === b!.uid)).toBe(true);
  });
});

describe('la probabilità di domare', () => {
  it('nove livelli sopra danno meno di un quarto della probabilità a pari livello', () => {
    const even = createBattle(
      [makeFighter({ speciesId: 'zanna', variant: 'comune' }, 16)],
      makeFighter({ speciesId: 'squalo_toro', variant: 'comune' }, 16),
    );
    const above = createBattle(
      [makeFighter({ speciesId: 'zanna', variant: 'comune' }, 16)],
      makeFighter({ speciesId: 'squalo_toro', variant: 'comune' }, 25),
    );
    expect(tameChance(above, 16)).toBeLessThan(tameChance(even, 16) / 4);
  });
});
