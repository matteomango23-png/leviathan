// Finishing touches after block 5 (owner, 10 ottobre 2026): the drone's report names the beasts on the sonar; wind,
// sea and water in words for the bridge; the ships' cards show the hull, the repair, the radar, the 360° sonar and
// the spare parts.
import { describe, expect, it } from 'vitest';
import { SHIP_MODELS } from '../src/data/fleet';
import { WEATHERS } from '../src/data/weather';
import { createGame } from '../src/systems/game';
import { seaWords, waterWords, windWords } from '../src/systems/seaReport';
import { shipStats } from '../src/systems/ship/stats';
import { learnFromReport, targetKey } from '../src/systems/sonarScan';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

describe('the drone’s report on the sonar', () => {
  it('names every beast it reached and notes it in the diary', () => {
    const g = createGame(generateWorld(), null, 4);
    giveVessels(g);
    const target = { resident: 'r5.1', speciesId: 'capodoglio' };
    learnFromReport(g, [
      { target, name: 'Capodoglio', speciesId: 'capodoglio', level: 30, depthM: 120, dxM: 40, lengthM: 16 },
    ]);
    expect(g.sonarScan.results[targetKey(target)]).toBe('Capodoglio · liv. 30');
    expect(g.sonarNotes.capodoglio?.minM).toBe(120);
  });
});

describe('the sea in words', () => {
  it('wind, waves and current, water and visibility', () => {
    expect(windWords(WEATHERS.sereno.look.wind)).toBe('calmo');
    expect(windWords(WEATHERS.tempesta.look.wind)).toBe('burrasca');
    const storm = seaWords(WEATHERS.tempesta.look);
    expect(storm.waveM).toBeGreaterThan(seaWords(WEATHERS.sereno.look).waveM);
    expect(storm.slowPct).toBeGreaterThan(0);
    expect(waterWords(0).text).toBe('limpida');
    expect(waterWords(0.6).text).toBe('molto torbida');
    expect(waterWords(0.6).visibilityM).toBeLessThan(waterWords(0).visibilityM);
  });
});

describe('the ships’ cards', () => {
  it('show the hull, the repair, the radar, the sonar sizes; the vehicles their parts and 360° sonar', () => {
    const nightmare = shipStats(SHIP_MODELS.find((m) => m.id === 'nightmare')!);
    const row = (k: string) => nightmare.find((r) => r.key === k);
    expect(row('hull')?.value).toBe(300);
    expect(row('repair')?.value).toBe(5000);
    expect(row('radar')).toBeDefined();
    expect(row('sonar')?.text).toContain('5 grandezze');
    expect(row('sub.sonar')?.text).toContain('360°');
    expect(row('sub.parts')).toBeDefined();
    const eh2 = shipStats(SHIP_MODELS.find((m) => m.id === 'eh2')!);
    expect(eh2.some((r) => r.key === 'boat.parts')).toBe(true);
  });
});
