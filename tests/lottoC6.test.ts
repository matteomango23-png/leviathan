// Lot C6 (owner, 26 ottobre 2026): never stuck in the rock. The rescue flare brought a dived U-Boat to Porto Fango
// at its depth, inside the seabed (and its submarine with it): the game was lost. Now the ship comes in afloat, a
// save with something stuck is repaired on loading, and the pause menu has "Sono bloccato".
import { beforeAll, describe, expect, it } from 'vitest';
import { ABYSS_BUILD, ABYSS_PARTS } from '../src/data/abyss';
import { PORTO_FANGO } from '../src/data/economy';
import { WORLD } from '../src/data/worldLayout';
import { rescue } from '../src/systems/fuel';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { buyShip } from '../src/systems/ship/shipyard';
import { hullBlocked, submerged } from '../src/systems/ship/uboat';
import { freeVehicles, vehiclesStuck } from '../src/systems/ship/unstuck';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { landmarkSites } from '../src/systems/world/landmarks';
import { LANDMARKS } from '../src/data/landmarks';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

/** The abyssal ship bought at Porto Fango, you at its helm. */
function abyssal(): GameState {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  g.gear.teeth = ABYSS_BUILD.price;
  g.gear.abyssParts = ABYSS_PARTS.map((p) => p.id);
  expect(buyShip(g, ABYSS_BUILD.ship).ok).toBe(true);
  g.port = null;
  return g;
}

describe('mai bloccati nella roccia', () => {
  it('il razzo di soccorso porta un U-Boot immerso e rotto al molo, a galla, con il sottomarino nella stiva', () => {
    const g = abyssal();
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock + 30000, dive: 250, hull: 0, aboard: true });
    g.gear.teeth = 500;
    rescue(g, []);
    expect(g.ship.x).toBe(PORTO_FANGO.shipDock);
    expect(g.ship.dive).toBe(0);
    expect(submerged(g.ship)).toBe(false);
    expect(hullBlocked(map, g.ship, g.ship.x, g.ship.dive)).toBe(false);
    expect(g.ship.bay).toBe('docked');
    expect(g.ship.hatches.every((h) => !h.open)).toBe(true);
    expect(vehiclesStuck(g)).toBe(false);
  });

  it('una partita salvata con la nave dentro la roccia si carica con la nave al molo', () => {
    const g = abyssal();
    Object.assign(g.ship, { x: PORTO_FANGO.shipDock, dive: 300 });
    expect(vehiclesStuck(g)).toBe(true);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship.dive).toBe(0);
    expect(vehiclesStuck(back)).toBe(false);
  });

  it('il sottomarino fuori nella roccia torna nella stiva; "Sono bloccato" riporta sempre al molo', () => {
    const g = abyssal();
    g.ship.bay = 'out';
    Object.assign(g.sub, { x: PORTO_FANGO.shipDock, y: WORLD.surfaceY + 2000, aboard: true });
    expect(vehiclesStuck(g)).toBe(true);
    expect(freeVehicles(g)).toBe(true);
    expect(g.ship.bay).toBe('docked');
    expect(g.sub.aboard).toBe(false);
    g.ship.x += 5000;
    expect(freeVehicles(g, true)).toBe(true);
    expect(g.ship.x).toBe(PORTO_FANGO.shipDock);
  });
});

describe('i luoghi non hanno sacche chiuse', () => {
  it('ogni acqua attorno e dentro un luogo è raggiungibile da fuori; sotto il Grande Arco si passa', () => {
    const step = 4;
    for (const site of landmarkSites()) {
      const x0 = Math.min(...site.pieces.map((b) => b.left)) - 40;
      const x1 = Math.max(...site.pieces.map((b) => b.left + b.w)) + 40;
      const y0 = Math.min(...site.pieces.map((b) => b.top)) - 40;
      const y1 = site.ground + 10;
      const cols = Math.ceil((x1 - x0) / step);
      const rows = Math.ceil((y1 - y0) / step);
      const open = (c: number, r: number): boolean => !map.solidAt(x0 + c * step, y0 + r * step);
      const seen = new Uint8Array(cols * rows);
      const queue: number[] = [];
      for (let c = 0; c < cols; c++) for (const r of [0]) if (open(c, r)) queue.push(r * cols + c);
      for (let r = 0; r < rows; r++) for (const c of [0, cols - 1]) if (open(c, r)) queue.push(r * cols + c);
      for (const q of queue) seen[q] = 1;
      while (queue.length) {
        const q = queue.pop()!;
        const c = q % cols;
        const r = Math.floor(q / cols);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const n = nr * cols + nc;
          if (seen[n] || !open(nc, nr)) continue;
          seen[n] = 1;
          queue.push(n);
        }
      }
      // the pockets left unreached: only slits no diver (radius 4) fits in, between a hull and the floor
      let room = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (open(c, r) && !seen[r * cols + c] && !map.hitCircle(x0 + c * step, y0 + r * step, 4)) room++;
      expect(room, site.def.id).toBe(0);
      // its residents live in open water
      for (const res of LANDMARKS.find((l) => l.id === site.def.id)!.residents) {
        const hx = site.x + res.dxM * WORLD.unitsPerMetre;
        const hy = site.ground - res.upM * WORLD.unitsPerMetre;
        expect(map.solidAt(hx, hy), `${site.def.id} ${res.speciesId}`).toBe(false);
      }
    }
    // under the arch, from one side to the other, a diver gets through
    const arch = landmarkSites().find((x) => x.def.id === 'grande_arco')!;
    const y = arch.ground - 3 * WORLD.unitsPerMetre;
    let blocked = 0;
    for (let x = arch.x - 32; x <= arch.x + 32; x += 4) if (map.hitCircle(x, y, 4)) blocked++; // between its legs
    expect(blocked).toBe(0);
  });
});
