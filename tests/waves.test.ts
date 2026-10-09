// Realistic waves (owner, 9 ottobre 2026: two sines "looked like a ghost"): a Gerstner sea of many trains at their
// deep-water speeds, which never repeats and makes groups, with narrow crests and broad troughs; and the water that
// answers the hulls (a row of spring columns): a push spreads out and dies away, a fast heavy hull raises a bigger
// bow wave than a slow or a light one.
import { describe, expect, it } from 'vitest';
import { WEATHERS } from '../src/data/weather';
import { COLUMNS } from '../src/data/sea';
import { newRide, stepRide } from '../src/systems/ride';
import { troughDepth, waveHeight } from '../src/systems/sea';
import { columnHeight, hullOnWater, newColumns, pushColumns, stepColumns } from '../src/systems/waterColumns';

const STORM = WEATHERS.tempesta.look;

describe('the waves', () => {
  it('never repeat: the highest crest changes from one stretch of sea to the next (wave groups)', () => {
    const peaks = Array.from({ length: 8 }, (_, k) =>
      Math.max(...Array.from({ length: 100 }, (_, i) => waveHeight(k * 600 + i * 6, 0, STORM))),
    );
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(3);
  });

  it('crests are narrower than troughs (a Gerstner sea)', () => {
    let above = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (waveHeight(i * 2, 5, STORM) > 0) above++;
    expect(above / n).toBeLessThan(0.5);
  });
});

describe('the water answering the hulls', () => {
  it('a push spreads to the neighbours and dies away', () => {
    const c = newColumns(0);
    pushColumns(c, -10, 10, 200);
    for (let t = 0; t < 2; t += 1 / 60) stepColumns(c, 1 / 60);
    expect(Math.abs(columnHeight(c, 50))).toBeGreaterThan(0.05);
    for (let t = 0; t < 30; t += 1 / 60) stepColumns(c, 1 / 60);
    expect(Math.abs(columnHeight(c, 0))).toBeLessThan(0.2);
  });

  it('a fast heavy hull raises a bigger bow wave than a slow one or a light boat', () => {
    const bowWave = (length: number, speed: number): number => {
      const c = newColumns(0);
      for (let t = 0; t < 1; t += 1 / 60) {
        hullOnWater(c, 0, 1, length, speed, 0, 1 / 60);
        stepColumns(c, 1 / 60);
      }
      return Math.max(...Array.from({ length: 60 }, (_, i) => columnHeight(c, length * 0.3 + i * 4)));
    };
    expect(bowWave(500, 150)).toBeGreaterThan(bowWave(500, 40));
    expect(bowWave(500, 150)).toBeGreaterThan(bowWave(84, 150));
  });
});

describe('no trampoline (owner, 9 ottobre: at full speed the ship was thrown 20 m up and down)', () => {
  it('a heavy ship at full speed in a storm stays within the waves, it never bounces far above or below them', () => {
    const r = newRide();
    let hi = -Infinity;
    let lo = Infinity;
    const deep = troughDepth(STORM);
    for (let t = 0, x = 0; t < 30; t += 1 / 60) {
      x += 150 / 60;
      stepRide(r, x, 1, 540, STORM, t, 1 / 60);
      if (t > 3) {
        hi = Math.max(hi, r.h);
        lo = Math.min(lo, r.h);
      }
    }
    expect(hi).toBeLessThan(deep);
    expect(lo).toBeGreaterThan(-deep * 1.3);
  });

  it('the water a hull pushes never piles up past its limit', () => {
    const c = newColumns(0);
    for (let t = 0; t < 5; t += 1 / 60) {
      hullOnWater(c, 0, 1, 540, 200, 80, 1 / 60);
      stepColumns(c, 1 / 60);
    }
    for (let x = -1300; x < 1300; x += 8)
      expect(Math.abs(columnHeight(c, x))).toBeLessThanOrEqual(COLUMNS.maxHeight);
  });
});
