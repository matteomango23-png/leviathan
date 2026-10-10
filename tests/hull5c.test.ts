// Block 5c (owner, 10 ottobre 2026): the ships' hull (a U-Boat bumping rock, storms at full speed, giants ramming),
// broken down until mended at Porto Fango or with spare parts brought by the speedboat or the submarine; the
// surface radar and its parking-sensor beeps.
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { SHIP } from '../src/data/ship';
import { WEATHERS } from '../src/data/weather';
import { WORLD } from '../src/data/worldLayout';
import { spawnWild } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { rescue } from '../src/systems/fuel';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { obstacleAhead, radarContacts } from '../src/systems/ship/radar';
import { sailShip } from '../src/systems/ship/ship';
import { bumpShip, damageShip, hullMax, stepShipHull, stepShipRams } from '../src/systems/ship/shipHull';
import { loadParts, repairAtYard, unloadParts } from '../src/systems/ship/spareParts';
import { shipTopSpeed } from '../src/systems/ship/model';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function game(): GameState {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.ship.aboard = true;
  g.gear.teeth = 10000;
  return g;
}

describe('the ship’s hull', () => {
  it('a hard bump hurts, a gentle one does not, and not twice at once', () => {
    const g = game();
    const ev: GameEvent[] = [];
    const max = hullMax(g.ship);
    bumpShip(g.ship, SHIP.hull.bumpFrom - 1, ev);
    expect(g.ship.hull).toBe(max);
    bumpShip(g.ship, 100, ev);
    expect(g.ship.hull).toBeLessThan(max);
    const after = g.ship.hull;
    bumpShip(g.ship, 100, ev);
    expect(g.ship.hull).toBe(after);
    expect(ev.some((e) => e.type === 'shipDamaged')).toBe(true);
  });

  it('a storm at full speed wears it, a calm sea does not', () => {
    const g = game();
    const top = shipTopSpeed(g.ship);
    g.ship.speed = top;
    for (let t = 0; t < 30; t += 1) stepShipHull(g.ship, WEATHERS.sereno.look, top, 1, []);
    expect(g.ship.hull).toBe(hullMax(g.ship));
    for (let t = 0; t < 30; t += 1) stepShipHull(g.ship, WEATHERS.tempesta.look, top, 1, []);
    expect(g.ship.hull).toBeLessThan(hullMax(g.ship));
  });

  it('a giant hunter touching it rams it, then backs off', () => {
    const g = game();
    const w = g.beasts.wilds.find((b) => !b.spawn.endless)!;
    spawnWild(w, { speciesId: 'orca', variant: 'comune' }, 30, g.ship.x, WORLD.surfaceY + 10, 1);
    w.mood = 'chase';
    const ev: GameEvent[] = [];
    stepShipRams(g, ev);
    expect(g.ship.hull).toBeLessThan(hullMax(g.ship));
    expect(w.calm).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'shipRammed')).toBe(true);
  });

  it('broken down: no engine; the flare tows it to Porto Fango', () => {
    const g = game();
    g.ship.x = PORTO_FANGO.shipDock + 5000;
    const ev: GameEvent[] = [];
    damageShip(g.ship, 1e6, ev);
    expect(ev.some((e) => e.type === 'shipBroken')).toBe(true);
    for (let t = 0; t < 3; t += 0.1) sailShip(g, { throttle: 1, dir: 1, dive: 0 }, 0.1, ev, () => false);
    expect(g.ship.speed).toBe(0);
    expect(g.ship.engineOn).toBe(false);
    rescue(g, ev);
    expect(g.ship.x).toBe(PORTO_FANGO.shipDock);
  });
});

describe('mending it', () => {
  it('spare parts loaded on the speedboat at Porto Fango mend it when the boat is back in the hold', () => {
    const g = game();
    if (!g.boat.owned) return; // the first ship may have no speedboat: covered by the submarine below
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock });
    g.port = PORTO_FANGO;
    g.ship.hull = 10;
    const teeth = g.gear.teeth;
    expect(loadParts(g, 'boat').ok).toBe(true);
    expect(g.gear.teeth).toBeLessThan(teeth);
    const ev: GameEvent[] = [];
    unloadParts(g, ev);
    expect(g.ship.hull).toBeGreaterThan(10);
  });

  it('the submarine carries them too', () => {
    const g = game();
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock, bay: 'docked' });
    g.port = PORTO_FANGO;
    g.ship.hull = 10;
    expect(loadParts(g, 'sub').ok).toBe(true);
    expect(g.sub.parts).toBeGreaterThan(0);
    const ev: GameEvent[] = [];
    unloadParts(g, ev);
    expect(g.ship.hull).toBe(10 + SHIP.hull.partsSub);
    expect(ev.some((e) => e.type === 'shipMended')).toBe(true);
  });

  it('the yard mends it for teeth, only at Porto Fango', () => {
    const g = game();
    g.ship.hull = 20;
    g.port = null;
    expect(repairAtYard(g, []).ok).toBe(false);
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock });
    g.port = PORTO_FANGO;
    const teeth = g.gear.teeth;
    expect(repairAtYard(g, []).ok).toBe(true);
    expect(g.ship.hull).toBe(hullMax(g.ship));
    expect(g.gear.teeth).toBe(teeth - Math.ceil((hullMax(g.ship) - 20) * SHIP.hull.repairPerPoint));
  });

  it('the hull and the parts are saved; an old save starts whole', () => {
    const g = game();
    g.ship.hull = 33;
    g.sub.parts = 12;
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship.hull).toBe(33);
    expect(back.sub.parts).toBe(12);
    const raw = toSave(g, new Date());
    delete raw.ship!.hull;
    expect(createGame(map, parseSave(JSON.stringify(raw)), 4).ship.hull).toBe(hullMax(g.ship));
  });
});

describe('the surface radar', () => {
  it('sees the harbour pier close by; beeps only going fast towards an obstacle', () => {
    const g = game();
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock + 80, face: -1, speed: 0 });
    expect(radarContacts(g).some((c) => c.kind === 'port')).toBe(true);
    expect(obstacleAhead(g)).toBeNull(); // still
    g.ship.speed = shipTopSpeed(g.ship);
    expect(obstacleAhead(g)).not.toBeNull();
    g.ship.face = 1; // away from it
    g.ship.x = PORTO_FANGO.shipDock + 600;
    expect(obstacleAhead(g)).toBeNull();
  });
});
