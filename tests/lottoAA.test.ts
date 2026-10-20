// Lot AA (20 ottobre 2026): a gull caught in the air opens the beast's jaws and goes into the bag, sold dearer than
// any fish; the wild giant in battle swims away slower.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { RIDE_BREACH } from '../src/data/beasts';
import { FISH } from '../src/data/world';
import { mountAteBird } from '../src/systems/beastPlay';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { newMarket, unitPrice } from '../src/systems/economy/market';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

describe('a gull caught in the air (owner: "devono aprire la bocca… vendere al porto")', () => {
  it('opens its jaws and goes into the bag, counted among the catches', () => {
    const g = createGame(map, null, 4);
    const b = makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, 20, true);
    g.beasts.team.push(b);
    g.beasts.mount = { ...(g.beasts.mount ?? {}), uid: 'b1', jaw: 0 } as typeof g.beasts.mount;
    g.beasts.riding = true;
    const ev: GameEvent[] = [];
    mountAteBird(g, 0, 0, ev);
    expect(g.beasts.mount!.jaw).toBeCloseTo(RIDE_BREACH.birdJawSeconds);
    expect(g.gear.bag.gabbiano).toBe(1);
    expect(g.fishCaught.gabbiano).toBe(1);
  });

  it('the market pays more for it than for any fish', () => {
    const m = newMarket();
    const gull = unitPrice(m, 'gabbiano');
    for (const f of FISH) if (!f.bird) expect(gull).toBeGreaterThan(unitPrice(m, f.id));
  });
});

describe('the wild giant in battle swims away slowly (owner: "decisamente più lento")', () => {
  it('a full swing takes at least 15 seconds', () => {
    expect(BATTLE_STAGE.giantDrift.period).toBeGreaterThanOrEqual(15);
  });
});
