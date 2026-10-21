// Lot AH (21 ottobre 2026): the diver on his own. His dash builds up and eases off instead of a jump to full speed,
// and a stamina bar like the mounts' limits it; an arrow on the edge of the screen points to the ship.
import { beforeAll, describe, expect, it } from 'vitest';
import { DIVER, SHIP_POINTER } from '../src/data/diver';
import { bay, WORLD } from '../src/data/worldLayout';
import { createDiver, stepDiver } from '../src/systems/diver';
import { diverStamina } from '../src/systems/diverStamina';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame } from '../src/systems/game';
import { consumePresses, emptyInput } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import { arrowTo, shipArrow } from '../src/systems/shipPointer';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const DT = 1 / 60;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('lo scatto del sub, graduale (proprietario: "più graduale, un po\' limitato")', () => {
  it('la spinta cresce, arriva in alto e poi torna piano alla sua andatura', () => {
    const d = createDiver(bay(900), WORLD.surfaceY + 150);
    const right = { ...emptyInput(), moveX: 1 };
    for (let i = 0; i < 60; i++) stepDiver(d, right, map, DT, makeRng(1), []);
    const pace = Math.hypot(d.vx, d.vy);
    stepDiver(d, { ...right, dash: true }, map, DT, makeRng(1), []);
    const first = Math.hypot(d.vx, d.vy);
    let top = first;
    let after = 0;
    for (let i = 0; i < 150; i++) {
      stepDiver(d, right, map, DT, makeRng(1), []);
      const s = Math.hypot(d.vx, d.vy);
      top = Math.max(top, s);
      if (i === 40) after = s; // a little after the dash ended
    }
    expect(first - pace).toBeLessThan(10); // no jump to full speed in one frame
    expect(top).toBeGreaterThan(DIVER.dash.speed * 0.85);
    expect(top).toBeLessThanOrEqual(DIVER.dash.speed + 0.01);
    expect(after).toBeGreaterThan(pace); // easing off, not cut short
    expect(Math.hypot(d.vx, d.vy)).toBeLessThan(pace + 2); // back to his pace
  });

  it('la resistenza: dopo circa quattro scatti è vuota, niente scatti finché non è di nuovo piena', () => {
    const g = createGame(map, null, 3);
    const input = emptyInput();
    const dashes = (): number => {
      let n = 0;
      for (let i = 0; i < 90; i++) {
        g.diver.o2 = g.diver.maxO2;
        if (i % 60 === 0) input.dash = true;
        const ev: GameEvent[] = stepGame(g, input, DT);
        consumePresses(input);
        n += ev.filter((e) => e.type === 'dash').length;
      }
      return n;
    };
    let done = 0;
    for (let k = 0; k < 10 && !diverStamina(g).worn; k++) done += dashes();
    expect(diverStamina(g).worn).toBe(true);
    // four, and one more for what came back between them
    expect(done).toBeGreaterThanOrEqual(DIVER.dash.dashes);
    expect(done).toBeLessThanOrEqual(DIVER.dash.dashes + 2);
    expect(dashes()).toBe(0); // worn out
    for (let t = 0; t < DIVER.dash.exhaustedSeconds + 1; t += 0.5) stepGame(g, emptyInput(), 0.5);
    expect(diverStamina(g).worn).toBe(false);
    expect(dashes()).toBeGreaterThan(0);
  });
});

describe('la freccia verso la nave (proprietario: "senza metri o profondità")', () => {
  const view = { x: 0, y: 0, width: 800, height: 400 };

  it('niente freccia se la nave è sullo schermo; sul bordo e nella sua direzione se è fuori', () => {
    expect(arrowTo({ x: 500, y: 200 }, view)).toBeNull();
    const right = arrowTo({ x: 5000, y: 200 }, view)!;
    expect(right.angle).toBeCloseTo(0);
    expect(right.x).toBeCloseTo(1 - SHIP_POINTER.edge);
    expect(right.y).toBeCloseTo(0.5);
    const upLeft = arrowTo({ x: -400, y: -2000 }, view)!;
    expect(upLeft.y).toBeCloseTo(SHIP_POINTER.edge);
    expect(upLeft.x).toBeLessThan(0.5);
    expect(upLeft.angle).toBeLessThan(-Math.PI / 2);
  });

  it("nel gioco: in acqua lontano dalla nave c'è, a bordo no", () => {
    const g = createGame(map, null, 3);
    g.beasts.view = { x: g.diver.x - 400, y: g.diver.y - 200, width: 800, height: 400 };
    g.diver.x += 5000;
    g.beasts.view.x += 5000;
    expect(shipArrow(g)).not.toBeNull();
    g.sub.aboard = true;
    expect(shipArrow(g)).toBeNull();
  });
});
