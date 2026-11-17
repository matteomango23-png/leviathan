// Battle stations, step B1 (owner, 17 novembre 2026: "una modalità tipo armare la nave… zoom out abbastanza grosso…
// deve essere fighissima"): "Armi" with a vessel near or by itself when hunted, a fixed view that never zooms, the
// enemy keeping its distance, your aimed gun, its shots announced and dodged, the parts of the hull, slow motion.
import { beforeAll, describe, expect, it } from 'vitest';
import { BATTLE, ENEMY_CLASSES, HIT_ZONES, WEAPONS } from '../src/data/company';
import { setUpArena } from '../src/systems/company/arena';
import { canArm, timeScale } from '../src/systems/company/battle';
import { metres } from '../src/systems/company/enemyState';
import { applyHit, zoneOf } from '../src/systems/company/hullDamage';
import { shellPath } from '../src/systems/company/ordnance';
import { gunPoint } from '../src/systems/company/yourFire';
import { createGame, stepGame } from '../src/systems/game';
import type { GameEvent } from '../src/systems/events';
import { emptyInput } from '../src/systems/input';
import { cameraAim } from '../src/systems/shipCamera';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { WORLD } from '../src/data/worldLayout';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const arena = () => {
  const g = createGame(map, null, 4);
  setUpArena(g, { ship: 'aurelia', enemies: 'baleniera', night: false, weather: 'sereno', turret: false });
  return g;
};
/** Your ship this far from the whaler (m), still. */
const near = (m: number) => {
  const g = arena();
  g.company.enemies[0]!.x = g.ship.x + metres(m);
  return g;
};

describe('ai posti di combattimento', () => {
  it('"Armi" solo con una nave della Compagnia a portata; premuto, la battaglia comincia a sorpresa', () => {
    expect(canArm(near(BATTLE.armM + 200))).toBe(false);
    const g = near(200);
    expect(canArm(g)).toBe(true);
    const input = emptyInput();
    input.helmCmd = 'arm';
    const ev = stepGame(g, input, 0.05);
    expect(g.company.battle).not.toBeNull();
    expect(ev.find((e) => e.type === 'navalBattle')).toMatchObject({ surprise: true });
  });

  it('se ti danno la caccia la battaglia parte da sola', () => {
    const g = near(120);
    const e = g.company.enemies[0]!;
    Object.assign(e, { alert: 1, phase: 'hunting' });
    stepGame(g, emptyInput(), 0.05);
    expect(g.company.battle).not.toBeNull();
    expect(g.company.battle!.surprise).toBe(false);
  });

  it('in battaglia la vista non cambia mai di grandezza e si sposta solo se una nave esce dal centro', () => {
    const g = near(150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    stepGame(g, input, 0.05);
    input.helmCmd = null;
    const sizes = new Set<number>();
    const xs: number[] = [];
    for (let i = 0; i < 400; i++) {
      stepGame(g, input, 0.05);
      if (!g.company.battle) break;
      const aim = cameraAim(g, 20, 2.16);
      sizes.add(Math.round(aim.viewH * 1000));
      xs.push(aim.x);
    }
    expect(sizes.size).toBe(1);
    const moves = xs.slice(1).map((x, i) => Math.abs(x - xs[i]!));
    expect(Math.max(...moves)).toBeLessThanOrEqual(g.company.battle!.width * BATTLE.panShare * 0.05 + 1e-6);
  });

  it('la nemica tiene la distanza di tiro e non ti viene addosso', () => {
    const g = near(150);
    const e = g.company.enemies[0]!;
    Object.assign(e, { alert: 1, phase: 'hunting' });
    const input = emptyInput();
    stepGame(g, input, 0.05);
    const standoff = g.company.battle!.base * BATTLE.standoffShare;
    let closest = Infinity;
    // (still, your ship is soon sunk: it is measured while the battle lasts)
    for (let i = 0; i < 600 && g.company.battle && !g.company.battle.result; i++) {
      stepGame(g, input, 0.05);
      if (i > 100) closest = Math.min(closest, Math.abs(e.x - g.ship.x));
    }
    expect(closest).toBeGreaterThan(standoff - metres(BATTLE.weaveM) - metres(10));
  });
});

describe('le armi in battaglia', () => {
  it('il tuo colpo parte con l’angolo che hai scelto e segue l’arco mostrato; ricarica breve', () => {
    const g = near(150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    stepGame(g, input, 0.05);
    input.helmCmd = null;
    const from = gunPoint(g);
    input.fireAngle = -0.4;
    stepGame(g, input, 0.05);
    const shot = g.company.shots.find((s) => s.from === 'you')!;
    expect(Math.atan2(shot.vy, shot.vx)).toBeCloseTo(-0.4, 1);
    const path = shellPath(from, -0.4, 'cannoncino', 0.5);
    expect(path.at(-1)!.x).toBeGreaterThan(from.x);
    expect(WEAPONS.cannoncino.reload).toBeLessThanOrEqual(1.5);
    expect(g.company.yourReload.cannoncino).toBeCloseTo(WEAPONS.cannoncino.reload, 1);
  });

  it('il cannone nemico prima luccica, poi spara dove eri: spostandoti lo schivi', () => {
    const g = near(130);
    const e = g.company.enemies[0]!;
    Object.assign(e, { alert: 1, phase: 'hunting' });
    const ev: GameEvent[] = [];
    let aimedAt = -1;
    let firedAt = -1;
    for (let i = 0; i < 200 && firedAt < 0; i++) {
      const step = stepGame(g, emptyInput(), 0.05);
      ev.push(...step);
      if (aimedAt < 0 && step.some((x) => x.type === 'enemyAim')) aimedAt = i;
      if (step.some((x) => x.type === 'shotFired' && x.from === 'enemy')) firedAt = i;
    }
    expect(aimedAt).toBeGreaterThanOrEqual(0);
    expect((firedAt - aimedAt) * 0.05).toBeGreaterThanOrEqual(BATTLE.telegraph - 0.06);
  });
});

describe('i punti deboli', () => {
  const water = WORLD.surfaceY;
  it('sul ponte incendio e cannone fermo; sulla linea di galleggiamento entra acqua; nel deposito esplode', () => {
    const d = { flood: 0, fire: 0, jam: 0 };
    expect(zoneOf({ x: 0, y: water - 40 }, water, null)).toBe('deck');
    applyHit(d, 'deck', 10);
    expect(d.fire).toBeGreaterThan(0);
    expect(d.jam).toBeGreaterThan(0);
    expect(zoneOf({ x: 0, y: water - 2 }, water, null)).toBe('waterline');
    applyHit(d, 'waterline', 10);
    expect(d.flood).toBeCloseTo(HIT_ZONES.waterline.flood);
    expect(zoneOf({ x: 5, y: 5 }, water, { x: 5, y: 5 })).toBe('magazine');
    expect(applyHit(d, 'magazine', 1)).toBe(Infinity);
  });

  it('piena d’acqua affonda anche con lo scafo intero; il deposito centrato la spezza e rallenta il tempo', () => {
    const g = near(150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    stepGame(g, input, 0.05);
    const e = g.company.enemies[0]!;
    e.dmg.flood = 1 - HIT_ZONES.waterline.flood / 2;
    const ev: GameEvent[] = [];
    g.company.shots.push({
      id: 99,
      weapon: 'cannoncino',
      from: 'you',
      x: e.x,
      y: water - 1,
      vx: 0,
      vy: 0,
      left: 0,
      fuseY: 0,
    });
    ev.push(...stepGame(g, emptyInput(), 0.05));
    expect(e.hull).toBe(0);
    expect(ev.some((x) => x.type === 'enemySunk')).toBe(true);
    expect(timeScale(g)).toBeLessThan(1);
    expect(ENEMY_CLASSES.baleniera.magazine).toBeDefined();
  });

  it('la battaglia finisce con la vittoria, poi la vista torna al timone', () => {
    const g = near(150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    stepGame(g, input, 0.05);
    g.company.enemies[0]!.hull = 1;
    const e = g.company.enemies[0]!;
    g.company.shots.push({
      id: 99,
      weapon: 'cannoncino',
      from: 'you',
      x: e.x,
      y: water - 20,
      vx: 0,
      vy: 0,
      left: 0,
      fuseY: 0,
    });
    const ev: GameEvent[] = [];
    for (let i = 0; i < 400 && g.company.battle; i++) ev.push(...stepGame(g, emptyInput(), 0.05));
    expect(ev.find((x) => x.type === 'navalBattleEnd')).toMatchObject({ result: 'victory' });
    expect(g.company.battle).toBeNull();
  });
});
