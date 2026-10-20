// Lot V (20 ottobre 2026): the sonar, the drone and the hunts. A legend just beaten leaves the sonar while it rests;
// an echo analysed as unknown is named once you have seen its species; the drone goes first where the sonar is blind.
import { describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { ENDLESS } from '../src/data/endless';
import { HUNT_RULES, HUNTS } from '../src/data/hunts';
import { WORLD } from '../src/data/worldLayout';
import { finishBattle } from '../src/systems/battleResult';
import { createGame, type GameState } from '../src/systems/game';
import { sonarReadout } from '../src/systems/hunts';
import { buyShip } from '../src/systems/ship/shipyard';
import { startRecon } from '../src/systems/ship/gadgets';
import { subBay } from '../src/systems/ship/model';
import { stepScan, targetKey } from '../src/systems/sonarScan';
import { beastsInRange } from '../src/systems/tracking';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();

describe('a legend just beaten leaves the sonar (owner: "rimane sul sonar")', () => {
  it('its anomalous echo is gone while it rests in its den, and back when it comes out', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    const h = HUNTS.find((x) => x.form.unique)!;
    const den = g.dens[HUNTS.indexOf(h)]!;
    g.hunts[h.id] = { heard: true, echo: true };
    Object.assign(g.ship, { aboard: true, sonarOn: true, speed: 0, x: den.x + HUNT_RULES.sonarRange * 0.5 });
    const anomalous = () => sonarReadout(g).echoes.some((e) => e.label === 'eco anomala');
    expect(anomalous()).toBe(true);
    const slot = g.beasts.wilds.find((w) => w.spawn.hunt === h.id)!;
    slot.motion = 'roam'; // out of its den, then beaten
    finishBattle(g, {
      wildId: slot.id,
      over: 'won',
      team: [],
      foe: { form: { variant: 'comune', ...h.form }, level: 30, hp: 0 },
    });
    expect(slot.resting).toBe(true);
    expect(anomalous()).toBe(false);
    slot.resting = false; // it came out again (spawnWild)
    expect(anomalous()).toBe(true);
  });
});

describe('the sonar names a species you have seen since (owner: "mi dice specie sconosciuta")', () => {
  it('an echo analysed as unknown becomes its name once you have seen the species', () => {
    const g = createGame(map, null, 4);
    const key = targetKey({ resident: 'r9.9', speciesId: 'orca' });
    g.sonarScan.results[key] = 'Sconosciuta · Glaciale · circa 8 m';
    g.sonarScan.unknown = { [key]: 'orca' };
    stepScan(g, 1 / 30, []);
    expect(g.sonarScan.results[key]).toMatch(/Sconosciuta/); // not seen yet
    g.seen.add('orca');
    stepScan(g, 1 / 30, []);
    expect(g.sonarScan.results[key]).toBe('Orca');
    expect(g.sonarScan.unknown[key]).toBeUndefined();
  });
});

describe('the drone goes first where the sonar is blind (owner: the 9 m echo never in its report)', () => {
  function nightmare(): GameState {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.port = PORTO_FANGO;
    g.gear.teeth = 100000;
    expect(buyShip(g, 'nightmare').ok).toBe(true);
    const x = ENDLESS.startX + ENDLESS.stretch * 6.5;
    Object.assign(g.ship, { aboard: true, x, speed: 0 });
    Object.assign(g.diver, { x, y: WORLD.surfaceY });
    Object.assign(g.ship.hatches[subBay(g.ship)]!, { open: true, t: 1 });
    return g;
  }

  it('the unknown ones first, then the biggest: never just the nearest', () => {
    const g = nightmare();
    const all = beastsInRange(g, g.ship);
    expect(all.length).toBeGreaterThan(1);
    // the sonar already knows every beast but the farthest one
    const far = all[all.length - 1]!;
    for (const c of all) if (c !== far) g.sonarScan.results[targetKey(c.target)] = c.name;
    startRecon(g, [], (t) => g.sonarScan.results[targetKey(t)] !== undefined);
    expect(targetKey(g.gadgets.recon.queue[0]!.target)).toBe(targetKey(far.target));
  });

  it('among the unknown ones the biggest goes first', () => {
    const g = nightmare();
    const all = beastsInRange(g, g.ship);
    startRecon(g, []);
    const q = g.gadgets.recon.queue;
    expect(q[0]!.lengthM).toBe(Math.max(...all.map((c) => c.lengthM)));
  });
});
