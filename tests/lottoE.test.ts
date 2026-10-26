// Lotto E (owner, 15 ottobre 2026): money easier to make. A bag with no limit and a market that pays less for heaps
// of one kind (recovering with time), missions that pay and come back, bounties, tamed beasts sold at the pen.
import { beforeAll, describe, expect, it } from 'vitest';
import { MARKET_RULES, MISSIONS } from '../src/data/economy';
import { FISH } from '../src/data/world';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { beastPrice, cannotSell, sellBeast } from '../src/systems/economy/beastSale';
import { newMarket, quote, recover, sellAll } from '../src/systems/economy/market';
import { createGame } from '../src/systems/game';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('the fish market', () => {
  it('pays the full price for a few, much less for a heap, and recovers with time', () => {
    const base = FISH.find((f) => f.id === 'sgombro')!.sellPrice;
    const m = newMarket();
    expect(quote(m, 'sgombro', 1)).toBeCloseTo(base, 5);
    const r = sellAll(m, { sgombro: MARKET_RULES.saturation * 2 }, 1_000_000);
    expect(r.teeth).toBeLessThan(MARKET_RULES.saturation * 2 * base * 0.7);
    const tired = quote(m, 'sgombro', 1);
    expect(tired).toBeCloseTo(base * MARKET_RULES.floor, 5);
    recover(m, 1_000_000 + 60 * 60 * 1000); // an hour later
    expect(quote(m, 'sgombro', 1)).toBeGreaterThan(tired);
  });
});

describe('selling a tamed beast', () => {
  it('a rarer, higher, rarer-version beast is worth more; a legend or one in the team is not sold', () => {
    const lo = makeTeamBeast('a', { speciesId: 'barracuda', variant: 'comune' }, 5, false);
    const hi = makeTeamBeast('b', { speciesId: 'squalo_bianco', variant: 'comune' }, 20, false);
    const alfa = makeTeamBeast('c', { speciesId: 'squalo_bianco', variant: 'alfa' }, 20, false);
    expect(beastPrice(hi)).toBeGreaterThan(beastPrice(lo));
    expect(beastPrice(alfa)).toBeGreaterThan(beastPrice(hi));
    const g = createGame(map, null, 4);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    const b = g.beasts.team[0]!;
    expect(cannotSell(g.beasts.team, b)).not.toBeNull(); // in the team (and the only one)
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 20);
    const shark = g.beasts.team[1]!;
    shark.inTeam = false;
    const teeth = g.gear.teeth;
    expect(sellBeast(g, shark.uid)).toBe(beastPrice(shark));
    expect(g.gear.teeth).toBe(teeth + beastPrice(shark));
    expect(g.beasts.team).toHaveLength(1);
  });
});

describe('missions', () => {
  it('the bounties on beasts are their own path now (data/bounties.ts): none left among the missions', () => {
    expect(MISSIONS.some((m) => m.id.startsWith('taglia_'))).toBe(false);
  });
});
