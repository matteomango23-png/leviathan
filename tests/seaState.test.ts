// The living sea (owner, 9 ottobre 2026): waves that rise with the weather and that short and long hulls ride
// differently, currents that slow the small boats most, storms that wear the boats' hulls (mended at a harbour),
// diving off the speedboat and climbing back, murky water by stretch of sea and by weather.
import { describe, expect, it } from 'vitest';
import { BOAT } from '../src/data/boats';
import { PORTO_FANGO } from '../src/data/economy';
import { CLARITY } from '../src/data/sea';
import { SHIP } from '../src/data/ship';
import { WEATHERS } from '../src/data/weather';
import { DELTA, WORLD } from '../src/data/worldLayout';
import { boatModel as boatModelById, boatTopSpeed, sailBoat } from '../src/systems/boat';
import { canBoardBoat, canDiveFromBoat } from '../src/systems/boatCrew';
import { cycleMurk, isShape, turbidityAt } from '../src/systems/clarity';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { parseSave } from '../src/systems/save/saveData';
import { buyShip } from '../src/systems/ship/shipyard';
import { CALM_SEA, currentMult, diverCurrentMult, rideWaves, waveHeight } from '../src/systems/sea';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();
const DT = 1 / 30;
const STORM = WEATHERS.tempesta.look;
const CALM = WEATHERS.sereno.look;

function run(g: GameState, seconds: number, input: InputState): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

/** The EH2's speedboat out on the water, you driving it. */
function boatOut(): { g: GameState; input: InputState } {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  g.gear.teeth = 100000;
  expect(buyShip(g, 'eh2').ok).toBe(true);
  g.ship.aboard = true;
  const input = emptyInput();
  input.helmCmd = 'hatch2';
  run(g, SHIP.hatchSeconds + 0.2, input);
  input.helmCmd = 'launchBoat';
  run(g, BOAT.launchSeconds + 0.3, input);
  expect(g.boat).toMatchObject({ bay: 'out', aboard: true });
  return { g, input };
}

const storm = (g: GameState): void =>
  void Object.assign(g.weather, { from: 'tempesta', to: 'tempesta', blend: 1, left: 999 });

describe('the waves', () => {
  it('are much higher in a storm than in calm weather', () => {
    const peak = (w: typeof CALM): number =>
      Math.max(...Array.from({ length: 200 }, (_, i) => waveHeight(i * 7, 3, w)));
    expect(peak(STORM)).toBeGreaterThan(peak(CALM) * 5);
    expect(peak(STORM)).toBeGreaterThan(12); // two metres and more
  });

  it('a short hull pitches on every wave, a long ship rides them slow and heavy', () => {
    let short = 0;
    let long = 0;
    for (let t = 0; t < 20; t += 0.25) {
      short = Math.max(short, Math.abs(rideWaves(500, 60, 1, t, STORM).pitch));
      long = Math.max(long, Math.abs(rideWaves(500, 540, 1, t, STORM).pitch));
    }
    expect(short).toBeGreaterThan(long * 3);
  });

  it('the currents hold the small boats back most; deep down a diver no longer feels them', () => {
    expect(currentMult('boat', STORM)).toBeLessThan(currentMult('ship', STORM));
    expect(currentMult('boat', CALM)).toBe(1);
    expect(diverCurrentMult(2, STORM)).toBeLessThan(1);
    expect(diverCurrentMult(40, STORM)).toBe(1);
    expect(currentMult('ship', CALM_SEA)).toBe(1);
  });
});

describe('the small boats in a storm', () => {
  it('a storm slows the boat down', () => {
    const { g, input } = boatOut();
    input.helm.throttle = 1;
    run(g, 6, input);
    const calm = g.boat.speed;
    storm(g);
    run(g, 6, input);
    expect(g.boat.speed).toBeLessThan(calm * 0.7);
    expect(calm).toBeCloseTo(boatTopSpeed(g.boat), 0);
  });

  it('fast through a storm its hull wears; gone, it goes back broken to the hold; a harbour mends it; saved', () => {
    const { g, input } = boatOut();
    const m = boatModelById(g.boat.model);
    input.helm.throttle = 1;
    run(g, 3, input);
    expect(g.boat.hull).toBe(m.hull); // calm: nothing
    storm(g);
    g.boat.hull = 2;
    const ev = run(g, 5, input);
    expect(ev.some((e) => e.type === 'boatWrecked')).toBe(true);
    expect(g.boat).toMatchObject({ bay: 'docked', aboard: false });
    expect(g.ship.aboard).toBe(true);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.boat.hull).toBe(0);
    g.port = PORTO_FANGO;
    enterPort(g, []);
    expect(g.boat.hull).toBe(m.hull);
  });

  it('still, you dive off it and climb back on', () => {
    const { g, input } = boatOut();
    expect(canDiveFromBoat(g)).toBe(true);
    input.helmCmd = 'dive';
    run(g, DT, input);
    expect(g.boat.aboard).toBe(false);
    expect(Math.abs(g.diver.x - g.boat.x)).toBeLessThan(60); // in the water by it
    expect(canBoardBoat(g)).toBe(true);
    input.action = true;
    run(g, DT, input);
    expect(g.boat.aboard).toBe(true);
  });

  it('the sail step keeps a calm sea with no weather given', () => {
    const { g } = boatOut();
    const ev: GameEvent[] = [];
    sailBoat(g, { throttle: 1, dir: 1, dive: 0 }, 1, ev);
    expect(g.boat.hull).toBe(boatModelById(g.boat.model).hull);
  });
});

describe('the water’s clarity', () => {
  it('each stretch of sea has its own cycle: some clear while others are murky', () => {
    const xs = Array.from({ length: 20 }, (_, i) => 60000 + i * CLARITY.zoneKm * 1000 * WORLD.unitsPerMetre);
    const now = xs.map((x) => cycleMurk(x, 100));
    expect(Math.max(...now)).toBeGreaterThan(0.2);
    expect(Math.min(...now)).toBe(0);
    // and one stretch changes with time
    const one = Array.from({ length: 60 }, (_, i) => cycleMurk(xs[0]!, i * 20));
    expect(Math.max(...one) - Math.min(...one)).toBeGreaterThan(0.3);
  });

  it('a storm stirs the water up; the Delta is always murky; above the water it is clear', () => {
    const x = 60000;
    expect(turbidityAt(x, WORLD.surfaceY + 50, 0, STORM)).toBeGreaterThan(
      turbidityAt(x, WORLD.surfaceY + 50, 0, CALM),
    );
    const mid = (DELTA.x0 + DELTA.x1) / 2;
    expect(turbidityAt(mid, WORLD.surfaceY + 50, 0, CALM)).toBe(1);
    expect(turbidityAt(x, WORLD.surfaceY - 5, 0, STORM)).toBe(0);
  });

  it('at its murkiest the beasts away from your light are dark shapes', () => {
    expect(isShape(0.9, CLARITY.shapesBeyond + 10)).toBe(true);
    expect(isShape(0.9, 10)).toBe(false);
    expect(isShape(0.1, 500)).toBe(false);
  });
});
