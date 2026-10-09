// Block 4c (owner, 9 ottobre 2026): the U-Boats dive themselves. The dive lever takes them down to their model's
// depth, their hull stops against rock, their air runs out (a warning, then they rise by themselves), they slip under
// the ice sheet (an emergency rise breaks it), you swim out at depth and climb back in by the hull; saved.
import { describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { PORTO_FANGO } from '../src/data/economy';
import { SHIP } from '../src/data/ship';
import { WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { shipHull } from '../src/systems/ship/geometry';
import { canBoardShip, diveFromShip } from '../src/systems/ship/hatch';
import { shipModel } from '../src/systems/ship/model';
import { newShip, sailShip, type ShipWorld } from '../src/systems/ship/ship';
import { buyShip } from '../src/systems/ship/shipyard';
import { iceIn, SHIP_WEST_X } from '../src/systems/ship/surface';
import { maxDive, submerged } from '../src/systems/ship/uboat';
import { generateWorld } from '../src/systems/world/worldGen';
import { pushOutOfVehicles } from '../src/systems/vehicles';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();
const DT = 1 / 30;

function world(model: string, x: number, dive = 0): ShipWorld {
  const ship = newShip({ x, face: 1, hatches: [], bay: 'none', aboard: true, fuel: 1e9, model, dive });
  return { ship, map, sub: { owned: false, aboard: false }, diver: { x, y: 0, vx: 0, vy: 0, face: 1 } };
}
const run = (
  w: ShipWorld,
  s: number,
  helm: { throttle: number; dir: 1 | -1; dive: number },
  ev: GameEvent[] = [],
) => {
  for (let t = 0; t < s; t += DT) sailShip(w, helm, DT, ev, () => false);
  return ev;
};

/** Where the floor is deep under the open sea (deeper than the Stormtrooper dives). */
function deepWater(): number {
  for (let x = 20000; x < 400000; x += 200)
    if (map.floorBelow(x, WORLD.surfaceY + 10) - WORLD.surfaceY > 340 * WORLD.unitsPerMetre) return x;
  throw new Error('no deep water');
}

/** The start of an ice field. */
function iceField(): number {
  for (let x = ENDLESS.startX; x < 400000; x += 50)
    if (Array.from({ length: 10 }, (_, i) => x + i * 20).every((c) => iceIn(map, c, c + 20))) return x;
  throw new Error('no ice');
}

describe('the U-Boats dive', () => {
  it('Whale and Stormtrooper are sold, with their pictures and their dive', () => {
    for (const id of ['whale', 'stormtrooper']) {
      const m = shipModel({ model: id });
      expect(m.ready, id).toBe(true);
      expect(m.dive?.maxDepthM).toBeGreaterThan(0);
    }
  });

  it('the lever takes it down to its depth, no deeper; it holds it when you let go', () => {
    const w = world('whale', deepWater());
    const ev = run(w, 20, { throttle: 0, dir: 1, dive: 1 });
    expect(w.ship.dive).toBeCloseTo(maxDive(w.ship), 0);
    expect(ev.some((e) => e.type === 'diveTooDeep')).toBe(true);
    const d = w.ship.dive;
    run(w, 2, { throttle: 0, dir: 1, dive: 0 });
    expect(w.ship.dive).toBe(d);
    run(w, 30, { throttle: 0, dir: 1, dive: -1 });
    expect(w.ship.dive).toBe(0);
  });

  it('its whole hull stops against the floor', () => {
    const w = world('stormtrooper', PORTO_FANGO.shipDock + 600);
    run(w, 40, { throttle: 0, dir: 1, dive: 1 });
    for (const p of shipHull(w.ship)) expect(map.hitCircle(p.x, p.y, p.r * 0.9)).toBe(false);
  });

  it('its air runs out under water (a warning first), then it rises by itself and refills afloat', () => {
    const w = world('whale', deepWater(), 200);
    w.ship.air = SHIP.dive.warnAt + 1;
    const ev = run(w, 2, { throttle: 0, dir: 1, dive: 0 });
    expect(ev.some((e) => e.type === 'diveAir')).toBe(true);
    const more = run(w, SHIP.dive.warnAt + 2, { throttle: 0, dir: 1, dive: 1 });
    expect(more.some((e) => e.type === 'diveSurfacing')).toBe(true);
    run(w, 20, { throttle: 0, dir: 1, dive: 1 }); // the lever cannot keep it down, nor take it back under at once
    expect(submerged(w.ship)).toBe(false);
    run(w, 5, { throttle: 0, dir: 1, dive: 0 });
    expect(w.ship.air).toBeGreaterThan(5);
  });

  it('under water it slips beneath the ice sheet; out of air under it, it breaks through', () => {
    const at = iceField();
    const w = world('whale', at - 300, 80);
    const ev = run(w, 4, { throttle: 1, dir: 1, dive: 0 });
    expect(w.ship.x).toBeGreaterThan(at + 100);
    expect(ev.some((e) => e.type === 'iceCracked')).toBe(false);
    expect(iceIn(map, w.ship.x - 20, w.ship.x + 20)).toBe(true);
    w.ship.air = 0.01;
    const up = run(w, 6, { throttle: 0, dir: 1, dive: 0 });
    expect(up.some((e) => e.type === 'diveSurfacing')).toBe(true);
    expect(submerged(w.ship)).toBe(false);
  });

  it('at Porto Fango afloat it slows to the berth, the throttle lever going down with the speed', () => {
    const w = world('whale', PORTO_FANGO.shipDock + 900);
    w.ship.face = -1;
    const helm = { throttle: 1, dir: -1 as const, dive: 0 };
    let drop = 0;
    for (let t = 0; t < 60; t += DT) {
      const was = helm.throttle;
      sailShip(w, helm, DT, [], () => false);
      drop = Math.max(drop, was - helm.throttle);
    }
    expect(w.ship.speed).toBeLessThan(1);
    expect(helm.throttle).toBeLessThan(0.05);
    expect(drop).toBeLessThan(0.1); // gradually, never all at once
    expect(w.ship.x).toBeGreaterThanOrEqual(SHIP_WEST_X);
  });

  it('under water it passes beneath the pier of Porto Fango, on west (owner, 9 ottobre)', () => {
    const w = world('whale', PORTO_FANGO.shipDock + 400, 40);
    w.ship.face = -1;
    run(w, 25, { throttle: 1, dir: -1, dive: 0 });
    expect(w.ship.x).toBeLessThan(SHIP_WEST_X - 100);
  });

  it('a ship that is not a U-Boat never dives', () => {
    const w = world('eh1', 20000);
    run(w, 5, { throttle: 0, dir: 1, dive: 1 });
    expect(w.ship.dive).toBe(0);
  });

  it('beasts are not pushed by its hull (owner, 9 ottobre: it pressed them into the rock); you still are', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.port = PORTO_FANGO;
    g.gear.teeth = 100000;
    expect(buyShip(g, 'whale').ok).toBe(true);
    Object.assign(g.ship, { aboard: false, x: deepWater(), dive: 200 });
    const part = shipHull(g.ship)[0]!;
    const beast = { x: part.x, y: part.y, vx: 0, vy: 0 };
    pushOutOfVehicles(g, beast, [{ dx: 0, dy: 0, r: 8 }], true);
    expect(beast).toMatchObject({ x: part.x, y: part.y });
    const you = { x: part.x, y: part.y, vx: 0, vy: 0 };
    pushOutOfVehicles(g, you, [{ dx: 0, dy: 0, r: 8 }]);
    expect(Math.hypot(you.x - part.x, you.y - part.y)).toBeGreaterThan(1);
  });

  it('you swim out at its depth and climb back in by its hull; saved with its depth and air', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.port = PORTO_FANGO;
    g.gear.teeth = 100000;
    expect(buyShip(g, 'whale').ok).toBe(true);
    Object.assign(g.ship, { aboard: true, x: deepWater(), dive: 300, speed: 0, air: 100 });
    const ev: GameEvent[] = [];
    diveFromShip(g, ev);
    expect(g.ship.aboard).toBe(false);
    expect(g.diver.y).toBeGreaterThan(WORLD.surfaceY + 300);
    expect(canBoardShip(g)).toBe(true);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship).toMatchObject({ model: 'whale', dive: 300, air: 100 });
  });
});
