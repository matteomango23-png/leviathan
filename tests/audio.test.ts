// The battle tune and the sea sounds are data (data/audio.ts): check they are well formed.
import { describe, expect, it } from 'vitest';
import { BATTLE_MUSIC, noteHz, SEA_SOUND } from '../src/data/audio';

describe('battle music', () => {
  it('every voice has the same number of bars, each of 16 steps', () => {
    const bars = BATTLE_MUSIC.bass.pattern.length;
    for (const v of [BATTLE_MUSIC.bass, BATTLE_MUSIC.arp, BATTLE_MUSIC.lead]) {
      expect(v.pattern.length).toBe(bars);
      for (const bar of v.pattern) expect(bar.length).toBe(16);
    }
    expect(BATTLE_MUSIC.drums.pattern.length).toBe(bars);
    for (const bar of BATTLE_MUSIC.drums.pattern) expect(bar).toMatch(/^[ksh.]{16}$/);
  });

  it('notes stay in a pleasant range', () => {
    for (const v of [BATTLE_MUSIC.bass, BATTLE_MUSIC.arp, BATTLE_MUSIC.lead])
      for (const bar of v.pattern)
        for (const n of bar)
          if (n !== null) {
            expect(noteHz(n)).toBeGreaterThan(60);
            expect(noteHz(n)).toBeLessThan(1400);
          }
    expect(noteHz(0)).toBe(220);
    expect(noteHz(12)).toBeCloseTo(440);
  });
});

describe('sea sounds', () => {
  it('get darker with depth', () => {
    expect(SEA_SOUND.rumble.cutoffDeep).toBeLessThan(SEA_SOUND.rumble.cutoffSurface);
  });
});
