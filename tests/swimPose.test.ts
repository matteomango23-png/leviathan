// How the big beasts' bodies move (owner, 15 ottobre 2026): Folgore like a snake without stretching, the manta's
// wings beating.
import { describe, expect, it } from 'vitest';
import { BEAST_SPRITE, FLAP, SERPENTS } from '../src/data/beasts';
import { flapScale, spineOf } from '../src/views/swimPose';

const SEG = BEAST_SPRITE.frameW / BEAST_SPRITE.segments;

describe('a serpent', () => {
  it('keeps every piece its length, going up, down or straight', () => {
    expect(SERPENTS).toContain('folgore');
    for (const pitchV of [-3, 0, 3])
      for (const phase of [0, 1, 2.5]) {
        const { lens } = spineOf({ pitch: 0.3, pitchV, phase, serpent: true });
        for (const l of lens) expect(l).toBeCloseTo(SEG, 6);
      }
  });

  it('carries a wave down the whole body, the head too', () => {
    const { ang } = spineOf({ pitch: 0, pitchV: 0, phase: 1, serpent: true });
    const head = ang.slice(0, 6);
    expect(Math.max(...head) - Math.min(...head)).toBeGreaterThan(0.02);
    expect(Math.max(...ang) - Math.min(...ang)).toBeGreaterThan(0.3);
  });
});

describe('the manta', () => {
  it('beats its wings: the upper wing up while the lower one rises too, and back', () => {
    const flap = FLAP.manta!;
    const N = BEAST_SPRITE.segments;
    const upper = Math.round((1 - (flap.upper[0] + flap.upper[1]) / 2) * N - 0.5);
    const lower = Math.round((1 - (flap.lower[0] + flap.lower[1]) / 2) * N - 0.5);
    const up = Math.PI / 2 / flap.rate;
    expect(flapScale({ phase: up, flap }, upper)).toBeGreaterThan(1.1);
    expect(flapScale({ phase: up, flap }, lower)).toBeLessThan(0.9);
    expect(flapScale({ phase: -up, flap }, upper)).toBeLessThan(0.9);
    expect(flapScale({ phase: up, flap }, 0)).toBe(1); // the head does not move
  });
});
