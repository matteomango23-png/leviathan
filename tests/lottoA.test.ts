// Lotto A (owner, 15 ottobre 2026): experience only from the fish your beast eats, a blackout that no longer heals the
// team, the same beast staying the same (residents, tracker), the rare kinds rare in the open sea.
import { beforeAll, describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { speciesById } from '../src/data/species';
import { residentForm, residentsOf } from '../src/systems/beasts/residents';
import { maxHpOf } from '../src/systems/beasts/team';
import { spawnWild } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { blackout, createGame } from '../src/systems/game';
import { giveTestBeast } from '../src/systems/testTools';
import { isTarget, wildTarget } from '../src/systems/tracking';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('a blackout', () => {
  it('stands the KO beasts up with 1 HP and heals nobody else (the pool or a port does)', () => {
    const g = createGame(map, null, 4);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 10);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 10);
    const [a, b] = g.beasts.team;
    Object.assign(a!, { hp: 0, ko: true });
    b!.hp = 3;
    const ev: GameEvent[] = [];
    blackout(g, ev);
    expect(a!.ko).toBe(false);
    expect(a!.hp).toBe(1);
    expect(b!.hp).toBe(3);
    expect(b!.hp).toBeLessThan(maxHpOf(b!));
  });
});

describe('the same beast stays the same', () => {
  it('a resident of the open sea always has its own version and level', () => {
    const all = Array.from({ length: 60 }, (_, k) => residentsOf(k)).flat();
    expect(all.length).toBeGreaterThan(100);
    for (const r of all.slice(0, 50)) expect(residentForm(r)).toEqual(residentForm(r));
    // somewhere there is a rare one, and it stays rare every time it comes out
    const rare = all.find((r) => residentForm(r).form.variant !== 'comune');
    expect(rare).toBeDefined();
    expect(residentForm(rare!).form.variant).not.toBe('comune');
  });

  it('the tracker follows that one beast: a new one out of the same slot is not it', () => {
    const g = createGame(map, null, 4);
    const w = g.beasts.wilds.find((b) => !b.spawn.endless)!;
    spawnWild(w, { speciesId: w.spawn.speciesId, variant: 'alfa' }, 10, 3000, 200, 1);
    const t = wildTarget(w);
    expect('wild' in t && isTarget(w, t)).toBe(true);
    spawnWild(w, { speciesId: w.spawn.speciesId, variant: 'comune' }, 10, 3000, 200, 1);
    expect('wild' in t && isTarget(w, t)).toBe(false);
  });
});

describe('the rare kinds are rare in the open sea', () => {
  it('four- and five-star kinds weigh much less than their sea says', () => {
    const all = Array.from({ length: 300 }, (_, k) => residentsOf(k)).flat();
    const share = (stars: number): number =>
      all.filter((r) => (speciesById(r.speciesId)?.rarity ?? 1) >= stars).length / all.length;
    expect(share(4)).toBeLessThan(0.08);
    expect(ENDLESS.residents.rarityWeight[4]).toBeLessThan(0.5);
  });
});

describe('pictures of the hunted beasts', () => {
  it('the megalodon, the Livyatan and every legend of a hunt are loaded at start (they fought you unseen)', async () => {
    const { neededSpriteKeys } = await import('../src/views/neededSprites');
    const { HUNTS } = await import('../src/data/hunts');
    const keys = neededSpriteKeys();
    for (const h of HUNTS) expect(keys).toContain(h.form.unique ?? h.form.speciesId);
  });
});
