import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { battlePlace, battleSize, isGiant, lengthSpectrum } from '../src/systems/battle/stage';

const S = BATTLE_STAGE.size;
const WIDE = 3; // a screen so wide that nothing is shrunk to fit
const square = [20, 20, 780, 780] as const;
const beast = (lengthM: number) => ({ lengthM, giant: false, box: square });

describe('battle stage', () => {
  it('maps every length between the smallest and the biggest size, on a log scale', () => {
    expect(lengthSpectrum(0.2)).toBe(0);
    expect(lengthSpectrum(S.minM)).toBe(0);
    expect(lengthSpectrum(S.maxM)).toBe(1);
    expect(lengthSpectrum(120)).toBe(1);
    const own = (m: number) => battleSize('foe', beast(m), WIDE) / S.foeDistance;
    expect(own(0.5)).toBeCloseTo(S.min);
    expect(own(40)).toBeCloseTo(S.max);
  });

  it('draws a 25 m and a 30 m beast alike, a 6 m shark clearly bigger than a 1.5 m ray', () => {
    const own = (m: number) => battleSize('foe', beast(m), WIDE);
    expect(own(30) / own(25)).toBeLessThan(1.05);
    expect(own(6) / own(1.5)).toBeGreaterThan(1.3);
    expect(own(5) / own(2)).toBeLessThan(1.25);
  });

  it('draws yours closer to the camera than the wild one', () => {
    expect(battleSize('you', beast(2), WIDE)).toBeGreaterThan(battleSize('foe', beast(2), WIDE));
  });

  it('shrinks a beast that would leave the screen', () => {
    const tall = { lengthM: 30, giant: true, box: [300, 20, 500, 780] as const };
    const size = battleSize('you', tall, 2.16);
    expect(size).toBeLessThan(S.max * S.youCloser);
    expect(size * (760 / 760)).toBeLessThanOrEqual(1 - BATTLE_STAGE.hover - BATTLE_STAGE.fit.margin + 1e-9);
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
