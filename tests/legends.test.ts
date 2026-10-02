// The legends (tappa 13): one of each in the world, only in its place, by chance instead of a beast of its species;
// tamed it is yours, defeated it is gone forever (saved); the orca's alfa is the Matriarch.
import { beforeAll, describe, expect, it } from 'vitest';
import { BIOMES, ENDLESS } from '../src/data/endless';
import { UNIQUE_VARIANTS } from '../src/data/species';
import { finishBattle } from '../src/systems/battleResult';
import { artKeysOf, formLengthM, formName, rollWildForm } from '../src/systems/beasts/forms';
import { inLegendPlace, isLegend, LEGENDS, rollLegend } from '../src/systems/beasts/legends';
import { temperOf } from '../src/systems/beasts/roam';
import { spawnWild } from '../src/systems/beasts/wildState';
import { createGame, toSave } from '../src/systems/game';
import { migrate, parseSave } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import { biomeOf } from '../src/systems/world/endless';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const km = 6000;
/** The middle of the first stretch of this kind at least `minKm` from the coast. */
const placeOf = (biome: string, minKm: number): number => {
  for (let k = 0; k < 400; k++) {
    const x = ENDLESS.startX + (k + 0.5) * ENDLESS.stretch;
    if (biomeOf(k).id === biome && x / km >= minKm + 0.2) return x;
  }
  throw new Error(biome);
};
const none = new Set<string>();

describe('legends', () => {
  it('are the uniques that come by chance; the Guardians of the story are not among them', () => {
    const ids = LEGENDS.map((u) => u.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'coccodrillo_marino_leggendario',
        'orca_preistorica_albina',
        'orca_matriarca_finale',
        'squalo_martello_preistorico',
        'tartaruga_preistorica',
      ]),
    );
    expect(ids).not.toContain('sfregiato');
    expect(ids).not.toContain('regina_bianca');
    for (const u of LEGENDS) expect(BIOMES.some((b) => b.id === u.where?.biome) || !u.where).toBe(true);
  });

  it('come only in their place', () => {
    const hammer = UNIQUE_VARIANTS.find((u) => u.id === 'squalo_martello_preistorico')!;
    expect(inLegendPlace(hammer, 3000)).toBe(false); // the bay
    const reef = placeOf('barriera', 3);
    expect(inLegendPlace(hammer, reef)).toBe(true);
    expect(rollLegend('squalo_martello', () => 0, 3000, none)).toBeNull();
    expect(rollLegend('squalo_martello', () => 0, reef, none)).toBe('squalo_martello_preistorico');
    expect(rollLegend('squalo_martello', () => 0.5, reef, none)).toBeNull(); // 1%: not this time
    expect(rollLegend('squalo_martello', () => 0, reef, new Set(['squalo_martello_preistorico']))).toBeNull();
  });

  it('the albino prehistoric orca is the rarest and strongest', () => {
    const orca = UNIQUE_VARIANTS.find((u) => u.id === 'orca_preistorica_albina')!;
    for (const u of LEGENDS) expect(orca.chance!).toBeLessThanOrEqual(u.chance!);
    for (const u of LEGENDS) expect(orca.level).toBeGreaterThanOrEqual(u.level);
  });

  it('the prehistoric turtle is huge, calm, and floats at the surface like an island', () => {
    const form = {
      speciesId: 'tartaruga_marina',
      variant: 'comune' as const,
      unique: 'tartaruga_preistorica',
    };
    expect(formLengthM(form)).toBeGreaterThan(12);
    const g = createGame(map, null, 3);
    const w = g.beasts.wilds[0]!;
    spawnWild(w, form, 32, 9000, 200, 1);
    expect(temperOf(w)).toBe('calm');
    expect(UNIQUE_VARIANTS.find((u) => u.id === 'tartaruga_preistorica')!.surface).toBe(true);
  });

  it('defeated, a legend is gone forever (and stays gone in the save)', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 30);
    const form = {
      speciesId: 'squalo_martello',
      variant: 'comune' as const,
      unique: 'squalo_martello_preistorico',
    };
    const w = g.beasts.wilds[0]!;
    spawnWild(w, form, 30, 9000, 200, 1);
    g.beasts.battle = { wildId: w.id, first: 'normal' };
    const a = g.beasts.team[0]!;
    const ev = finishBattle(g, {
      wildId: w.id,
      over: 'won',
      team: [{ uid: a.uid, hp: 5 }],
      lastActive: a.uid,
      foe: { form, level: 30, hp: 0 },
    });
    expect(g.beasts.gone).toContain('squalo_martello_preistorico');
    expect(ev).toContainEqual({ type: 'legendGone', name: 'Squalo martello preistorico' });
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 3);
    expect(back.beasts.gone).toContain('squalo_martello_preistorico');
    // gone: never again, however lucky
    const reef = placeOf('barriera', 3);
    const f = rollWildForm('squalo_martello', () => 0, { x: reef, unavailable: new Set(back.beasts.gone) });
    expect(f.unique).toBeUndefined();
    expect((migrate({ game: 'leviatano', version: 9 }) as { legendsGone: unknown }).legendsGone).toEqual([]);
  });

  it('the orca’s alfa is the Matriarch, with her own pictures', () => {
    const form = { speciesId: 'orca', variant: 'alfa' as const };
    expect(formName(form)).toBe('Orca matriarca');
    expect(artKeysOf(form)).toContain('orca_matriarca');
    expect(isLegend('orca_matriarca_finale')).toBe(true);
  });
});
