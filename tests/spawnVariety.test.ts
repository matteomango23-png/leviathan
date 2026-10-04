import { beforeAll, describe, expect, it } from 'vitest';
import { WILD_RULES } from '../src/data/beasts';
import { bay } from '../src/data/worldLayout';
import { drawSpawn, rarityWeight, rememberSpawn } from '../src/systems/beasts/spawnDraw';
import { isInWater, removeWild } from '../src/systems/beasts/wildState';
import { stepWildSpawns } from '../src/systems/encounters';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import { makeRng } from '../src/systems/math';
import { coastMap, regionsMap } from '../src/systems/seaMap';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('comparse più varie (4 ottobre: "vedi sempre gli stessi animali")', () => {
  it('nella Baia in 20 minuti compaiono tante specie, i delfini compresi, e nessuna domina', () => {
    const g = createGame(map, null, 7);
    Object.assign(g.diver, { x: bay(900), y: 150 });
    const counts = new Map<string, number>();
    const rng = makeRng(11);
    const dt = 0.25;
    for (let t = 0; t < 1200; t += dt) {
      const ev: GameEvent[] = [];
      stepWildSpawns(g, dt, ev);
      for (const e of ev)
        if (e.type === 'wildAppeared') {
          const id = g.beasts.wilds.find((w) => w.id === e.id)!.spawn.speciesId;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      // every few seconds the one that has been around longest swims away, and comes back in its own time
      if (Math.floor(t / 6) !== Math.floor((t + dt) / 6)) {
        const out = g.beasts.wilds.filter((w) => isInWater(w));
        const w = out[Math.floor(rng() * out.length)];
        if (w)
          removeWild(
            w,
            w.spawn.respawnSeconds[0] + rng() * (w.spawn.respawnSeconds[1] - w.spawn.respawnSeconds[0]),
          );
      }
      g.diver.hp = g.diver.maxHp;
      g.beasts.battle = null;
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(counts.size).toBeGreaterThanOrEqual(8);
    expect(counts.get('delfino') ?? 0).toBeGreaterThan(0);
    // before (always the first of the list) the barracuda alone was a quarter of all
    for (const [id, n] of counts) expect(n / total, id).toBeLessThan(0.2);
  });

  it('a parità, le comuni vengono più spesso delle rare; le appena viste meno', () => {
    const rng = makeRng(3);
    const ready = [{ spawn: { speciesId: 'barracuda' } }, { spawn: { speciesId: 'squalo_bianco' } }];
    let common = 0;
    for (let i = 0; i < 2000; i++)
      if (drawSpawn(ready, [], [], [], rng).spawn.speciesId === 'barracuda') common++;
    expect(rarityWeight('barracuda')).toBeGreaterThan(rarityWeight('squalo_bianco'));
    expect(common / 2000).toBeGreaterThan(0.7);
    let again = 0;
    for (let i = 0; i < 2000; i++)
      if (drawSpawn(ready, [], ['barracuda'], [], rng).spawn.speciesId === 'barracuda') again++;
    expect(again).toBeLessThan(common);
    const recent: string[] = [];
    for (let i = 0; i < 10; i++) rememberSpawn(recent, `s${i}`);
    expect(recent).toHaveLength(WILD_RULES.recentMemory);
  });

  it('nella mappa i delfini compaiono in molte zone, e le percentuali sommano a 100', () => {
    const zones = [...coastMap(new Set()), ...regionsMap(new Set())].filter((z) => z.beasts.length);
    const withDolphins = zones.filter((z) => z.beasts.some((b) => b.id === 'delfino'));
    expect(withDolphins.length).toBeGreaterThanOrEqual(4);
    for (const z of zones) expect(z.beasts.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1, 5);
  });
});
