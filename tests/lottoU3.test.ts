// Lot U3 (owner, 12 novembre 2026): the arrow to the submarine you left, no swimming in the air by a hull, the
// beasts never pushed by the vehicles.
import { beforeAll, describe, expect, it } from 'vitest';
import { pushOutOfHull, type HullPart } from '../src/systems/hull';
import { createGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { arrowTo, shipArrow } from '../src/systems/shipPointer';
import { subHull } from '../src/systems/subState';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('la freccia', () => {
  it('indica il sottomarino lasciato in acqua, poi di nuovo la nave', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    Object.assign(g.ship, { aboard: false, bay: 'out' });
    Object.assign(g.sub, { aboard: false, x: g.ship.x - 3000, y: 300 });
    g.diver.x = g.ship.x + 3000;
    g.diver.y = 200;
    g.beasts.view = { x: g.diver.x - 200, y: 100, width: 400, height: 200 };
    expect(shipArrow(g)!.angle).toBeCloseTo(arrowTo(g.sub, g.beasts.view)!.angle);
    g.ship.bay = 'docked'; // back in the hold
    expect(shipArrow(g)!.angle).not.toBeCloseTo(arrowTo(g.sub, g.beasts.view)!.angle);
  });
});

describe('vicino a uno scafo', () => {
  it('una spinta verso l’alto si ferma alla superficie', () => {
    const hull: HullPart[] = [{ x: 0, y: 10, r: 12 }];
    const you = { x: 0, y: 4, vx: 0, vy: -20 };
    pushOutOfHull(hull, you, [{ dx: 0, dy: 0, r: 4 }], false, 0);
    expect(you.y).toBeGreaterThanOrEqual(0);
    expect(you.vy).toBeGreaterThanOrEqual(0);
  });

  it('le bestie non vengono spostate dai mezzi', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    Object.assign(g.ship, { aboard: false, bay: 'out' });
    Object.assign(g.sub, { aboard: false, x: 1500, y: 200 });
    const part = subHull(g.sub)[0]!;
    const w = g.beasts.wilds.find((x) => !x.spawn.hunt)!;
    Object.assign(w, { motion: 'roam', x: part.x, y: part.y, vx: 0, vy: 0 });
    g.diver.x = 1500;
    g.diver.y = 260;
    stepGame(g, emptyInput(), 1 / 60);
    expect(Math.hypot(w.x - part.x, w.y - part.y)).toBeLessThan(5); // it swims on, it is not shoved out
  });
});
