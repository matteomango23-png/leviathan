// The inside view, step T3b (owner, 17 novembre 2026: "è come se switchassi da view outside a view inside… navigare
// ed esplorare"): your ship sailed from inside moves in the world, the world keeps running, every Compagnia vessel
// near is in the view (one sunk, the others fight on), a vessel that has not seen you does not shoot, and under the
// water the harpoon gun ("sott'acqua… a parte il siluro… non funzionano").
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON_GUN, TORPEDO_GUIDE, UNDERWATER } from '../src/data/turret';
import { setUpArena, type ArenaSetup } from '../src/systems/company/arena';
import { metres } from '../src/systems/company/enemyState';
import { createGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { restingInput, stepInside } from '../src/systems/turret/inside';
import { hitFoe } from '../src/systems/turret/insideHits';
import { closeInside, openInside, syncWorld } from '../src/systems/turret/insideWorld';
import { foeFrom, toUnits } from '../src/systems/turret/insideState';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const arena = (set: Partial<ArenaSetup> = {}) => {
  const g = createGame(map, null, 4);
  setUpArena(g, {
    ship: 'aurelia',
    enemies: 'baleniera',
    night: false,
    weather: 'sereno',
    turret: true,
    ...set,
  });
  return g;
};

describe('la vista interna e il mondo', () => {
  it('navigando dentro la nave si sposta nel mondo; girata, fuori va dall’altra parte', () => {
    const g = arena();
    const x0 = g.ship.x;
    const d = openInside(g);
    expect(g.company.inside).toBe(true);
    for (let i = 0; i < 60; i++) stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
    syncWorld(g, d);
    expect(g.ship.x - x0).toBeCloseTo(toUnits(d.you.a) * g.ship.face, 3);
    expect(g.ship.x).not.toBe(x0);
    d.you.heading = 2.6;
    closeInside(g, d);
    expect(g.ship.face).toBe(-1);
    expect(g.company.inside).toBe(false);
    expect(g.ship.inside).toBe(false);
  });

  it('andando col motore dentro, la Compagnia ti sente come fuori', () => {
    const g = arena();
    const d = openInside(g);
    let hunted = false;
    for (let i = 0; i < 400 && !hunted; i++) {
      stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
      syncWorld(g, d);
      hunted = g.company.enemies[0]!.phase === 'hunting';
    }
    expect(g.ship.engineOn).toBe(true);
    expect(hunted).toBe(true);
  });

  it('entrando la torretta guarda lungo la prua, anche con una nave vicina', () => {
    const g = arena({ enemies: 'tutti' });
    const d = openInside(g);
    expect(d.foes.length).toBeGreaterThan(0);
    expect(d.yaw).toBe(0);
  });

  it('uscendo con la nave girata, il mondo lo dice', () => {
    const g = arena();
    const d = openInside(g);
    d.you.heading = Math.PI;
    closeInside(g, d);
    expect(g.story.pending.some((e) => e.type === 'insideTurned' && e.face === -1)).toBe(true);
  });

  it('il mondo continua mentre sei dentro, ma il timone di fuori non muove la nave', () => {
    const g = arena();
    openInside(g);
    const t0 = g.day.t;
    const x0 = g.ship.x;
    const input = emptyInput();
    input.helm.throttle = 1;
    g.ship.engineOn = true;
    for (let i = 0; i < 40; i++) stepGame(g, input, 0.05);
    expect(g.day.t).toBeGreaterThan(t0);
    expect(g.ship.x).toBe(x0);
  });
});

describe('tutte le navi della Compagnia', () => {
  it('entrano tutte nella vista; affondata una, le altre restano e la vista continua', () => {
    const g = arena({ enemies: 'tutti' });
    const d = openInside(g);
    expect(d.foes.length).toBe(3);
    expect(new Set(d.foes.map((f) => Math.round(f.s))).size).toBe(3);
    const first = g.company.enemies[0]!;
    first.hull = 0;
    const ev = stepInside(g, d, restingInput(), 0.05);
    expect(ev.some((e) => e.type === 'sunk' && e.foe === first.id)).toBe(true);
    expect(d.lost).toBeNull();
    expect(g.company.enemies.filter((e) => e.sinkT <= 0).length).toBe(2);
  });

  it('chi non ti ha visto non spara; il primo colpo la mette in caccia', () => {
    const g = arena();
    const e = g.company.enemies[0]!;
    g.ship.silent = true;
    const d = openInside(g);
    for (let i = 0; i < 200; i++) stepInside(g, d, restingInput(), 0.05);
    expect(e.phase).not.toBe('hunting');
    expect(d.rounds.filter((r) => r.from !== 'you').length).toBe(0);
    hitFoe(g, e, 'mg', { u: 0.5, v: 0.3 }, []);
    expect(e.phase).toBe('hunting');
  });
});

describe('le armi sott’acqua', () => {
  const under = (dist: number) => {
    const g = arena({ ship: 'stormtrooper' });
    const e = g.company.enemies[0]!;
    e.x = g.ship.x + metres(dist);
    const d = openInside(g);
    d.you.depth = UNDERWATER.periscopeM + 2;
    const f = d.foes[0]!;
    f.s = 0;
    f.a = dist;
    f.home = dist;
    f.homeS = 0;
    return { g, d, e };
  };

  it('il fucile ad arpioni spara solo sott’acqua e apre piccole falle nella carena', () => {
    const { g, d, e } = under(45);
    for (let i = 0; i < 40; i++) {
      const rel = foeFrom(d, d.foes[0]!);
      d.yaw = Math.atan2(rel.s, rel.a);
      d.pitch = Math.atan2(d.you.depth - 1.5, rel.dist);
      stepInside(g, d, { ...restingInput(), firing: true }, 0.05);
    }
    expect(d.rounds.length).toBe(0);
    expect(e.dmg.flood).toBeGreaterThan(0);
    expect(e.dmg.flood).toBeLessThan(HARPOON_GUN.flood * 40);
  });

  it('andando forte e mirando di lato, i dardi vanno dritti dove punta il mirino', () => {
    const { g, d } = under(300);
    d.you.speed = 20;
    d.you.heading = 0;
    d.yaw = 0.8;
    d.pitch = 0;
    stepInside(g, d, { ...restingInput(), firing: true, throttle: 1 }, 0.05);
    d.yaw = 0.8;
    for (let i = 0; i < 10; i++) stepInside(g, d, { ...restingInput(), throttle: 1 }, 0.05);
    const r = d.darts[0]!;
    // seen from aboard: on the crosshair's line
    expect(Math.atan2(r.p.s - d.you.s, r.p.a - d.you.a)).toBeCloseTo(0.8, 1);
  });

  it('anche sopra l’acqua i traccianti vanno dritti dove punta il mirino, a tutta forza', () => {
    const g = arena();
    const d = openInside(g);
    d.you.speed = 20;
    d.yaw = 1.2;
    stepInside(g, d, { ...restingInput(), firing: true }, 0.05);
    d.yaw = 1.2;
    for (let i = 0; i < 6; i++) stepInside(g, d, restingInput(), 0.05);
    const r = d.rounds.find((x) => x.kind === 'mg')!;
    expect(Math.atan2(r.p.s - d.you.s, r.p.a - d.you.a)).toBeCloseTo(1.2, 1);
  });

  it('oltre la sua portata non arriva', () => {
    const { g, d, e } = under(HARPOON_GUN.rangeM + 60);
    for (let i = 0; i < 40; i++) {
      d.yaw = 0;
      d.pitch = 0.05;
      stepInside(g, d, { ...restingInput(), firing: true }, 0.05);
    }
    expect(e.dmg.flood).toBe(0);
  });

  it('il cannone sott’acqua non spara; il siluro si ricarica prima', () => {
    const { g, d } = under(200);
    d.weapon = 'gun';
    stepInside(g, d, { ...restingInput(), gunShot: true, torpedo: true }, 0.05);
    expect(d.rounds.length).toBe(0);
    expect(d.torpReload).toBeCloseTo(TORPEDO_GUIDE.underReload, 1);
  });
});
