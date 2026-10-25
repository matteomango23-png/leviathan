// Lot C2 (24 ottobre 2026, the owner's notes): no ship into the land of Portofosco, a diving U-Boat bumps with its
// whole outline, the panoramas blend evenly at every border (the bay and the Delta first), the submarine's sonar
// sees rock and ice around it.
import { describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { LAYOUT, TILE, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { shipPoint } from '../src/systems/ship/geometry';
import { newShip, type ShipWorld } from '../src/systems/ship/ship';
import { sailShip } from '../src/systems/ship/sail';
import { SHIP_WEST_X } from '../src/systems/ship/surface';
import { hullBlocked } from '../src/systems/ship/uboat';
import { lookAt } from '../src/systems/seaLook';
import { sonarEdges } from '../src/systems/subSonar';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const DT = 1 / 30;

function whale(x: number, dive: number): ShipWorld {
  const ship = newShip({
    x,
    face: -1,
    hatches: [],
    bay: 'none',
    aboard: true,
    fuel: 1e9,
    model: 'whale',
    dive,
  });
  return {
    ship,
    map,
    sub: { owned: false, aboard: false },
    diver: { x, y: 0, vx: 0, vy: 0, face: -1, hp: 5, invulnerable: 0, dead: false, deadTime: 0 },
  };
}

describe('lotto C2', () => {
  it('sott’acqua l’U-Boot si ferma contro la costa con tutta la sagoma, mai dentro la roccia', () => {
    const w = whale(SHIP_WEST_X - 100, 120);
    const ev: GameEvent[] = [];
    for (let t = 0; t < 60; t += DT) sailShip(w, { throttle: 1, dir: -1, dive: 0 }, DT, ev, () => false);
    expect(w.ship.x).toBeGreaterThan(LAYOUT.shoreX); // never at Portofosco
    expect(hullBlocked(map, w.ship, w.ship.x, w.ship.dive)).toBe(false);
    // its tower (top of the picture) is checked too, not only the keel
    const top = shipPoint(w.ship, 0.5, 0.2);
    expect(map.solidAt(top.x, top.y)).toBe(false);
  });

  it('gli aspetti del mare non saltano mai, a nessun confine', () => {
    let prev: Record<string, number> | null = null;
    for (let x = 0; x < ENDLESS.maxX; x += 20) {
      const m = lookAt(x);
      const w: Record<string, number> = {};
      w[m.a] = (w[m.a] ?? 0) + 1 - m.t;
      w[m.b] = (w[m.b] ?? 0) + m.t;
      if (prev) {
        let d = 0;
        for (const k of new Set([...Object.keys(w), ...Object.keys(prev)]))
          d = Math.max(d, Math.abs((w[k] ?? 0) - (prev[k] ?? 0)));
        expect(d, `at ${x}`).toBeLessThan(0.12);
      }
      prev = w;
    }
  });

  it('il sonar del sottomarino vede pareti e fondale, in acqua libera niente', () => {
    // in the bay, just above its floor
    const x = 2400;
    const floor = map.floorBelow(x, WORLD.surfaceY + 8);
    const near = sonarEdges(map, x, floor - 30, 300, 28);
    expect(near.length).toBeGreaterThan(5);
    expect(near.some((e) => e.y > 0)).toBe(true); // the floor under it
    expect(map.tileAtPoint(x, floor + 4)).not.toBe(TILE.water);
    expect(sonarEdges(map, x, WORLD.surfaceY + 20, 40, 20)).toEqual([]);
  });
});
