import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { battlePlace, battleSizes, isGiant } from '../src/systems/battle/stage';

const S = BATTLE_STAGE.size;
const beast = (lengthM: number, giant = false) => ({ lengthM, giant });

describe('battle stage', () => {
  it('draws two beasts of the same size at the standard size, whatever their length', () => {
    const turtles = battleSizes(beast(2), beast(2));
    expect(turtles.you).toBeCloseTo(S.standard);
    expect(turtles.foe).toBeCloseTo(S.standard * S.foeDistance);
  });

  it('draws a shark clearly bigger than a torpedo ray, but the ray still readable', () => {
    const s = battleSizes(beast(6), beast(1.5));
    expect(s.you).toBeCloseTo(S.standard);
    expect(s.foe / S.foeDistance).toBeLessThan(s.you / 2);
    expect(s.foe / S.foeDistance).toBeGreaterThanOrEqual(S.min);
  });

  it('always draws giants huge, and the other beast small next to them', () => {
    const s = battleSizes(beast(6), beast(9, true));
    expect(s.foe / S.foeDistance).toBeGreaterThanOrEqual(S.giant);
    expect(s.you).toBeLessThan(S.standard);
  });

  it('knows the giants', () => {
    expect(isGiant({ speciesId: 'squalo_bianco', variant: 'albino', final: true })).toBe(true);
    expect(isGiant({ speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' })).toBe(true);
    expect(isGiant({ speciesId: 'megattera', variant: 'comune' })).toBe(true);
    expect(isGiant({ speciesId: 'tartaruga_marina', variant: 'albino' })).toBe(false);
  });

  it('picks the background from the lair or the region', () => {
    expect(battlePlace('baia', true)).toBe('tana');
    expect(battlePlace('delta', false)).toBe('delta');
    expect(battlePlace('fossa', false)).toBe('baia');
  });
});
