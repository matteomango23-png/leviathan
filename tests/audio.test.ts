// The music and the sea sounds are data (data/music.ts, data/audio.ts): check they are well formed.
import { describe, expect, it } from 'vitest';
import { SEA_SOUND } from '../src/data/audio';
import { PORTO_FANGO } from '../src/data/economy';
import { kmFromCoast } from '../src/systems/world/stretches';
import { BATTLE_MUSIC, noteHz, SEA_MUSIC } from '../src/data/music';

describe('battle music', () => {
  it('every bar has 16 steps in each part, its brass on them', () => {
    for (const bar of [...BATTLE_MUSIC.intro, ...BATTLE_MUSIC.loop]) {
      expect(bar.ostinato).toMatch(/^[ab.]{16}$/);
      expect(bar.timpani).toMatch(/^[tr.]{16}$/);
      for (const b of bar.brass) expect(b.step).toBeLessThan(16);
    }
  });

  it('the ostinato is two notes a semitone apart, low; it closes in (busier at the end of the intro)', () => {
    expect(BATTLE_MUSIC.ostinato.high - BATTLE_MUSIC.ostinato.low).toBe(1);
    expect(noteHz(BATTLE_MUSIC.ostinato.low)).toBeLessThan(100);
    const strokes = (s: string) => s.replace(/\./g, '').length;
    const intro = BATTLE_MUSIC.intro.map((b) => strokes(b.ostinato));
    expect(intro[intro.length - 1]).toBeGreaterThan(intro[0]!);
  });

  it('notes stay in a pleasant range', () => {
    for (const bar of [...BATTLE_MUSIC.intro, ...BATTLE_MUSIC.loop]) {
      for (const b of bar.brass)
        for (const n of b.notes) {
          expect(noteHz(n)).toBeGreaterThan(60);
          expect(noteHz(n)).toBeLessThan(1400);
        }
      if (bar.high !== null) expect(noteHz(bar.high)).toBeLessThan(1400);
    }
    expect(noteHz(0)).toBe(220);
    expect(noteHz(12)).toBeCloseTo(440);
  });
});

describe('open sea music', () => {
  it('each bar of the melody fills its three beats, over a chord it knows', () => {
    for (const b of SEA_MUSIC.bars) {
      expect(b.melody.reduce((s, [, beats]) => s + beats, 0)).toBe(SEA_MUSIC.beatsPerBar);
      expect(SEA_MUSIC.chords[b.chord]).toBeDefined();
    }
  });

  it('low and slow, soft, from about a kilometre out: Porto Fango stays quiet (off a little closer in, no flicker)', () => {
    for (const b of SEA_MUSIC.bars)
      for (const [n] of b.melody) if (n !== null) expect(noteHz(n)).toBeLessThan(400);
    expect(SEA_MUSIC.bpm).toBeLessThan(70);
    expect(SEA_MUSIC.volume).toBeLessThan(BATTLE_MUSIC.volume);
    expect(SEA_MUSIC.fromKm).toBeLessThan(1.5);
    expect(kmFromCoast(PORTO_FANGO.shipDock + 300)).toBeLessThan(SEA_MUSIC.offKm);
    expect(SEA_MUSIC.offKm).toBeLessThan(SEA_MUSIC.fromKm);
  });
});

describe('sea sounds', () => {
  it('get darker with depth', () => {
    expect(SEA_SOUND.rumble.cutoffDeep).toBeLessThan(SEA_SOUND.rumble.cutoffSurface);
  });
});
