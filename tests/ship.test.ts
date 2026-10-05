// The expedition ship (owner's decisions of 4 ottobre 2026): Aurelio's gift at the end of chapter 4 with the
// submarine in its hold; levers (the throttle stays where you leave it); the hatch opens only with the ship still,
// and open it does not move; the submarine slides down the ramp to mid-water and docks only in front of the
// hatch; the ship breaks the ice and never gets stuck; it sails from Porto Fango east to the end of the sea with
// nothing in the way (5 ottobre: no icebergs, no far lane); saved (v14).
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { SHIP } from '../src/data/ship';
import { TILE, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, currentAction, stepGame, toSave, type GameState } from '../src/systems/game';
import { knotsOf, stepHeading } from '../src/systems/helm';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { migrate, parseSave } from '../src/systems/save/saveData';
import { dockPoint, holdPoint } from '../src/systems/ship/geometry';
import { newShip, sailShip, sonarActive, type ShipWorld } from '../src/systems/ship/ship';
import { iceIn, SEA_END_X, SHIP_WEST_X } from '../src/systems/ship/surface';
import { ENDLESS } from '../src/data/endless';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;

/** The levers stay where you leave them: one input object kept across steps, like the touch levers. */
function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}
const press = (g: GameState, input: InputState = emptyInput()): GameEvent[] => {
  input.action = true;
  return run(g, DT, input);
};
const cmd = (g: GameState, c: 'hatch' | 'launch' | 'dive', input: InputState): GameEvent[] => {
  input.helmCmd = c;
  return run(g, DT, input);
};

/** After chapter 4: the ship is yours, the submarine in its hold, and you are at the helm. */
function atTheHelm(x = 20000 /* open sea, before any ice */): { g: GameState; input: InputState } {
  const g = createGame(map, null, 4);
  g.story.step = 'chapter1Done';
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
  run(g, DT);
  g.story.step = 'chapter4Done';
  run(g, DT);
  g.ship.x = x;
  Object.assign(g.diver, { x, y: WORLD.surfaceY + 6, vx: 0, vy: 0 });
  const input = emptyInput();
  expect(currentAction(g)).toBe('abordo');
  press(g, input);
  expect(g.ship.aboard).toBe(true);
  return { g, input };
}

describe('la nave da spedizione', () => {
  it('arriva a fine capitolo 4 con il sottomarino nella stiva', () => {
    const g = createGame(map, null, 4);
    g.story.step = 'chapter1Done';
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
    run(g, DT);
    expect(g.ship.owned).toBe(false);
    g.story.step = 'chapter4Done';
    const ev = run(g, DT);
    expect(g.ship.owned).toBe(true);
    expect(g.ship.bay).toBe('docked');
    expect(ev.some((e) => e.type === 'shipGiven')).toBe(true);
  });

  it('al timone il gas resta dove lo lasci: accelera piano fino alla velocità massima (~24 nodi)', () => {
    const { g, input } = atTheHelm();
    input.helm.throttle = 1;
    run(g, 1, input);
    expect(g.ship.speed).toBeGreaterThan(0);
    expect(g.ship.speed).toBeLessThan(SHIP.maxSpeed / 2); // heavy: it takes time
    run(g, 12, input);
    expect(g.ship.speed).toBeCloseTo(SHIP.maxSpeed, 0);
    expect(knotsOf(SHIP.maxSpeed)).toBeCloseTo(24, 0);
    // throttle down: it coasts, it does not stop at once
    input.helm.throttle = 0;
    run(g, 1, input);
    expect(g.ship.speed).toBeGreaterThan(SHIP.maxSpeed / 2);
  });

  it('la leva della direzione al contrario frena, e da ferma la nave si gira', () => {
    const rates = { ...SHIP };
    let h = { face: 1 as 1 | -1, speed: 100 };
    const helm = { throttle: 1, dir: -1 as const, dive: 0 };
    for (let t = 0; t < 1; t += DT) h = stepHeading(h.face, h.speed, helm, 200, rates, DT);
    expect(h.face).toBe(1); // still going east, slower
    expect(h.speed).toBeLessThan(100);
    for (let t = 0; t < 5; t += DT) h = stepHeading(h.face, h.speed, helm, 200, rates, DT);
    expect(h.face).toBe(-1);
    expect(h.speed).toBeGreaterThan(0); // now west
  });

  it('il portellone si apre solo a nave ferma; aperto, la nave non si muove', () => {
    const { g, input } = atTheHelm();
    input.helm.throttle = 1;
    run(g, 2, input);
    const ev = cmd(g, 'hatch', input);
    expect(g.ship.hatchOpen).toBe(false);
    expect(ev.some((e) => e.type === 'shipHint')).toBe(true);
    input.helm.throttle = 0;
    run(g, 15, input);
    expect(g.ship.speed).toBe(0);
    cmd(g, 'hatch', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    expect(g.ship.hatch).toBe(1);
    const x = g.ship.x;
    input.helm.throttle = 1;
    run(g, 3, input);
    expect(g.ship.x).toBe(x);
  });

  it('cala il sottomarino a mezz’acqua, e si riaggancia solo davanti al portellone', () => {
    const { g, input } = atTheHelm();
    cmd(g, 'hatch', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    cmd(g, 'launch', input);
    expect(g.ship.bay).toBe('launching');
    expect(currentAction(g)).toBe(null); // on the ramp: nothing to press
    run(g, SHIP.launchSeconds + 0.1, input);
    expect(g.ship.bay).toBe('out');
    expect(g.sub.aboard).toBe(true);
    const p = dockPoint(g.ship);
    expect(Math.hypot(g.sub.x - p.x, g.sub.y - p.y)).toBeLessThan(1);
    expect(currentAction(g)).toBe('aggancia');
    // away from the hatch: no docking
    input.helm.throttle = 1;
    run(g, 2, input);
    expect(currentAction(g)).not.toBe('aggancia');
    // back in front of it
    Object.assign(g.sub, { x: p.x + 5, y: p.y, vx: 0, vy: 0 });
    input.helm.throttle = 0;
    expect(currentAction(g)).toBe('aggancia');
    press(g, input);
    run(g, SHIP.launchSeconds + 1, input);
    expect(g.ship.bay).toBe('docked');
    expect(g.ship.aboard).toBe(true);
    expect(g.sub.aboard).toBe(false);
  });

  it('si riaggancia anche appena sotto il portellone, non solo a mezz’acqua (5 ottobre)', () => {
    const { g, input } = atTheHelm();
    cmd(g, 'hatch', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    cmd(g, 'launch', input);
    run(g, SHIP.launchSeconds + 0.1, input);
    const top = holdPoint(g.ship).y;
    for (const y of [top + 4, (top + dockPoint(g.ship).y) / 2]) {
      Object.assign(g.sub, { x: dockPoint(g.ship).x - 10, y, vx: 0, vy: 0 });
      expect(currentAction(g), `y ${y}`).toBe('aggancia');
    }
  });

  it('agganciando, il sottomarino scivola fino alla rampa: niente salti (5 ottobre)', () => {
    const { g, input } = atTheHelm();
    cmd(g, 'hatch', input);
    run(g, SHIP.hatchSeconds + 0.1, input);
    cmd(g, 'launch', input);
    run(g, SHIP.launchSeconds + 0.1, input);
    const p = dockPoint(g.ship);
    Object.assign(g.sub, { x: p.x - 30, y: p.y + 20, vx: 0, vy: 0 });
    expect(currentAction(g)).toBe('aggancia');
    let prev = { x: g.sub.x, y: g.sub.y };
    press(g, input);
    for (let t = 0; t < SHIP.launchSeconds + 2; t += DT) {
      run(g, DT, input);
      // each step a small move, never a jump
      expect(Math.hypot(g.sub.x - prev.x, g.sub.y - prev.y)).toBeLessThan(5);
      prev = { x: g.sub.x, y: g.sub.y };
    }
    expect(g.ship.bay).toBe('docked');
    expect(g.ship.aboard).toBe(true);
  });

  it('il sonar si accende e spegne, e sente solo sotto 10 nodi', () => {
    const { g, input } = atTheHelm();
    expect(g.ship.sonarOn).toBe(false);
    input.helmCmd = 'sonar';
    let ev = run(g, 3, input);
    expect(g.ship.sonarOn).toBe(true);
    expect(sonarActive(g.ship)).toBe(true);
    expect(ev.some((e) => e.type === 'sonarPing')).toBe(true);
    input.helm.throttle = 1;
    run(g, 12, input);
    expect(knotsOf(g.ship.speed)).toBeGreaterThan(SHIP.sonar.maxKnots);
    expect(sonarActive(g.ship)).toBe(false);
    ev = run(g, 3, input);
    expect(ev.some((e) => e.type === 'sonarPing')).toBe(false);
  });

  it('tuffati e risali a bordo dall’acqua', () => {
    const { g, input } = atTheHelm();
    cmd(g, 'dive', input);
    expect(g.ship.aboard).toBe(false);
    expect(g.diver.y).toBeGreaterThan(WORLD.surfaceY);
    expect(currentAction(g)).toBe('abordo');
  });

  it('attracca al porto: dal timone compare Porto', () => {
    const { g, input } = atTheHelm(PORTO_FANGO.shipDock);
    run(g, DT, input);
    expect(currentAction(g)).toBe('porto');
    expect(g.port?.id).toBe(PORTO_FANGO.id);
  });

  it('salvata e ricaricata, è dove l’hai lasciata (v14)', () => {
    const { g } = atTheHelm(20000);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship).toMatchObject({ owned: true, x: 20000, bay: 'docked', aboard: true });
    const old = migrate({ game: 'leviatano', version: 13 }) as { ship: unknown };
    expect(old.ship).toBeNull();
  });
});

describe('la nave non si blocca mai', () => {
  /** Only the ship, at full throttle, on the real map (fast: no beasts, no fish). */
  function sail(x: number, face: 1 | -1, seconds: number, goal = Infinity, dt = 1 / 15) {
    const g: ShipWorld = {
      ship: {
        ...newShip({ x, face, hatchOpen: false, bay: 'docked', aboard: true, fuel: 1e9, upgrades: [] }),
      },
      map,
      story: { step: 'chapter4Done' },
      sub: { owned: true, aboard: false },
      diver: { x, y: 0, vx: 0, vy: 0, face },
    };
    const helm = { throttle: 1, dir: face, dive: 0 };
    const events: GameEvent[] = [];
    const lanes: { x: number; speed: number }[] = [];
    let stalled = 0;
    for (let t = 0; t < seconds && g.ship.x < goal; t += dt) {
      const before = g.ship.x;
      sailShip(g, helm, dt, events, () => true);
      lanes.push({ x: g.ship.x, speed: g.ship.speed });
      stalled = g.ship.x === before ? stalled + dt : 0;
      if (stalled > 3) break;
    }
    return { g, events, lanes };
  }

  it('da Porto Fango a 30 km verso est: mare libero, senza mai fermarsi', { timeout: 60000 }, () => {
    // the sea ends 30 km from the beach: the ship gets there, to the last metre
    const goal = SEA_END_X - SHIP.length / 2 - 1;
    const { g, events } = sail(PORTO_FANGO.shipDock, 1, 1200, goal);
    expect(g.ship.x).toBeGreaterThan(goal);
    for (let i = 0; i < 30; i++) sailShip(g, { throttle: 1, dir: 1, dive: 0 }, 1 / 15, events, () => true);
    expect(events.some((e) => e.type === 'seaEnd')).toBe(true);
  });

  it('a ovest non va oltre Porto Fango, e lo dice', () => {
    const { g, events } = sail(PORTO_FANGO.shipDock + 300, -1, 30);
    expect(events.some((e) => e.type === 'shipWest')).toBe(true);
    expect(g.ship.x).toBe(SHIP_WEST_X);
  });

  it('nel ghiaccio rallenta e lo rompe; il canale si richiude solo lontano', () => {
    // an ice field of the Banchisa
    let at = 0;
    for (let x = ENDLESS.startX; x < 400000 && !at; x += 50)
      if (Array.from({ length: 10 }, (_, i) => x + i * 20).every((c) => iceIn(map, c, c + 20))) at = x;
    expect(at).toBeGreaterThan(0);
    const { g, events, lanes } = sail(at - 700, 1, 12);
    expect(events.some((e) => e.type === 'iceCracked')).toBe(true);
    // in the middle of the ice field it goes at a fraction of its speed
    const inIce = lanes.filter((l) => l.x + SHIP.length / 2 > at + 130 && l.x + SHIP.length / 2 < at + 200);
    expect(inIce.length).toBeGreaterThan(0);
    for (const l of inIce) expect(l.speed).toBeLessThanOrEqual(SHIP.maxSpeed * SHIP.iceMult + 1);
    const broken = [...g.ship.broken];
    expect(broken.length).toBeGreaterThan(0);
    const { tx, ty } = map.tileOf(broken[0]!.i);
    expect(map.get(tx, ty)).toBe(TILE.water);
    // time passes but you are near: it stays open; far away: it freezes again
    const stay: GameEvent[] = [];
    const near = { ...g, ship: { ...g.ship, speed: 0, broken } };
    for (let t = 0; t < SHIP.refreezeSeconds + 5; t += 0.5) sailShip(near, null, 0.5, stay, () => false);
    expect(map.get(tx, ty)).toBe(TILE.water);
    sailShip(near, null, 0.5, stay, () => true);
    expect(map.get(tx, ty)).toBe(TILE.ice);
  });
});
