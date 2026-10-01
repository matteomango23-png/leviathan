import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { battlePlace, battleSize } from '../src/systems/battle/stage';

describe('battle stage', () => {
  it('draws a 9 m legendary shark about three times a 2 m turtle', () => {
    const ratio = battleSize(9, 'you') / battleSize(2, 'you');
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.4);
  });

  it('keeps tiny and colossal beasts on screen', () => {
    expect(battleSize(0.6, 'you')).toBe(BATTLE_STAGE.size.min);
    expect(battleSize(120, 'you')).toBe(BATTLE_STAGE.size.max);
  });

  it('draws the wild beast smaller, farther away', () => {
    expect(battleSize(6, 'foe')).toBeLessThan(battleSize(6, 'you'));
  });

  it('picks the background from the lair or the region', () => {
    expect(battlePlace('baia', true)).toBe('tana');
    expect(battlePlace('delta', false)).toBe('delta');
    expect(battlePlace('fossa', false)).toBe('baia');
  });
});
