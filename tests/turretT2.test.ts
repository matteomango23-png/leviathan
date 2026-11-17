// The turret under the water, step T2 (owner, 17 novembre 2026: "deve funzionare anche sott'acqua… si vede lo scafo da
// sotto… in modo abbastanza sommario 3D"): the rough 3D hulls, a U-Boat diving in the duel with only its torpedoes
// working under the water, the guided torpedo following the turret's aim, the enemy's charges and torpedoes.
import { beforeAll, describe, expect, it } from 'vitest';
import { TORPEDO_GUIDE, TURRET, UNDERWATER } from '../src/data/turret';
import { setUpArena } from '../src/systems/company/arena';
import { metres } from '../src/systems/company/enemyState';
import { createGame } from '../src/systems/game';
import { placeV3, shipHull3d } from '../src/systems/turret/hull3d';
import { enemyModel } from '../src/systems/turret/hullModels';
import {
  eyeHeight,
  gunsUp,
  hullOf,
  openDuel,
  restingInput,
  stepDuel,
  yourMaxDepth,
} from '../src/systems/turret/duel';
import { foeFromYou } from '../src/systems/turret/duelState';
import { dropCharge, launchTorpedo, stepUnder } from '../src/systems/turret/torpedo';
import { horizonY, project } from '../src/systems/turret/projection';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const arena = (ship: string, enemies: 'baleniera' | 'caccia' | 'uboot', dist = 120) => {
  const g = createGame(map, null, 4);
  setUpArena(g, { ship, enemies, night: false, weather: 'sereno', turret: true });
  g.company.enemies[0]!.x = g.ship.x + metres(dist);
  return g;
};

describe('gli scafi in 3D', () => {
  it('lo scafo è lungo quanto la nave, la chiglia sotto l’acqua, la prua più stretta del centro', () => {
    const faces = shipHull3d(30, 3, 4);
    const pts = faces.flatMap((f) => f.pts);
    const xs = pts.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(30, 0);
    expect(Math.min(...pts.map((p) => p.z))).toBeLessThan(-3);
    const widthAt = (x: number): number =>
      Math.max(...pts.filter((p) => Math.abs(p.x - x) < 0.1).map((p) => Math.abs(p.y)));
    expect(widthAt(15)).toBeLessThan(widthAt(0) / 2);
  });

  it('l’U-Boot è tutto sott’acqua alla sua quota', () => {
    const faces = enemyModel('uboot', 70).faces;
    const zs = faces.flatMap((f) => f.pts.map((v) => placeV3(v, 0, 0, 0, 30).z));
    expect(Math.max(...zs)).toBeLessThan(0);
  });
});

describe('scendere con l’U-Boot', () => {
  it('solo gli U-Boot scendono, fino al loro limite; sott’acqua mitragliatrice e cannone tacciono', () => {
    const ship = arena('aurelia', 'baleniera');
    expect(yourMaxDepth(ship)).toBe(0);
    const g = arena('stormtrooper', 'baleniera');
    expect(yourMaxDepth(g)).toBe(UNDERWATER.maxDepthM);
    const d = openDuel(g, g.company.enemies[0]!);
    for (let i = 0; i < 200; i++) stepDuel(g, d, { ...restingInput(), dive: 1 }, 0.05);
    expect(d.you.depth).toBeGreaterThan(UNDERWATER.periscopeM);
    expect(gunsUp(d)).toBe(false);
    expect(eyeHeight(d)).toBeLessThan(0);
    const before = d.rounds.length;
    stepDuel(g, d, { ...restingInput(), firing: true, gunShot: true }, 0.05);
    expect(d.rounds.length).toBe(before);
  });

  it('da sotto, la superficie si vede sopra l’orizzonte', () => {
    const cam = { yaw: 0, pitch: 0, height: -20, roll: 0, w: 800, h: 400 };
    const surface = project(cam, { a: 60, s: 0, z: 0 })!;
    expect(surface.y).toBeLessThan(horizonY(cam));
  });
});

describe('il siluro guidato', () => {
  it('curva verso la linea del mirino, ma non più svelto di quanto può', () => {
    const g = arena('stormtrooper', 'baleniera');
    const d = openDuel(g, g.company.enemies[0]!);
    launchTorpedo(d, 'you', { a: 0, s: 0, z: -3 }, 0, 0);
    const far = hullOf('aurelia', 9999, 9999, 0);
    const aim = { yaw: 1, pitch: 0, from: { a: 0, s: 0, z: -3 } };
    stepUnder(d, far, far, aim, 0.1);
    expect(d.torpedoes[0]!.yaw).toBeCloseTo(TORPEDO_GUIDE.turn * 0.1, 3);
    for (let i = 0; i < 60; i++) stepUnder(d, far, far, aim, 0.1);
    // on the line now: its bearing from you is the aim's
    const p = d.torpedoes[0]!.p;
    expect(Math.atan2(p.s, p.a)).toBeCloseTo(1, 1);
    expect(p.z).toBeLessThan(0);
  });

  it('puntato sulla nave la colpisce sotto la linea di galleggiamento: grande falla', () => {
    const g = arena('stormtrooper', 'baleniera', 90);
    const e = g.company.enemies[0]!;
    const d = openDuel(g, e);
    const flood0 = e.dmg.flood;
    stepDuel(g, d, { ...restingInput(), torpedo: true }, 0.05);
    expect(d.torpedoes.length).toBe(1);
    for (let i = 0; i < 400 && d.torpedoes.length; i++) {
      const rel = foeFromYou(d);
      d.yaw = Math.atan2(rel.s, rel.a);
      d.pitch = 0;
      stepDuel(g, d, restingInput(), 0.05);
    }
    expect(e.dmg.flood).toBeGreaterThanOrEqual(flood0 + TORPEDO_GUIDE.flood - 1e-6);
  });

  it('uno alla volta', () => {
    const g = arena('stormtrooper', 'baleniera');
    const d = openDuel(g, g.company.enemies[0]!);
    stepDuel(g, d, { ...restingInput(), torpedo: true }, 0.05);
    stepDuel(g, d, { ...restingInput(), torpedo: true }, 0.05);
    expect(d.torpedoes.filter((t) => t.from === 'you').length).toBe(1);
  });
});

describe('il nemico sott’acqua', () => {
  it('la baleniera non spara a chi è sotto i 5 m', () => {
    const g = arena('stormtrooper', 'baleniera', 100);
    const d = openDuel(g, g.company.enemies[0]!);
    d.you.depth = 20;
    for (let i = 0; i < 300; i++) stepDuel(g, d, restingInput(), 0.05);
    expect(d.rounds.filter((r) => r.from === 'foe').length).toBe(0);
  });

  it('la carica scoppia alla tua quota e ti colpisce se sei lì', () => {
    const g = arena('stormtrooper', 'caccia', 100);
    const d = openDuel(g, g.company.enemies[0]!);
    d.you.depth = 20;
    dropCharge(d, { a: d.you.a, s: d.you.s, z: 0 }, -20);
    const you = hullOf(g.ship.model, d.you.a, d.you.s, 0, 20);
    const ev = [];
    for (let i = 0; i < 100 && d.charges.length; i++)
      ev.push(
        ...stepUnder(
          d,
          hullOf('eh2', 9999, 0, 0),
          you,
          { yaw: 0, pitch: 0, from: { a: 0, s: 0, z: 0 } },
          0.05,
        ),
      );
    const burst = ev.find((e) => e.type === 'chargeBurst')!;
    expect(burst).toMatchObject({ hit: true });
    expect(burst.p.z).toBeLessThanOrEqual(-20);
  });

  it('l’U-Boot nemico naviga sott’acqua e ti lancia siluri', () => {
    const g = arena('stormtrooper', 'uboot', 150);
    const d = openDuel(g, g.company.enemies[0]!);
    expect(d.foe.depth).toBeGreaterThan(TURRET.height);
    let launched = false;
    for (let i = 0; i < 400 && !launched; i++) {
      stepDuel(g, d, restingInput(), 0.05);
      launched = d.torpedoes.some((t) => t.from === 'foe');
    }
    expect(launched).toBe(true);
  });
});
