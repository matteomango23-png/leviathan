// The naval arena, step A1 (owner, 17 novembre 2026; docs/PROPOSTA-COMPAGNIA.md): the Compagnia's whaler finds you
// by sight and sound (lights, night, Silence, depth), hunts and shoots; your cannon sinks it; Silence on the ⏻ button.
import { beforeAll, describe, expect, it } from 'vitest';
import { DETECTION, ENEMY_CLASSES, SILENCE, WEAPONS } from '../src/data/company';
import { SHIP_MODELS } from '../src/data/fleet';
import { SUB_MODELS } from '../src/data/submarine';
import { BOAT_MODELS } from '../src/data/boats';
import { setUpArena } from '../src/systems/company/arena';
import { perceive, stepAlert, type Quarry } from '../src/systems/company/detection';
import { metres, newCompany, spawnEnemy } from '../src/systems/company/enemyState';
import { lobAngle, stepShots } from '../src/systems/company/ordnance';
import { createGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import type { GameEvent } from '../src/systems/events';
import { shipTopSpeed } from '../src/systems/ship/model';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const whaler = ENEMY_CLASSES.baleniera;
const at = { x: 0, y: 30, depthM: 0 };
const you = (o: Partial<Quarry> = {}): Quarry => ({
  x: metres(150),
  y: 30,
  depthM: 0,
  speedShare: 0.5,
  engineOn: true,
  silent: false,
  lightsOn: false,
  ...o,
});

describe('come ti trovano', () => {
  it('vicino ti vede, lontano no', () => {
    expect(perceive(whaler, at, you(), 0)).toBeGreaterThan(0);
    expect(perceive(whaler, at, you({ x: metres(2000) }), 0)).toBe(0);
  });

  it('di notte a luci spente ti vede molto meno; con le luci accese ti vede da lontano', () => {
    const far = you({ x: metres(140), speedShare: 0, engineOn: false });
    expect(perceive(whaler, at, far, 1)).toBe(0);
    expect(perceive(whaler, at, { ...far, lightsOn: true }, 1)).toBeGreaterThan(0);
    expect(perceive(whaler, at, far, 0)).toBeGreaterThan(0);
  });

  it('in Silenzio, di notte, passi vicino senza farti sentire; a tutto motore ti sentono', () => {
    const q = you({ x: metres(100), silent: true, engineOn: false, speedShare: SILENCE.speedShare });
    expect(perceive(whaler, at, q, 1)).toBe(0);
    expect(perceive(whaler, at, { ...q, silent: false, engineOn: true, speedShare: 1 }, 1)).toBeGreaterThan(
      0,
    );
  });

  it('sott’acqua la baleniera non ti vede né ti sente; la nave da caccia ti sente', () => {
    const deep = you({ x: metres(100), y: 30 + metres(20), depthM: 20, speedShare: 1 });
    expect(perceive(whaler, at, deep, 0)).toBe(0);
    expect(perceive(ENEMY_CLASSES.caccia, at, deep, 0)).toBeGreaterThan(0);
  });

  it('tranquilla → sospetta → caccia → ti perde', () => {
    const c = newCompany();
    const e = spawnEnemy(c, 'baleniera', 0, 1);
    const phases: string[] = [];
    for (let i = 0; i < 200; i++) {
      const p = stepAlert(e, 0.8, { x: 100, y: 30 }, 0.1);
      if (p) phases.push(p);
    }
    expect(phases).toEqual(['suspicious', 'hunting']);
    for (let i = 0; i < (DETECTION.loseSeconds + 1) * 10; i++) stepAlert(e, 0, { x: 100, y: 30 }, 0.1);
    expect(e.phase).toBe('lost');
    for (let i = 0; i < 300; i++) stepAlert(e, 0, { x: 100, y: 30 }, 0.1);
    expect(e.phase).toBe('calm');
  });
});

describe('i colpi', () => {
  it('il tiro a parabola arriva dove punta, fuori portata no', () => {
    const w = WEAPONS.cannone;
    const v = metres(w.speed);
    const g = metres(w.gravity!);
    const a = { x: 0, y: 10 };
    const b = { x: metres(120), y: 30 };
    const ang = lobAngle(a, b, v, g)!;
    let x = a.x;
    let y = a.y;
    const vx = Math.cos(ang) * v;
    let vy = Math.sin(ang) * v;
    for (let i = 0; i < 2000 && x < b.x; i++) {
      vy += g / 120;
      x += vx / 120;
      y += vy / 120;
    }
    expect(Math.abs(y - b.y)).toBeLessThan(metres(3));
    expect(lobAngle(a, { x: metres(5000), y: 30 }, v, g)).toBeNull();
  });

  it('un colpo tocca solo l’altra parte e toglie i punti dei dati', () => {
    const c = newCompany();
    c.shots.push({ id: 1, weapon: 'cannone', from: 'you', x: 50, y: 50, vx: 0, vy: 0, left: 0, fuseY: 0 });
    let mine = 0;
    let theirs = 0;
    const box = { x0: 0, x1: 100, y0: 0, y1: 100 };
    const ev: GameEvent[] = [];
    stepShots(
      c,
      [
        { side: 'you', box, hit: (d) => (mine += d) },
        { side: 'enemy', box, hit: (d) => (theirs += d) },
      ],
      0.01,
      ev,
    );
    expect(mine).toBe(0);
    expect(theirs).toBe(WEAPONS.cannone.damage);
    expect(c.shots.length).toBe(0);
  });

  it('la carica scoppia alla sua quota, mai sotto la sua portata', () => {
    const c = newCompany();
    c.shots.push({
      id: 1,
      weapon: 'carica',
      from: 'enemy',
      x: 0,
      y: 30,
      vx: 0,
      vy: metres(7),
      left: 0,
      fuseY: 200,
    });
    const ev: GameEvent[] = [];
    for (let i = 0; i < 400 && c.shots.length; i++) stepShots(c, [], 0.05, ev);
    expect(ev.find((e) => e.type === 'shotBurst')).toBeDefined();
    const burst = ev.find((e) => e.type === 'shotBurst') as { y: number };
    expect(burst.y).toBeGreaterThanOrEqual(200);
    expect(burst.y).toBeLessThan(200 + metres(1));
  });
});

describe('le armi delle navi', () => {
  it('ogni nave madre ha un’arma; sottomarini e motoscafi no', () => {
    for (const m of SHIP_MODELS) expect(m.weapons.length, m.id).toBeGreaterThan(0);
    for (const m of [...SUB_MODELS, ...BOAT_MODELS]) expect('weapons' in m, m.id).toBe(false);
  });
});

describe('l’arena', () => {
  const arena = (night = false) => {
    const g = createGame(map, null, 4);
    setUpArena(g, { ship: 'aurelia', enemies: 'baleniera', night, weather: 'sereno', turret: false });
    return g;
  };

  it('Silenzio: il ⏻ col motore acceso spegne tutto, col gas vai a un terzo, niente avvio automatico', () => {
    const g = arena();
    const input = emptyInput();
    input.helm.throttle = 1;
    input.helm.dir = -1; // away from the whaler: nothing in the way
    for (let i = 0; i < 60; i++) stepGame(g, input, 0.05);
    expect(g.ship.engineOn).toBe(true);
    input.helmCmd = 'engine';
    stepGame(g, input, 0.05);
    input.helmCmd = null;
    expect(g.ship.silent).toBe(true);
    expect(g.ship.engineOn).toBe(false);
    for (let i = 0; i < 600; i++) stepGame(g, input, 0.05);
    expect(g.ship.engineOn).toBe(false);
    expect(g.ship.speed).toBeLessThanOrEqual(shipTopSpeed(g.ship) * SILENCE.speedShare + 0.01);
    expect(g.ship.speed).toBeGreaterThan(0);
    input.helmCmd = 'engine';
    stepGame(g, input, 0.05);
    expect(g.ship.silent).toBe(false);
    expect(g.ship.engineOn).toBe(true);
  });

  it('la baleniera ti trova se vai a motore, ti spara; il tuo cannone la affonda', () => {
    const g = arena();
    const input = emptyInput();
    input.helm.throttle = 1;
    input.helm.dir = 1;
    const seen: GameEvent[] = [];
    for (let i = 0; i < 1200 && !seen.some((e) => e.type === 'enemySunk'); i++) {
      input.helmCmd = i % 10 === 0 ? 'fire' : null;
      const e = g.company.enemies[0];
      // once near, it stops to fight
      if (e && Math.abs(e.x - g.ship.x) < metres(250)) input.helm.throttle = 0;
      seen.push(...stepGame(g, input, 0.05));
    }
    expect(seen.some((e) => e.type === 'enemyAlert' && e.phase === 'hunting')).toBe(true);
    expect(seen.some((e) => e.type === 'shotFired' && e.from === 'enemy')).toBe(true);
    expect(seen.some((e) => e.type === 'enemySunk')).toBe(true);
  });
});
