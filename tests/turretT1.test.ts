// The turret in first person, step T1 (owner, 17 novembre 2026: "una view in prima persona su una mitragliatrice o una
// cannoniera… un gioco nel gioco"): the view's projection, the rounds and where they strike, the machine gun's heat,
// the duel opening from the sea and giving it back, and the arena's tick.
import { beforeAll, describe, expect, it } from 'vitest';
import { ENEMY_CLASSES, HIT_ZONES } from '../src/data/company';
import { MACHINE_GUN, TURRET } from '../src/data/turret';
import { setUpArena } from '../src/systems/company/arena';
import { metres } from '../src/systems/company/enemyState';
import { createGame, stepGame } from '../src/systems/game';
import type { GameEvent } from '../src/systems/events';
import { emptyInput } from '../src/systems/input';
import { landingOf, lobPitch, strikes } from '../src/systems/turret/ballistics';
import { hullOf, restingInput, stepInside } from '../src/systems/turret/inside';
import { closeInside, openInside } from '../src/systems/turret/insideWorld';
import { foeFrom } from '../src/systems/turret/insideState';
import { horizonY, project, seaDistanceAt, type Camera } from '../src/systems/turret/projection';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const cam = (o: Partial<Camera> = {}): Camera => ({
  yaw: 0,
  pitch: 0,
  height: TURRET.height,
  roll: 0,
  w: 800,
  h: 400,
  ...o,
});

const arena = (turret: boolean, dist = 150) => {
  const g = createGame(map, null, 4);
  setUpArena(g, { ship: 'aurelia', enemies: 'baleniera', night: false, weather: 'sereno', turret });
  g.company.enemies[0]!.x = g.ship.x + metres(dist);
  return g;
};

describe('la vista dalla torretta', () => {
  it('davanti cade al centro; più lontano è più piccolo e più vicino all’orizzonte; girando si sposta', () => {
    const near = project(cam(), { a: 50, s: 0, z: 0 })!;
    const far = project(cam(), { a: 400, s: 0, z: 0 })!;
    expect(near.x).toBeCloseTo(400);
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.y).toBeLessThan(near.y);
    expect(Math.abs(far.y - horizonY(cam()))).toBeLessThan(Math.abs(near.y - horizonY(cam())));
    const turned = project(cam({ yaw: 0.3 }), { a: 100, s: 0, z: 0 })!;
    expect(turned.x).toBeLessThan(400);
    expect(project(cam(), { a: -50, s: 0, z: 0 })).toBeNull();
    expect(seaDistanceAt(cam(), project(cam(), { a: 120, s: 0, z: 0 })!.y)).toBeCloseTo(120, 0);
  });
});

describe('i colpi', () => {
  const hull = hullOf('aurelia', 100, 0, Math.PI / 2);
  it('un colpo che attraversa lo scafo lo colpisce, e dice dove: in basso la linea di galleggiamento', () => {
    const hit = strikes(hull, { a: 50, s: 0, z: 1 }, { a: 150, s: 0, z: 1 })!;
    expect(hit).not.toBeNull();
    expect(hit.u).toBeGreaterThan(0.4);
    expect(hit.u).toBeLessThan(0.6);
    const high = strikes(hull, { a: 50, s: 0, z: 6 }, { a: 150, s: 0, z: 6 })!;
    expect(high.v).toBeLessThan(hit.v);
    expect(strikes(hull, { a: 50, s: 60, z: 1 }, { a: 150, s: 60, z: 1 })).toBeNull();
  });

  it('la granata cade: più lontano bisogna alzare di più; il segno sul mare è dove cade', () => {
    const p100 = lobPitch(100, -7, 150, 9.8)!;
    const p300 = lobPitch(300, -7, 150, 9.8)!;
    expect(p300).toBeGreaterThan(p100);
    const land = landingOf('you', 'cannone', { a: 0, s: 0, z: 7 }, 0, 0.05)!;
    expect(land.a).toBeGreaterThan(50);
    expect(land.z).toBe(0);
  });
});

describe('la mitragliatrice', () => {
  it('spara con la sua cadenza, si scalda, si ferma e poi si raffredda', () => {
    const g = arena(true);
    const d = openInside(g);
    const input = { ...restingInput(), firing: true };
    let shots = 0;
    for (let i = 0; i < 20; i++)
      shots += stepInside(g, d, input, 0.05).filter((e) => e.type === 'shot').length;
    expect(shots).toBeGreaterThanOrEqual(Math.floor(MACHINE_GUN.rate * 1) - 1);
    for (let i = 0; i < 200 && !d.hot; i++) stepInside(g, d, input, 0.05);
    expect(d.hot).toBe(true);
    const before = d.rounds.length;
    stepInside(g, d, input, 0.05);
    expect(d.rounds.length).toBeLessThanOrEqual(before);
    for (let i = 0; i < 200 && d.hot; i++) stepInside(g, d, restingInput(), 0.05);
    expect(d.hot).toBe(false);
  });

  it('puntata sulla nave la colpisce e la danneggia', () => {
    const g = arena(true, 80);
    const e = g.company.enemies[0]!;
    const d = openInside(g);
    const hull0 = e.hull;
    const input = { ...restingInput(), firing: true };
    for (let i = 0; i < 40; i++) {
      // keep the turret on it
      const rel = foeFrom(d, d.foes[0]!);
      d.yaw = Math.atan2(rel.s, rel.a);
      d.pitch = -Math.atan2(TURRET.height - 3, rel.dist);
      stepInside(g, d, { ...input, gunShot: false }, 0.05);
      if (d.hot) break;
    }
    expect(e.hull).toBeLessThan(hull0);
  });
});

describe('il duello e il mondo', () => {
  it('chiudendo, le navi tornano sulla linea del mare alla distanza del duello; i danni restano', () => {
    const g = arena(true, 150);
    const e = g.company.enemies[0]!;
    const d = openInside(g);
    expect(d.foes[0]!.a).toBeCloseTo(150, 0);
    e.dmg.flood = 0.5;
    for (let i = 0; i < 100; i++) stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
    const along = d.foes[0]!.a - d.you.a;
    closeInside(g, d);
    expect((e.x - g.ship.x) / metres(1)).toBeCloseTo(along, 0);
    expect(e.dmg.flood).toBeGreaterThanOrEqual(0.5);
    expect(e.sinkT).toBe(0);
  });

  it('il deposito o l’acqua piena la affondano: affondata, la vista resta', () => {
    const g = arena(true, 100);
    const e = g.company.enemies[0]!;
    const d = openInside(g);
    e.dmg.flood = 1 - HIT_ZONES.waterline.flood / 2;
    e.hull = 0;
    const ev = stepInside(g, d, restingInput(), 0.05);
    expect(ev.some((x) => x.type === 'sunk' && x.foe === e.id)).toBe(true);
    expect(d.lost).toBeNull();
    expect(e.sinkT).toBeGreaterThan(0);
    expect(ENEMY_CLASSES.baleniera.magazine).toBeDefined();
  });

  it('con la spunta Torretta "Armi" apre la torretta; senza, la battaglia di lato', () => {
    const t = arena(true, 150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    const ev: GameEvent[] = stepGame(t, input, 0.05);
    expect(ev.some((e) => e.type === 'turretOpen')).toBe(true);
    expect(t.company.battle).toBeNull();
    const s = arena(false, 150);
    const input2 = emptyInput();
    input2.helmCmd = 'arm';
    stepGame(s, input2, 0.05);
    expect(s.company.battle).not.toBeNull();
  });

  it('la battaglia di lato non finisce più se la nave si allontana: si esce con "Timone"', () => {
    const g = arena(false, 150);
    const input = emptyInput();
    input.helmCmd = 'arm';
    stepGame(g, input, 0.05);
    g.company.enemies[0]!.x = g.ship.x + metres(2000);
    stepGame(g, emptyInput(), 0.05);
    expect(g.company.battle?.result).toBeNull();
    const out = emptyInput();
    out.helmCmd = 'disarm';
    const ev = stepGame(g, out, 0.05);
    expect(ev.find((e) => e.type === 'navalBattleEnd')).toMatchObject({ result: 'left' });
  });
});
