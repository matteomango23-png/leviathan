// Lotto L (owner, 19 ottobre 2026): the surface like real water for a beast you ride. No wall: slowly it rides at
// the surface, at its pace it makes a little hop, sprinting a jump, with a dash the big leap; back in the water it
// slows without a jolt. Under the ship's hull it slides along a straight keel; in it, it is pushed under.
import { beforeAll, describe, expect, it } from 'vitest';
import { bay, WORLD } from '../src/data/worldLayout';
import { rideTop } from '../src/systems/breach';
import { createDiver, stepDiver } from '../src/systems/diver';
import type { GameEvent } from '../src/systems/events';
import { pushOutOfHull, type HullPart } from '../src/systems/hull';
import { emptyInput } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const SPEED = 55; // a white shark ridden, units/s
const DT = 1 / 60;
const S = WORLD.surfaceY;

/** Up from 5 m under the surface at `v` units/s, the stick held up (sprint or not; a dash at the start; or let go). */
export function climb(
  v: number,
  how: { sprint?: boolean; dash?: boolean; drift?: boolean } = {},
  seconds = 6,
): { topM: number; events: GameEvent[]; endY: number; endVy: number } {
  const d = createDiver(bay(1000), rideTop(S) + 5 * WORLD.unitsPerMetre);
  d.vy = -v;
  d.aim = -Math.PI / 2; // facing up
  const events: GameEvent[] = [];
  let top = d.y;
  const base = { ...emptyInput(), moveY: how.drift ? 0 : -1, dashHeld: !!how.sprint };
  for (let t = 0; t < seconds; t += DT) {
    // the dash: pressed once, on the way up (rideMotion.ts: its push rises and fades)
    const input = how.dash && t === 0 ? { ...base, dash: true } : base;
    stepDiver(d, input, map, DT, makeRng(1), events, {
      respawnAt: { x: bay(1000), y: 100 },
      mountSpeed: SPEED,
    });
    top = Math.min(top, d.y);
  }
  return { topM: (S - top) / WORLD.unitsPerMetre, events, endY: d.y, endVy: d.vy };
}

describe('la superficie come acqua vera', () => {
  it('niente muro: a velocità normale supera la vecchia riga e fa un saltino', () => {
    const r = climb(SPEED);
    expect(r.topM).toBeGreaterThan(-2); // the old wall held it 2 m under the surface
    expect(r.topM).toBeLessThan(1.5);
  });

  it('più veloce, più alto: sprint qualche metro, scatto il salto grande', () => {
    const slow = climb(20, { drift: true }, 3).topM; // coming up slowly, the stick let go
    const pace = climb(SPEED).topM;
    const sprint = climb(SPEED * 1.45, { sprint: true }).topM;
    const dash = climb(SPEED, { dash: true }).topM;
    console.log('altezze (m):', { slow, pace, sprint, dash });
    expect(slow).toBeLessThan(0.3);
    expect(pace).toBeGreaterThan(slow);
    expect(sprint).toBeGreaterThan(1.5);
    expect(sprint).toBeLessThan(4.5);
    expect(dash).toBeGreaterThan(sprint + 1.5); // the big leap (21 ottobre: its push, not a fixed speed)
    expect(dash).toBeLessThan(11);
  });

  it('tenendo su resta in superficie, senza oscillare per sempre', () => {
    const r = climb(SPEED, {}, 12);
    expect(Math.abs(r.endVy)).toBeLessThan(3);
    expect(r.endY).toBeGreaterThan(S); // in the water, its back out
    expect(r.endY).toBeLessThan(rideTop(S));
  });
});

describe('lo scafo della nave', () => {
  // a straight hull of linked circles, like ship/geometry.ts shipHull
  const hull: HullPart[] = Array.from({ length: 9 }, (_, k) => ({
    x: k * 20,
    y: S + 10,
    r: 10,
    link: k < 8,
  }));

  it('sotto lo scafo il fondo è dritto: una bestia che scorre resta alla stessa quota', () => {
    const ys: number[] = [];
    for (let x = 10; x <= 150; x += 3) {
      const b = { x, y: S + 30, vx: 0, vy: 0 };
      pushOutOfHull(hull, b, [{ dx: 0, dy: -6, r: 6 }]);
      ys.push(b.y);
    }
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.01);
  });

  it('una bestia dentro lo scafo viene spinta sotto, mai sopra', () => {
    const b = { x: 80, y: S + 6, vx: 0, vy: 0 };
    pushOutOfHull(hull, b, [{ dx: 0, dy: 0, r: 6 }], true);
    expect(b.y).toBeGreaterThan(S + 20);
  });
});
