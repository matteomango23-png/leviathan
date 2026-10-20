// The helm's words (ui/helmGauges.ts, split from helmControls in the cleanup of 19 ottobre 2026): same as before.
import { describe, expect, it } from 'vitest';
import { dialValues, lightLabel } from '../src/ui/helmGauges';
import type { HelmInfo } from '../src/ui/helmTypes';

const ship: HelmInfo = {
  mode: 'ship',
  face: 1,
  knots: 12.4,
  topKnots: 24,
  fuel: 830.6,
  tank: 1000,
  rangeKm: 7.25,
  fullRangeKm: 20,
};

describe('the dials (owner, 20 ottobre: three square 1970s gauges, no words)', () => {
  const byKind = (info: HelmInfo) => Object.fromEntries(dialValues(info).map((d) => [d.kind, d]));

  it('speed, range and fuel: each needle a share of its full scale, a small number', () => {
    const d = byKind(ship);
    expect(Object.keys(d)).toEqual(['speed', 'range', 'fuel']);
    expect(d.speed!.share).toBeCloseTo(12.4 / 24);
    expect(d.speed!.text).toBe('12');
    expect(d.range!.text).toBe('7,3'); // a decimal comma under 10 km
    expect(d.fuel!.text).toBe('831');
  });

  it('the needle never leaves its scale, over the top or with nothing', () => {
    const d = byKind({ ...ship, knots: 40, rangeKm: 0, fullRangeKm: 0 });
    expect(d.speed!.share).toBe(1);
    expect(d.range!.share).toBe(0);
  });

  it("the boat's drums count with its fuel; dry, the fuel dial turns red", () => {
    const d = byKind({ ...ship, mode: 'boat', fuel: 10, tank: 100, drums: [40, 60] });
    expect(d.fuel!.text).toBe('50');
    expect(d.fuel!.share).toBeCloseTo(50 / 160);
    expect(byKind({ ...ship, fuel: 0 }).fuel!.warn).toBe(true);
  });

  it('under water a fourth dial: the depth', () => {
    const d = byKind({ ...ship, mode: 'sub', depthM: 120.2, maxDepthM: 300 });
    expect(d.depth!.text).toBe('120');
    expect(d.depth!.share).toBeCloseTo(120.2 / 300);
  });
});

describe('the light button', () => {
  it('the light, or the Krill Hunter mouth', () => {
    expect(lightLabel(ship)).toBe('Luce');
    expect(lightLabel({ ...ship, lightOn: true })).toBe('Spegni luce');
    expect(lightLabel({ ...ship, mouth: { open: true, full: true } })).toBe('Chiudi bocca (sazia)');
    expect(lightLabel({ ...ship, mouth: { open: false, full: false } })).toBe('Apri bocca');
  });
});
