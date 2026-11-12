// Lot M4 (owner, 12 novembre 2026): the living sea floor. Black smokers on the trenches' floor with their hot plume,
// the open sea's schools by region (herring, lanternfish), the lanterns of the piers in the water.
import { describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { FISH } from '../src/data/world';
import type { GameEvent } from '../src/systems/events';
import { biomeOf } from '../src/systems/world/stretches';
import { ventsOf } from '../src/systems/world/endless';
import { inPlume, smokerMouths, smokersOf, stepSmokers } from '../src/systems/world/smokers';
import { pierLightSpots } from '../src/views/pierUnder';

const trench = (): number => {
  for (let k = 0; k < 400; k++) if (biomeOf(k).id === ENDLESS.smokers.biome && smokersOf(k).length) return k;
  throw new Error('no trench stretch');
};

describe('i fumatori neri', () => {
  it('stanno solo nei tratti di fossa, sul fondo, lontani dagli sfiatatoi', () => {
    for (let k = 0; k < 200; k++) {
      const s = smokersOf(k);
      if (biomeOf(k).id !== ENDLESS.smokers.biome) expect(s).toEqual([]);
      for (const sm of s)
        for (const v of ventsOf(k))
          expect(Math.abs(v.x - sm.x)).toBeGreaterThanOrEqual(ENDLESS.smokers.clearOfVent);
    }
    expect(smokersOf(trench()).length).toBeGreaterThan(0);
  });

  it('il pennacchio scotta a nuoto, non nel sottomarino', () => {
    const s = smokersOf(trench())[0]!;
    const m = smokerMouths(s, s.y)[0]!;
    expect(inPlume(m.x, m.y - 40)).toBe(true);
    expect(inPlume(m.x + 200, m.y - 40)).toBe(false);
    const diver = { x: m.x, y: m.y - 40, hp: 5, invulnerable: 0, dead: false, deadTime: 0 };
    const ev: GameEvent[] = [];
    stepSmokers(diver, true, 0.1, {}, ev);
    expect(diver.hp).toBe(5);
    stepSmokers(diver, false, 0.1, {}, ev);
    expect(diver.hp).toBe(4);
    expect(ev.some((e) => e.type === 'smokerBurn')).toBe(true);
  });
});

describe('i banchi per regione', () => {
  it('ogni regione ha pesci che esistono, aringhe e pesci lanterna si vendono', () => {
    for (const kinds of Object.values(ENDLESS.schoolKinds))
      for (const k of kinds)
        expect(
          FISH.some((f) => f.id === k),
          k,
        ).toBe(true);
    expect(FISH.find((f) => f.id === 'aringa')!.sellPrice).toBeGreaterThan(0);
    expect(FISH.find((f) => f.id === 'pesce_lanterna')!.sellPrice).toBeGreaterThan(0);
  });
});

describe('le luci dei moli', () => {
  it('ci sono luci sotto ogni molo vicino', () => {
    expect(pierLightSpots({ x: -1e9, right: 1e9 }).length).toBeGreaterThan(3);
    expect(pierLightSpots({ x: -1e9, right: -1e9 + 10 })).toEqual([]);
  });
});
