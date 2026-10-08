// Block 4b (owner, 8 ottobre 2026): the ships with two hatches, the speedboats and the jet ski. Down its ramp onto
// the water, fast on the surface, stopped by the ice, drums of fuel from an outpost poured into the ship when it
// docks again; the save v19.
import { describe, expect, it } from 'vitest';
import { BOAT, BOAT_MODELS } from '../src/data/boats';
import { OUTPOSTS, PORTO_FANGO } from '../src/data/economy';
import { SHIP_MODELS } from '../src/data/fleet';
import { FUEL, SHIP } from '../src/data/ship';
import { WORLD_ART_KEYS } from '../src/data/sprites.generated';
import { SUB_MODELS } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import { boatTopSpeed, newBoat, sailBoat } from '../src/systems/boat';
import type { GameEvent } from '../src/systems/events';
import { buyFuel, canRefuel } from '../src/systems/fuel';
import { createGame, currentAction, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { migrate, parseSave, SAVE_VERSION } from '../src/systems/save/saveData';
import { boatPoint } from '../src/systems/ship/geometry';
import { boatBay, subBay } from '../src/systems/ship/model';
import { buyShip } from '../src/systems/ship/shipyard';
import { iceIn } from '../src/systems/ship/surface';
import { ENDLESS } from '../src/data/endless';
import { generateWorld } from '../src/systems/world/worldGen';
import { lampAim } from '../src/systems/submarine';
import { cameraAim } from '../src/systems/shipCamera';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();
const DT = 1 / 30;

function run(g: GameState, seconds: number, input: InputState): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}
const cmd = (g: GameState, c: InputState['helmCmd'], input: InputState): GameEvent[] => {
  input.helmCmd = c;
  return run(g, DT, input);
};

/** A ship of this model bought at Porto Fango, you at its helm, still at the pier. */
function withShip(model: string): { g: GameState; input: InputState } {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  g.gear.teeth = 100000;
  expect(buyShip(g, model).ok).toBe(true);
  g.ship.aboard = true;
  const input = emptyInput();
  run(g, DT, input);
  return { g, input };
}

/** EH2: the speedboat's hatch open, the boat down its ramp, you in it. */
function boatOut(): { g: GameState; input: InputState } {
  const { g, input } = withShip('eh2');
  cmd(g, 'hatch2', input);
  run(g, SHIP.hatchSeconds + 0.1, input);
  expect(currentAction(g)).toBe('porto'); // still at the pier
  cmd(g, 'launchBoat', input);
  const ev = run(g, BOAT.launchSeconds + 0.2, input);
  expect(ev.some((e) => e.type === 'boatLaunched')).toBe(true);
  expect(g.boat).toMatchObject({ bay: 'out', aboard: true });
  expect(g.ship.aboard).toBe(false);
  return { g, input };
}

describe('the new ships (block 4b)', () => {
  it('EH2, Poseidon and Imperium sail now, with their paintings, hatches and vehicles', () => {
    for (const id of ['eh2', 'poseidon', 'imperium']) {
      const m = SHIP_MODELS.find((x) => x.id === id)!;
      expect(m.ready, id).toBe(true);
      expect(WORLD_ART_KEYS).toContain(m.art!.closed);
      for (const b of m.bays) {
        if (b.open) expect(WORLD_ART_KEYS).toContain(b.open);
        const known = b.kind === 'sub' ? SUB_MODELS : BOAT_MODELS;
        expect(
          known.map((x) => x.id),
          b.model,
        ).toContain(b.model);
      }
    }
    for (const b of BOAT_MODELS) expect(WORLD_ART_KEYS).toContain(b.art);
  });

  it('the shipyard gives each its submarine and boat (the Poseidon none: the old submarine goes)', () => {
    const eh2 = withShip('eh2').g;
    expect(eh2.sub).toMatchObject({ owned: true, model: 'eh2_sub' });
    expect(eh2.boat).toMatchObject({ owned: true, model: 'motoscafo_eh2', bay: 'docked', drums: 0 });
    expect(eh2.ship.hatches).toHaveLength(2);
    const pos = withShip('poseidon').g;
    expect(pos.sub.owned).toBe(false);
    expect(pos.boat.model).toBe('motoscafo_poseidon');
    const imp = withShip('imperium').g;
    expect(imp.boat.model).toBe('moto_imperium');
    expect(imp.sub.model).toBe('imperium_sub');
    // back to the EH1: no boat any more
    imp.port = PORTO_FANGO;
    expect(buyShip(imp, 'eh1').ok).toBe(true);
    expect(imp.boat.owned).toBe(false);
  });
});

describe('two hatches', () => {
  it('open one at a time; with either open the ship does not move', () => {
    const { g, input } = withShip('eh2');
    cmd(g, 'hatch2', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    expect(g.ship.hatches.map((h) => h.t)).toEqual([0, 1]);
    expect(subBay(g.ship)).toBe(0);
    expect(boatBay(g.ship)).toBe(1);
    const x = g.ship.x;
    input.helm.throttle = 1;
    input.helm.dir = 1;
    run(g, 2, input);
    expect(g.ship.x).toBe(x);
    input.helm.throttle = 0;
    cmd(g, 'hatch2', input);
    cmd(g, 'hatch', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    expect(g.ship.hatches.map((h) => h.t)).toEqual([1, 0]);
  });
});

describe('the speedboat', () => {
  it('in its hold it rises to float at the surface as its hatch opens (owner, 8 ottobre)', () => {
    const { g, input } = withShip('eh2');
    const low = g.boat.y;
    expect(low).toBeGreaterThan(WORLD.surfaceY); // the hold is under the waterline
    cmd(g, 'hatch2', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    expect(g.boat.y).toBeLessThanOrEqual(WORLD.surfaceY);
  });

  it('its headlight points where it goes; the camera stays close (like the submarine)', () => {
    const { g, input } = boatOut();
    input.helm.dir = -1;
    input.helm.throttle = 0.3;
    run(g, 0.5, input);
    expect(g.boat.face).toBe(-1);
    expect(lampAim(g)).toBeCloseTo(Math.PI);
    expect(cameraAim(g, 0).viewH).toBe(BOAT.camera.viewHeightUnits);
  });

  it('goes down its ramp onto the water and races faster than any ship', () => {
    const { g, input } = boatOut();
    expect(g.boat.y).toBe(WORLD.surfaceY);
    const x = g.boat.x;
    input.helm.dir = 1;
    input.helm.throttle = 1;
    run(g, 3, input);
    expect(g.boat.x).toBeGreaterThan(x + 300);
    expect(g.boat.speed).toBeGreaterThan(Math.max(...SHIP_MODELS.map((m) => m.knots)) / (24 / 220));
    expect(g.diver.x).toBeCloseTo(g.boat.x, 0); // you are in it
    expect(g.boat.fuel).toBeLessThan(BOAT_MODELS[0]!.tank);
  });

  it('dry, it crawls on its reserve: never stuck', () => {
    const { g, input } = boatOut();
    g.boat.fuel = 0;
    input.helm.dir = 1;
    input.helm.throttle = 1;
    const x = g.boat.x;
    const ev = run(g, 2, input);
    expect(ev.some((e) => e.type === 'fuelOut' && e.vehicle === 'boat')).toBe(true);
    expect(g.boat.x).toBeGreaterThan(x);
    expect(g.boat.speed).toBeLessThanOrEqual(boatTopSpeed(g.boat) * BOAT.dryCrawl + 0.01);
  });

  it('the ice sheet stops it: only the ship breaks ice', () => {
    let at = 0;
    for (let x = ENDLESS.startX; x < 400000 && !at; x += 50)
      if (Array.from({ length: 10 }, (_, i) => x + i * 20).every((c) => iceIn(map, c, c + 20))) at = x;
    expect(at).toBeGreaterThan(0);
    const b = newBoat({
      model: 'motoscafo_eh2',
      x: at - 400,
      face: 1,
      fuel: 60,
      drums: 0,
      out: true,
      aboard: true,
    });
    const w = { boat: b, map, diver: { x: 0, y: 0, vx: 0, vy: 0, face: 1 as const } };
    const ev: GameEvent[] = [];
    for (let t = 0; t < 6; t += DT) sailBoat(w, { throttle: 1, dir: 1, dive: 0 }, DT, ev);
    expect(b.x).toBeLessThan(at);
    expect(ev.some((e) => e.type === 'boatIce')).toBe(true);
  });

  it('at an outpost it fills its drums; docked again, they pour into the ship and its tank fills', () => {
    const { g, input } = boatOut();
    const outpost = OUTPOSTS[0]!;
    // driven there (moved, not raced, to keep the test quick), still by the pier
    Object.assign(g.boat, { x: outpost.shipDock, speed: 0 });
    run(g, DT, input);
    expect(g.port?.id).toBe(outpost.id);
    expect(canRefuel(g, 'drums')).toBe(true);
    g.gear.teeth = 1000;
    const buy = buyFuel(g, 'drums');
    expect(buy).toMatchObject({ ok: true, litres: 200 });
    expect(g.gear.teeth).toBe(1000 - 200 * FUEL.pricePerLitre);
    g.boat.fuel = 10;
    // back in front of its hatch
    g.ship.fuel = 100;
    Object.assign(g.boat, { x: boatPoint(g.ship, boatBay(g.ship)).x + 20, speed: 0 });
    run(g, DT, input);
    expect(currentAction(g)).toBe('aggancia');
    input.action = true;
    const ev = run(g, BOAT.launchSeconds + 0.2, input);
    const docked = ev.find((e) => e.type === 'boatDocked');
    expect(docked).toBeDefined();
    expect(g.ship.aboard).toBe(true);
    expect(g.boat).toMatchObject({ bay: 'docked', aboard: false, drums: 0, fuel: 60 });
    expect(g.ship.fuel).toBe(100 + 200 - 50);
  });

  it('is saved (v19); a v18 ship gets one hatch per bay', () => {
    const { g, input } = boatOut();
    g.boat.drums = 77;
    run(g, DT, input);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.boat).toMatchObject({ owned: true, model: 'motoscafo_eh2', bay: 'out', drums: 77 });
    expect(back.ship.hatches.map((h) => h.open)).toEqual([false, true]);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(19);
    const old = migrate({
      game: 'leviatano',
      version: 18,
      ship: { x: 1, hatchOpen: true, model: 'eh1' },
    }) as {
      ship: { hatches: boolean[]; hatchOpen?: boolean };
      boat: unknown;
    };
    expect(old.ship.hatches).toEqual([true]);
    expect(old.ship.hatchOpen).toBeUndefined();
    expect(old.boat).toBeNull();
  });
});
