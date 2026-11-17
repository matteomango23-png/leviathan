// The turret, step T3a (owner, 17 novembre 2026): every finger at once ("quando clicchi due pulsanti insieme non
// funziona"), a real rudder ("il gas per avvicinarsi non funziona bene"), a vessel that cannot run away ("le navi
// tendono ad allontanarsi di brutto"), a machine gun that fires long ("sentirmi un po' potente"), and the Compagnia's
// ships in 3D ("Preferisco che mi crei un modello tu in 3D").
import { beforeAll, describe, expect, it } from 'vitest';
import { BATTLE, ENEMY_CLASSES } from '../src/data/company';
import { DUEL } from '../src/data/turret';
import { setUpArena } from '../src/systems/company/arena';
import { metres } from '../src/systems/company/enemyState';
import { createGame } from '../src/systems/game';
import { restingInput, stepInside } from '../src/systems/turret/inside';
import { closeInside, openInside } from '../src/systems/turret/insideWorld';
import { yourTop } from '../src/systems/turret/foeAi';
import { foeFrom } from '../src/systems/turret/insideState';
import { splitHalves } from '../src/systems/turret/hull3d';
import { enemyModel } from '../src/systems/turret/hullModels';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { TouchRouter } from '../src/ui/turretTouch';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const arena = (ship: string, enemies: 'baleniera' | 'caccia' | 'uboot', dist = 120) => {
  const g = createGame(map, null, 4);
  setUpArena(g, { ship, enemies, night: false, weather: 'sereno', turret: true });
  g.company.enemies[0]!.x = g.ship.x + metres(dist);
  // hunting you (a calm vessel only patrols: turretT3b)
  Object.assign(g.company.enemies[0]!, { phase: 'hunting', alert: 1 });
  return g;
};

describe('il timone', () => {
  it('la prua gira e la nave va dove punta', () => {
    const g = arena('aurelia', 'baleniera', 300);
    const d = openInside(g);
    for (let i = 0; i < 60; i++) stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
    expect(Math.abs(d.you.s)).toBeLessThan(0.01);
    for (let i = 0; i < 80; i++) stepInside(g, d, { ...restingInput(), throttle: 1, steer: 1 }, 0.05);
    expect(d.you.heading).toBeGreaterThan(0.3);
    const before = { a: d.you.a, s: d.you.s };
    stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
    const way = Math.atan2(d.you.s - before.s, d.you.a - before.a);
    expect(way).toBeCloseTo(d.you.heading, 2);
  });

  it('girata oltre il traverso, tornando fuori la nave va dall’altra parte; il gas va anche indietro', () => {
    const g = arena('aurelia', 'baleniera', 300);
    const face = g.ship.face;
    const d = openInside(g);
    d.you.heading = 2.5;
    d.you.speed = 3;
    closeInside(g, d);
    expect(g.ship.face).toBe(-face);
    const g2 = arena('aurelia', 'baleniera', 300);
    const d2 = openInside(g2);
    for (let i = 0; i < 100; i++) stepInside(g2, d2, { ...restingInput(), throttle: -1 }, 0.05);
    expect(d2.you.speed).toBeLessThan(0);
    expect(d2.you.speed).toBeGreaterThanOrEqual(-yourTop(g2) * DUEL.reverse - 1e-6);
  });
});

describe('la nave nemica non scappa', () => {
  it('mai più veloce di quanto puoi inseguirla, mai oltre il guinzaglio', () => {
    for (const cls of ['baleniera', 'caccia'] as const) {
      const g = arena('aurelia', cls, 150);
      const d = openInside(g);
      let far = 0;
      for (let i = 0; i < 1200; i++) {
        // (your top speed falls as you take in water: its cap is the one of that moment)
        if (d.lost !== null) break;
        const cap = yourTop(g) * DUEL.foeSpeedShare;
        stepInside(g, d, restingInput(), 0.05);
        expect(Math.abs(d.foes[0]!.speed)).toBeLessThanOrEqual(cap + 1e-6);
        far = Math.max(far, foeFrom(d, d.foes[0]!).dist);
      }
      expect(far).toBeLessThan(DUEL.leashM * 1.3);
    }
  });

  it('malridotta fugge piano, e torna indietro al guinzaglio', () => {
    const g = arena('aurelia', 'baleniera', 150);
    const e = g.company.enemies[0]!;
    e.hull = ENEMY_CLASSES.baleniera.hull * BATTLE.fleeBelow * 0.5;
    const d = openInside(g);
    let far = 0;
    for (let i = 0; i < 1800; i++) {
      stepInside(g, d, restingInput(), 0.05);
      far = Math.max(far, foeFrom(d, d.foes[0]!).dist);
    }
    expect(far).toBeLessThan(DUEL.leashM * 1.3);
    expect(foeFrom(d, d.foes[0]!).dist).toBeLessThan(DUEL.leashM * 1.3);
  });
});

describe('la mitragliatrice potente', () => {
  it('spara almeno 7 secondi di fila prima di scaldarsi', () => {
    const g = arena('aurelia', 'baleniera', 300);
    const d = openInside(g);
    let t = 0;
    while (!d.hot && t < 30) {
      stepInside(g, d, { ...restingInput(), firing: true }, 0.05);
      t += 0.05;
    }
    expect(t).toBeGreaterThanOrEqual(7);
    expect(d.hot).toBe(true);
  });
});

describe('le navi in 3D', () => {
  it('ogni classe ha i suoi pezzi; spezzata in due, le metà fanno tutta la nave', () => {
    const whaler = enemyModel('baleniera', 30);
    const hunter = enemyModel('caccia', 60);
    const uboat = enemyModel('uboot', 60);
    for (const m of [whaler, hunter, uboat]) {
      expect(m.faces.some((f) => f.part === 'metal')).toBe(true);
      const [stern, bow] = splitHalves(m.faces);
      expect(stern.length + bow.length).toBe(m.faces.length);
      expect(stern.length).toBeGreaterThan(0);
      expect(bow.length).toBeGreaterThan(0);
    }
    expect(whaler.funnel).not.toBeNull();
    expect(hunter.funnel).not.toBeNull();
    expect(uboat.funnel).toBeNull();
    // the hunting ship is longer and narrower; its bow is the sharpest point
    const beam = (m: typeof whaler, L: number) =>
      Math.max(...m.faces.flatMap((f) => f.pts.filter((p) => Math.abs(p.x) < L * 0.1).map((p) => p.y)));
    expect(beam(hunter, 60) / 60).toBeLessThan(beam(whaler, 30) / 30);
    // the whaler's antifouling and waterline stripe
    expect(whaler.faces.some((f) => f.part === 'boot')).toBe(true);
  });
});

describe('le dita insieme', () => {
  it('tre dita con ruoli diversi insieme; scivolare non rilascia, alzare sì', () => {
    let looked = 0;
    const r = new TouchRouter({ move: (role, dx) => role === 'look' && (looked += dx) });
    r.down(1, 'look', 100, 100);
    r.down(2, 'fire', 700, 300);
    r.down(3, 'mg', 600, 200);
    r.move(1, 130, 100);
    // the trigger's finger slides off the button: still firing
    r.move(2, 500, 100);
    expect(looked).toBe(30);
    expect(r.held('fire')).toBe(true);
    expect(r.held('mg')).toBe(true);
    r.up(3);
    expect(r.held('fire')).toBe(true);
    expect(r.held('mg')).toBe(false);
    r.up(2);
    expect(r.held('fire')).toBe(false);
    r.move(1, 140, 100);
    expect(looked).toBe(40);
  });
});
