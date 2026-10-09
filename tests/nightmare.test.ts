// Part 4d (owner, 9 ottobre 2026): the Ocean's Nightmare. Its drone scouts every beast the sonar reaches and comes
// back with a report; the beast you pick is followed by the compass and held still for a minute by the sphere, which
// then comes back and recharges. The drone is its submarine too.
import { describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { ENDLESS } from '../src/data/endless';
import { RECON, SPHERE } from '../src/data/nightmare';
import { WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { parseSave } from '../src/systems/save/saveData';
import { stepWildSpawns } from '../src/systems/encounters';
import { spawnWild } from '../src/systems/beasts/wildState';
import { makeTeamBeast } from '../src/systems/beasts/team';
import {
  canRecon,
  canSendSphere,
  pickTarget,
  sendSphere,
  sphereBay,
  startRecon,
  stepGadgets,
} from '../src/systems/ship/gadgets';
import { shipModel, subBay } from '../src/systems/ship/model';
import { buyShip } from '../src/systems/ship/shipyard';
import { maxDive } from '../src/systems/ship/uboat';
import { beastsInRange, compassTo, locate } from '../src/systems/tracking';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();
const DT = 1 / 30;

/** You own the Nightmare, at its helm in the open sea among the residents. */
function nightmare(): GameState {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  g.gear.teeth = 100000;
  expect(buyShip(g, 'nightmare').ok).toBe(true);
  const x = ENDLESS.startX + ENDLESS.stretch * 6.5;
  Object.assign(g.ship, { aboard: true, x, speed: 0 });
  Object.assign(g.diver, { x, y: WORLD.surfaceY });
  return g;
}

/** Opens a hatch all the way (the drone's: 0, the sphere's: 1). */
const openHatch = (g: GameState, i: number): void =>
  void Object.assign(g.ship.hatches[i]!, { open: true, t: 1 });

function run(g: GameState, seconds: number, ev: GameEvent[] = []): GameEvent[] {
  for (let t = 0; t < seconds; t += DT) {
    g.beasts.residents.clock += DT;
    stepGadgets(g, DT, ev);
  }
  return ev;
}

describe('the Ocean’s Nightmare', () => {
  it('is sold, dives to 500 m, its drone is its submarine', () => {
    const g = nightmare();
    expect(shipModel(g.ship).ready).toBe(true);
    expect(shipModel(g.ship).dive?.maxDepthM).toBe(500);
    expect(maxDive(g.ship)).toBeGreaterThan(0);
    expect(g.sub.model).toBe('drone_nightmare');
    expect(g.ship.bay).toBe('docked');
  });

  it('the drone visits every beast the sonar reaches and comes back with the report', () => {
    const g = nightmare();
    const near = beastsInRange(g, g.ship);
    expect(near.length).toBeGreaterThan(0);
    expect(canRecon(g)).toBe(false); // owner, 9 ottobre: open its hatch first
    openHatch(g, subBay(g.ship));
    expect(canRecon(g)).toBe(true);
    const ev: GameEvent[] = [];
    startRecon(g, ev);
    expect(canRecon(g)).toBe(false);
    run(g, 120, ev);
    const done = ev.find((e) => e.type === 'reconDone');
    expect(done).toBeDefined();
    const report = g.gadgets.recon.report!;
    expect(report.length).toBe(Math.min(RECON.maxBeasts, near.length));
    for (const e of report) expect(g.seen.has(e.speciesId)).toBe(true);
    expect(g.gadgets.recon.phase).toBe('idle');
    expect(g.ship.hatches[subBay(g.ship)]!.open).toBe(true); // you close it yourself
  });

  it('while the drone is out you cannot dive off the ship (owner, 9 ottobre)', () => {
    const g = nightmare();
    openHatch(g, subBay(g.ship));
    startRecon(g, []);
    const input = emptyInput();
    input.helmCmd = 'dive';
    stepGame(g, input, DT);
    expect(g.ship.aboard).toBe(true);
  });

  it('with the drone home you dive off as usual', () => {
    const g = nightmare();
    const input = emptyInput();
    input.helmCmd = 'dive';
    stepGame(g, input, DT);
    expect(g.ship.aboard).toBe(false);
  });

  it('the drone scouts only from its hold', () => {
    const g = nightmare();
    openHatch(g, subBay(g.ship));
    g.ship.bay = 'out';
    const ev: GameEvent[] = [];
    startRecon(g, ev);
    expect(ev.length).toBe(0);
    expect(g.gadgets.recon.phase).toBe('idle');
  });

  it('the beast picked: the compass follows it; sent from its open bay, the sphere holds it a minute, comes back and recharges', () => {
    const g = nightmare();
    openHatch(g, subBay(g.ship));
    startRecon(g, []);
    run(g, 120);
    const e = g.gadgets.recon.report![0]!;
    const ev: GameEvent[] = [];
    pickTarget(g, e, ev);
    expect(g.gadgets.target).toEqual(e.target);
    expect(compassTo(g, g.gadgets.target, g.diver)).not.toBeNull();
    expect(canSendSphere(g)).toBe(false); // its bay is shut
    run(g, 5, ev);
    expect(g.gadgets.sphere.phase).toBe('dock');
    openHatch(g, sphereBay(g.ship));
    sendSphere(g, ev);
    run(g, 30, ev);
    expect(ev.some((x) => x.type === 'sphereHold')).toBe(true);
    const at = locate(g, e.target)!;
    run(g, 20, ev); // held: it does not move
    const still = locate(g, e.target)!;
    expect(Math.hypot(still.x - at.x, still.y - at.y)).toBeLessThan(1);
    run(g, SPHERE.holdSeconds, ev);
    expect(g.beasts.held).toBeNull();
    run(g, 40, ev);
    expect(g.gadgets.sphere.phase).toBe('dock');
    expect(g.gadgets.sphere.cooldown).toBeGreaterThan(0);
    expect(g.ship.hatches[sphereBay(g.ship)]!.open).toBe(true); // you close it yourself
    const again: GameEvent[] = [];
    sendSphere(g, again);
    expect(again.some((x) => x.type === 'sphereCharging')).toBe(true);
  });

  it('a held wild beast does not swim nor come at you', () => {
    const g = nightmare();
    const w = g.beasts.wilds.find((x) => !x.spawn.endless)!;
    spawnWild(
      w,
      { speciesId: w.spawn.speciesId, variant: 'comune' },
      5,
      g.diver.x + 60,
      WORLD.surfaceY + 120,
      -1,
    );
    w.vx = 40;
    g.beasts.held = { wild: w.id, x: w.x, y: w.y, left: 10 };
    const x0 = w.x;
    for (let t = 0; t < 3; t += DT) stepWildSpawns(g, DT, []);
    expect(Math.abs(w.x - x0)).toBeLessThan(20);
    expect(g.beasts.battle).toBeNull();
  });

  it('a held beast: swim up to it and the battle starts, you striking first (owner, 9 ottobre)', () => {
    const g = nightmare();
    const w = g.beasts.wilds.find((x) => !x.spawn.endless)!;
    spawnWild(w, { speciesId: w.spawn.speciesId, variant: 'comune' }, 5, g.diver.x + 4, g.diver.y + 40, -1);
    g.diver.y = w.y;
    g.diver.x = w.x;
    g.beasts.held = { wild: w.id, x: w.x, y: w.y, left: 10 };
    g.beasts.team.push(makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, 10, true));
    stepWildSpawns(g, DT, []);
    expect(g.beasts.battle).toEqual({ wildId: w.id, first: 'you' });
  });

  it('the sphere does not go with its bay shut', () => {
    const g = nightmare();
    const c = beastsInRange(g, g.ship)[0]!;
    pickTarget(
      g,
      { target: c.target, name: c.name, speciesId: c.speciesId, lengthM: 1, depthM: 1, dxM: 1 },
      [],
    );
    sendSphere(g, []);
    expect(g.gadgets.sphere.phase).toBe('dock');
  });

  it('a beast caught or gone: the trail is lost', () => {
    const g = nightmare();
    const c = beastsInRange(g, g.ship).find((x) => 'resident' in x.target)!;
    pickTarget(
      g,
      { target: c.target, name: c.name, speciesId: c.speciesId, lengthM: 1, depthM: 1, dxM: 1 },
      [],
    );
    g.beasts.residents.gone[(c.target as { resident: string }).resident] = g.beasts.residents.clock + 999;
    const ev = run(g, DT);
    expect(ev.some((e) => e.type === 'targetLost')).toBe(true);
    expect(g.gadgets.target).toBeNull();
  });

  it('a save whose submarine is not its ship’s gets the drone back', () => {
    const g = nightmare();
    Object.assign(g.sub, { model: 'batiscafo', models: ['batiscafo'] });
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.sub.model).toBe('drone_nightmare');
  });

  it('the beast you follow is saved', () => {
    const g = nightmare();
    const c = beastsInRange(g, g.ship).find((x) => 'resident' in x.target)!;
    pickTarget(
      g,
      { target: c.target, name: c.name, speciesId: c.speciesId, lengthM: 1, depthM: 1, dxM: 1 },
      [],
    );
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.gadgets.target).toEqual(c.target);
    expect(back.gadgets.targetName).toBe(c.name);
  });
});
