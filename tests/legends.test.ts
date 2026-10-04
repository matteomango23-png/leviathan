// The legends (tappa 13): one of each in the world, hunted in its den (4 ottobre 2026, hunts.test.ts);
// tamed it is yours, defeated it is gone forever (saved); the orca's alfa is the Matriarch.
import { beforeAll, describe, expect, it } from 'vitest';
import { UNIQUE_VARIANTS } from '../src/data/species';
import { finishBattle } from '../src/systems/battleResult';
import { artKeysOf, formLengthM, formName } from '../src/systems/beasts/forms';
import { isLegend, LEGENDS } from '../src/systems/beasts/legends';
import { temperOf } from '../src/systems/beasts/roam';
import { spawnWild } from '../src/systems/beasts/wildState';
import { createGame, toSave } from '../src/systems/game';
import { migrate, parseSave } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('legends', () => {
  it('are the uniques that are hunted; the Guardians of the story are not among them', () => {
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
    expect((migrate({ game: 'leviatano', version: 9 }) as { legendsGone: unknown }).legendsGone).toEqual([]);
  });

  it('the orca’s alfa is the Matriarch, with her own pictures', () => {
    const form = { speciesId: 'orca', variant: 'alfa' as const };
    expect(formName(form)).toBe('Orca matriarca');
    expect(artKeysOf(form)).toContain('orca_matriarca');
    expect(isLegend('orca_matriarca_finale')).toBe(true);
  });
});
