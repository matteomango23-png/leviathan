// The helm's words (ui/helmGauges.ts, split from helmControls in the cleanup of 19 ottobre 2026): same as before.
import { describe, expect, it } from 'vitest';
import { gaugeLine, lightLabel } from '../src/ui/helmGauges';
import type { HelmInfo } from '../src/ui/helmTypes';

const ship: HelmInfo = { mode: 'ship', face: 1, knots: 12.4, fuel: 830.6, tank: 1000, rangeKm: 7.25 };

describe('the instruments line', () => {
  it('knots, gas, fuel and range (a decimal comma under 10 km)', () => {
    expect(gaugeLine(ship, 0.5)).toBe('12 nodi · gas 50% · 831 L · 7,3 km');
    expect(gaugeLine({ ...ship, rangeKm: 42.6 }, 0)).toBe('12 nodi · gas 0% · 831 L · 43 km');
  });

  it('a submarine adds its depth', () => {
    expect(gaugeLine({ ...ship, mode: 'sub', depthM: 120.2, maxDepthM: 300 }, 1)).toContain('120 / 300 m');
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
