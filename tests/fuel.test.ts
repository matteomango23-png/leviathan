// Fuel, cures and the rescue flare (owner's decisions of 4 ottobre 2026): the ship and the submarine burn fuel only
// while their engine runs, more at full throttle; dry, they stop; fuel is bought at the harbours and moved between
// them in the cockpit; the flare tows you home for a share of your teeth. Nobody heals in the submarine: only on
// the ship and at the port; after blacking out you wake up on the ship. Saved (v15).
import { beforeAll, describe, expect, it } from 'vitest';
import { OUTPOSTS, PORTO_FANGO } from '../src/data/economy';
import { FUEL, RESCUE, SHIP } from '../src/data/ship';
import { SUB_MODELS, SUBMARINE } from '../src/data/submarine';
import { OPEN_SEA_X, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { buyFuel, canRefuel, litresFor, rescue, transferFuel } from '../src/systems/fuel';
import { blackout, createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { migrate, parseSave } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;
const KM = 1000 * WORLD.unitsPerMetre;

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

/** After chapter 4, at the helm of the ship in open water (the submarine in the hold). */
function atTheHelm(x = OPEN_SEA_X + 1200): { g: GameState; input: InputState } {
  const g = createGame(map, null, 4);
  g.story.step = 'chapter1Done';
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
  run(g, DT);
  g.story.step = 'chapter4Done';
  run(g, DT);
  g.ship.x = x;
  Object.assign(g.diver, { x, y: WORLD.surfaceY + 6, vx: 0, vy: 0 });
  const input = emptyInput();
  input.action = true;
  run(g, DT, input);
  expect(g.ship.aboard).toBe(true);
  return { g, input };
}

describe('carburante', () => {
  it('1 km a tutto gas costa perKm litri; più piano meno per km; a motore spento niente', () => {
    expect(litresFor(KM, 1, 10)).toBeCloseTo(10);
    expect(litresFor(KM, 0.3, 10)).toBeLessThan(10);
    expect(litresFor(KM, 0.3, 10)).toBeCloseTo(10 * (FUEL.idleShare + (1 - FUEL.idleShare) * 0.3));
    expect(litresFor(KM, 0, 10)).toBe(0);
  });

  it('la nave consuma navigando, e a secco si ferma e lo dice una volta sola', () => {
    const { g, input } = atTheHelm();
    const full = g.ship.fuel;
    expect(full).toBe(SHIP.fuel.tank);
    input.helm.throttle = 1;
    run(g, 8, input);
    expect(g.ship.fuel).toBeLessThan(full);
    g.ship.fuel = 0.01;
    const ev = run(g, 15, input);
    expect(ev.filter((e) => e.type === 'fuelOut').length).toBe(1);
    expect(g.ship.speed).toBe(0);
    const x = g.ship.x;
    run(g, 2, input);
    expect(g.ship.x).toBe(x);
  });

  it('il sottomarino a secco non si muove più', () => {
    const { g, input } = atTheHelm();
    input.helmCmd = 'hatch';
    run(g, SHIP.hatchSeconds + 0.2, input);
    input.helmCmd = 'launch';
    run(g, SHIP.launchSeconds + 0.2, input);
    expect(g.sub.aboard).toBe(true);
    g.sub.fuel = 0;
    input.helm.throttle = 1;
    const x = g.sub.x;
    const ev = run(g, 3, input);
    expect(ev.some((e) => e.type === 'fuelOut' && e.vehicle === 'sub')).toBe(true);
    expect(Math.abs(g.sub.x - x)).toBeLessThan(1);
  });

  it('nel cockpit si travasa solo con il sottomarino nella stiva, senza traboccare', () => {
    const { g } = atTheHelm();
    g.sub.fuel = 10;
    const before = g.ship.fuel;
    expect(transferFuel(g, true)).toBe(FUEL.transferStep);
    expect(g.sub.fuel).toBe(10 + FUEL.transferStep);
    expect(g.ship.fuel).toBe(before - FUEL.transferStep);
    g.sub.fuel = SUB_MODELS[0]!.tank - 5;
    expect(transferFuel(g, true)).toBe(5);
    g.ship.bay = 'out';
    expect(transferFuel(g, false)).toBe(0);
  });

  it('al porto si fa il pieno solo se il mezzo è lì, e costa i denti giusti', () => {
    const { g, input } = atTheHelm(PORTO_FANGO.shipDock);
    run(g, DT, input);
    expect(g.port?.id).toBe(PORTO_FANGO.id);
    g.ship.fuel = 100;
    g.gear.teeth = 1000;
    const r = buyFuel(g, 'ship');
    expect(r.ok).toBe(true);
    expect(g.ship.fuel).toBe(SHIP.fuel.tank);
    expect(r.cost).toBe(Math.ceil((SHIP.fuel.tank - 100) * FUEL.pricePerLitre));
    expect(g.gear.teeth).toBe(1000 - r.cost);
    g.port = OUTPOSTS[0]!; // another harbour: the ship is not there
    expect(canRefuel(g, 'ship')).toBe(false);
    expect(buyFuel(g, 'ship').ok).toBe(false);
  });
});

describe('razzo di soccorso', () => {
  it('dal timone: la nave al porto più vicino, per un quarto dei denti', () => {
    const { g } = atTheHelm(OPEN_SEA_X + 1200);
    g.gear.teeth = 400;
    const ev: GameEvent[] = [];
    rescue(g, ev);
    expect(g.ship.x).toBe(PORTO_FANGO.shipDock); // the ship never goes to Portofosco (west of Porto Fango)
    expect(g.ship.aboard).toBe(true);
    expect(g.gear.teeth).toBe(400 - 400 * RESCUE.teethShare);
    expect(ev.some((e) => e.type === 'rescued')).toBe(true);
    g.gear.teeth = 30; // fewer than the minimum: all of them
    rescue(g, []);
    expect(g.gear.teeth).toBe(0);
  });

  it('dal sottomarino: nella stiva della nave; senza nave, a Portofosco', () => {
    const { g, input } = atTheHelm();
    input.helmCmd = 'hatch';
    run(g, SHIP.hatchSeconds + 0.2, input);
    input.helmCmd = 'launch';
    run(g, SHIP.launchSeconds + 0.2, input);
    g.sub.x += 3000;
    rescue(g, []);
    expect(g.ship.bay).toBe('docked');
    expect(g.ship.aboard).toBe(true);
    expect(g.sub.aboard).toBe(false);

    const lone = createGame(map, null, 4);
    lone.story.step = 'chapter1Done';
    giveTestBeast(lone, { speciesId: 'zanna', variant: 'comune' }, 8);
    run(lone, DT);
    Object.assign(lone.sub, { x: 3000, y: 200, aboard: true });
    rescue(lone, []);
    expect(lone.sub.x).toBe(SUBMARINE.mooredX);
  });
});

describe('cure solo sulla nave e al porto', () => {
  it('salendo sulla nave la squadra guarisce; svenuto ti risvegli al timone', () => {
    const { g, input } = atTheHelm();
    input.helmCmd = 'dive';
    run(g, DT, input);
    g.beasts.team[0]!.hp = 1;
    input.action = true;
    run(g, DT, input);
    expect(g.ship.aboard).toBe(true);
    expect(g.beasts.team[0]!.hp).toBeGreaterThan(1);
    input.helmCmd = 'dive';
    run(g, DT, input);
    const ev: GameEvent[] = [];
    blackout(g, ev);
    expect(g.ship.aboard).toBe(true);
    const out = ev.find((e) => e.type === 'blackout');
    expect(out && out.type === 'blackout' && out.place).toBe('sulla tua nave');
  });
});

describe('salvataggio v15', () => {
  it('il carburante resta; un salvataggio v14 trova i serbatoi pieni e perde il santuario', () => {
    const { g } = atTheHelm();
    g.ship.fuel = 123;
    g.sub.fuel = 45;
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship.fuel).toBe(123);
    expect(back.sub.fuel).toBe(45);
    const old = migrate({
      game: 'leviatano',
      version: 14,
      sanctuary: 2,
      sub: { x: 1, y: 2, model: 'batiscafo', models: ['batiscafo'], hull: 60 },
    }) as Record<string, unknown>;
    expect('sanctuary' in old).toBe(false);
  });
});
