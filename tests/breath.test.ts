import { describe, expect, it } from 'vitest';
import { PRESSURE } from '../src/data/diver';
import { RIDE_AIR } from '../src/data/beasts';
import { freshPressure, refillTanks, rideAirMult, stepPressure, tankRanOut } from '../src/systems/breath';

describe('pressione (4 ottobre)', () => {
  it('entro il limite resta piena, oltre si svuota e vuota fa male a intervalli', () => {
    const p = freshPressure();
    expect(stepPressure(p, -3, 1)).toBe(false);
    expect(p.pressure).toBe(1);
    let hurts = 0;
    for (let t = 0; t < 30; t += 0.1) if (stepPressure(p, 10, 0.1)) hurts++;
    expect(p.pressure).toBe(0);
    expect(hurts).toBeGreaterThan(2);
    expect(hurts).toBeLessThanOrEqual(Math.ceil(30 / PRESSURE.hurtEvery));
    // back up within the limit it fills again
    for (let t = 0; t < 5; t += 0.1) stepPressure(p, 0, 0.1);
    expect(p.pressure).toBe(1);
  });
});

describe('aria dei cetacei (4 ottobre)', () => {
  it('i cetacei prestano più aria del sub, gli altri nessuna', () => {
    for (const [id, m] of Object.entries(RIDE_AIR.bySpecies)) {
      expect(m, id).toBeGreaterThan(1);
      expect(rideAirMult(id)).toBe(m);
    }
    expect(rideAirMult('squalo_bianco')).toBe(0);
  });

  it('finita l’aria lo dice una volta; lontano da te il cetaceo respira di nuovo', () => {
    const t = { o2: 0, max: 300 };
    expect(tankRanOut(t)).toBe(true);
    expect(tankRanOut(t)).toBe(false);
    refillTanks({ a: t }, undefined, 10);
    expect(t.o2).toBeGreaterThan(0);
    const ridden = { o2: 0, max: 300 };
    refillTanks({ b: ridden }, ridden, 10);
    expect(ridden.o2).toBe(0); // while you ride it, it does not breathe under water
  });
});

describe('lo scatto consuma aria (4 ottobre)', () => {
  it('ogni scatto del sub costa un po’ d’aria', async () => {
    const { createDiver, stepDiver } = await import('../src/systems/diver');
    const { generateWorld } = await import('../src/systems/world/worldGen');
    const { emptyInput } = await import('../src/systems/input');
    const { makeRng } = await import('../src/systems/math');
    const { DIVER } = await import('../src/data/diver');
    const { bay } = await import('../src/data/worldLayout');
    const map = generateWorld();
    const d = createDiver(bay(340), 200);
    stepDiver(d, { ...emptyInput(), dash: true }, map, 1 / 30, makeRng(1), []);
    expect(DIVER.maxO2 - d.o2).toBeGreaterThanOrEqual(DIVER.dashAir);
  });
});
