// Lot AB (21 ottobre 2026): the water as one filter over everything under the waves, darker deeper and in murky
// water; no bubble sound while swimming; soft light shafts that light the particles they cross.
import { describe, expect, it } from 'vitest';
import { SEA } from '../src/data/diver';
import { WORLD } from '../src/data/worldLayout';
import { bubblesFor } from '../src/audio/seaAmbience';
import { filterColor } from '../src/systems/waterTint';
import { rayLightAt, raysInView, type Ray } from '../src/views/seaRays';

const sum = (c: number[]): number => c[0]! + c[1]! + c[2]!;

describe('the water filter (owner: "un filtro… più vai in profondità più diventa tutto scuro")', () => {
  it('barely tints just under the surface, and darkens steadily going down', () => {
    const top = filterColor(WORLD.surfaceY);
    expect(Math.min(...top)).toBeGreaterThan(180);
    let last = sum(top);
    for (let y = WORLD.surfaceY + 20; y < 1200; y += 40) {
      const s = sum(filterColor(y));
      expect(s).toBeLessThanOrEqual(last);
      last = s;
    }
    expect(last).toBeLessThan(sum(top) * 0.7);
  });

  it('takes the red first (real water), and murky water is darker and browner', () => {
    const c = filterColor(WORLD.surfaceY + 100);
    expect(c[0]).toBeLessThan(c[2]);
    const m = filterColor(WORLD.surfaceY + 100, 1);
    expect(sum(m)).toBeLessThan(sum(c));
    expect(m[0] - m[2]).toBeGreaterThan(c[0] - c[2]);
  });
});

describe('no bubbles while swimming (owner: "togli quel rumore fastidioso di bollicine")', () => {
  it('swimming at full speed for a minute makes no bubble sound; a dash a few', () => {
    expect(bubblesFor(1, false, 60)).toBe(0);
    expect(bubblesFor(0, true, 0.016)).toBeGreaterThan(0);
  });
});

describe('the light shafts', () => {
  const ray: Ray = { x: 100, y: 0, angle: 0, width: 40, length: 400, alpha: SEA.lightRays.alpha };

  it('light a particle most on their middle, less to the side, not at all far away or deep down', () => {
    const mid = rayLightAt(100, 100, [ray]);
    expect(mid).toBeGreaterThan(rayLightAt(115, 100, [ray]));
    expect(rayLightAt(300, 100, [ray])).toBe(0);
    expect(rayLightAt(100, 399, [ray])).toBeLessThan(mid * 0.05);
    expect(rayLightAt(100, -10, [ray])).toBe(0);
  });

  it('are spread across the view, and gone without daylight', () => {
    const rays = raysInView(800, 400, 50, 0, 10, 1);
    const xs = rays.map((r) => r.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(800 * 0.05);
    expect(raysInView(800, 400, 50, 0, 10, 0)).toHaveLength(0);
  });
});
