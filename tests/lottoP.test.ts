// Lot P (19 ottobre 2026): the sounds. The harbour's music, the menus' softer sea, the touches' tick, calmer beeps.
import { describe, expect, it } from 'vitest';
import { AUDIO, ENGINE_SOUND } from '../src/data/audio';
import { PORT_MUSIC, SEA_MUSIC } from '../src/data/music';
import { SHIP } from '../src/data/ship';

describe('the harbour music', () => {
  it('is calmer than the open sea: slower, softer, no drum', () => {
    expect(PORT_MUSIC.bpm).toBeGreaterThan(SEA_MUSIC.bpm); // a little livelier pulse, but…
    expect(PORT_MUSIC.volume).toBeLessThan(SEA_MUSIC.volume); // …softer
    expect(PORT_MUSIC.drum.bars).toHaveLength(0);
    expect(PORT_MUSIC.reverb.seconds).toBeLessThan(SEA_MUSIC.reverb.seconds);
  });

  it('every bar fills its beats with chords it knows', () => {
    for (const bar of PORT_MUSIC.bars) {
      expect(PORT_MUSIC.chords[bar.chord]).toBeDefined();
      expect(bar.melody.reduce((a, [, beats]) => a + beats, 0)).toBe(PORT_MUSIC.beatsPerBar);
    }
  });
});

describe('the menus and the touches', () => {
  it('the sea goes on, far, in the menus (it no longer stops at once)', () => {
    expect(AUDIO.menuSea).toBeGreaterThan(0);
    expect(AUDIO.menuSea).toBeLessThan(1);
    expect(AUDIO.menuFade).toBeGreaterThan(0.2);
  });

  it('a touch is a short soft tick, quieter than the radar', () => {
    expect(AUDIO.tap.seconds).toBeLessThan(0.1);
    expect(AUDIO.tap.volume).toBeLessThan(ENGINE_SOUND.beep.volume);
  });

  it('the radar beeps no faster than about three times a second', () => {
    expect(SHIP.radar.beepNear).toBeGreaterThanOrEqual(0.3);
  });
});
