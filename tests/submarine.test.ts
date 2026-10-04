// Your submarine (tappa 16, owner's decisions of 3 ottobre 2026): Aurelio's gift at the end of chapter 1; under
// water down to its model's depth (under the icebergs); it waits where you leave it; inside you rest and fish but
// do not fight: ordinary beasts slip away, big hunters ram it; broken it is towed home; ports repair it; better
// ones are bought; saved (v11, the old boat becomes the bathyscaphe).
import { beforeAll, describe, expect, it } from 'vitest';
import { SUB_MODELS, SUBMARINE } from '../src/data/submarine';
import { ICEBERGS } from '../src/data/worldArt';
import { WORLD } from '../src/data/worldLayout';
import { spawnWild } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { migrate, parseSave, SAVE_VERSION } from '../src/systems/save/saveData';
import { buySub, canBoard, ramSub, subFloorY, subModel } from '../src/systems/submarine';
import { giveTestBeast } from '../src/systems/testTools';
import { icebergBox } from '../src/systems/world/icebergs';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;
const U = WORLD.unitsPerMetre;

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}
const press = (g: GameState): GameEvent[] => run(g, DT, { ...emptyInput(), action: true });

/** After chapter 1: the submarine is yours and you float next to it. */
function afterChapter1(): GameState {
  const g = createGame(map, null, 4);
  g.story.step = 'chapter1Done';
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
  run(g, DT);
  Object.assign(g.diver, { x: g.sub.x + 8, y: g.sub.y + 4, vx: 0, vy: 0 });
  return g;
}
/** Inside it, somewhere in open water. */
function inside(x: number, y: number): GameState {
  const g = afterChapter1();
  Object.assign(g.sub, { x, y });
  Object.assign(g.diver, { x: x + 6, y });
  press(g);
  expect(g.sub.aboard).toBe(true);
  return g;
}

describe('the submarine', () => {
  it('is Aurelio’s gift at the end of chapter 1, waiting past the pier', () => {
    const g = createGame(map, null, 4);
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
    g.story.step = 'findShark';
    run(g, DT);
    expect(g.sub.owned).toBe(false);
    g.story.step = 'chapter1Done';
    const ev = run(g, DT);
    expect(g.sub.owned).toBe(true);
    expect(g.sub.x).toBe(SUBMARINE.mooredX);
    expect(g.sub.model).toBe(SUB_MODELS[0]!.id);
    expect(ev.some((e) => e.type === 'subGiven')).toBe(true);
  });

  it('you climb in next to it at any depth; inside you and your team rest; you get out and it waits', () => {
    const g = afterChapter1();
    expect(canBoard(g)).toBe(true);
    g.beasts.team[0]!.hp = 1;
    g.diver.hp = 1;
    press(g);
    expect(g.sub.aboard).toBe(true);
    expect(g.diver.hp).toBe(g.diver.maxHp);
    expect(g.beasts.team[0]!.hp).toBeGreaterThan(1);
    expect(g.beasts.aboard).toBe(true);
    run(g, 1, { ...emptyInput(), moveX: 1, moveY: 1 });
    const at = { x: g.sub.x, y: g.sub.y };
    expect(at.y).toBeGreaterThan(SUBMARINE.restY); // it went under
    press(g); // out
    expect(g.sub.aboard).toBe(false);
    run(g, 1, { ...emptyInput(), moveX: -1 });
    expect(g.sub.x).toBe(at.x); // it stays where you left it
    expect(g.sub.y).toBe(at.y);
  });

  it('goes under water (under the icebergs) but not deeper than its model', () => {
    const berg = icebergBox(ICEBERGS[1]!)!;
    const y = berg.top + berg.h + 25; // just under the iceberg
    const g = inside(berg.left - 40, y);
    run(g, 10, { ...emptyInput(), moveX: 1 });
    expect(g.sub.x).toBeGreaterThan(berg.left + berg.w); // passed under it
    const g2 = inside(SUBMARINE.mooredX + 200, SUBMARINE.restY + 20);
    const ev = run(g2, 12, { ...emptyInput(), moveY: 1 });
    expect(g2.sub.y).toBeLessThanOrEqual(subFloorY(g2.sub));
    expect(subFloorY(g2.sub)).toBe(WORLD.surfaceY + SUB_MODELS[0]!.maxDepthM * U);
    expect(ev.some((e) => e.type === 'subTooDeep') || g2.sub.y < subFloorY(g2.sub)).toBe(true);
  });

  it('inside you do not fight: an ordinary shark slips away instead of starting a battle', () => {
    const g = inside(SUBMARINE.mooredX + 300, 120);
    const w = g.beasts.wilds.find((x) => !x.arena)!;
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 15, g.sub.x + 40, g.sub.y, -1);
    const before = Math.hypot(w.x - g.sub.x, w.y - g.sub.y);
    run(g, 0.5);
    expect(w.mood).toBe('flee');
    run(g, 4); // big beasts do not turn in the light: it swims past and away
    expect(g.beasts.battle).toBeNull();
    expect(Math.hypot(w.x - g.sub.x, w.y - g.sub.y)).toBeGreaterThan(before);
  });

  it('a big hunter rams it; broken, it is towed back to Portofosco; the port repairs it for teeth', () => {
    const g = inside(SUBMARINE.mooredX + 600, 150);
    g.gear.teeth = 1000;
    const w = g.beasts.wilds.find((x) => !x.arena)!;
    spawnWild(w, { speciesId: 'orca', variant: 'comune' }, 30, g.sub.x + 30, g.sub.y, -1);
    const max = g.sub.hull;
    let ev: GameEvent[] = [];
    for (let i = 0; i < 400 && g.sub.hull > 0; i++) {
      w.calm = 0;
      Object.assign(w, { x: g.sub.x + 8, y: g.sub.y }); // keep it on the hull
      ev = ev.concat(run(g, DT));
    }
    expect(ev.some((e) => e.type === 'subRammed')).toBe(true);
    expect(g.beasts.battle).toBeNull();
    expect(g.sub.hull).toBe(0);
    expect(ev).toContainEqual({ type: 'subWrecked', teeth: 100 });
    expect(g.sub.x).toBe(SUBMARINE.mooredX);
    // at the port it is mended
    const out: GameEvent[] = [];
    enterPort(g, out);
    expect(g.sub.hull).toBe(max);
    expect(out).toContainEqual({ type: 'subRepaired', cost: max * SUBMARINE.repairPerPoint });
  });

  it('better ones are bought at the port; you can switch back', () => {
    const g = afterChapter1();
    g.gear.teeth = 100;
    expect(buySub(g, 'squalo_ferro').ok).toBe(false);
    g.gear.teeth = 5000;
    expect(buySub(g, 'squalo_ferro').ok).toBe(true);
    expect(g.gear.teeth).toBe(5000 - SUB_MODELS[1]!.price);
    expect(g.sub.model).toBe('squalo_ferro');
    expect(g.sub.hull).toBe(SUB_MODELS[1]!.hull);
    expect(subFloorY(g.sub)).toBeGreaterThan(WORLD.surfaceY + SUB_MODELS[0]!.maxDepthM * U);
    expect(buySub(g, 'batiscafo').ok).toBe(true);
    expect(g.gear.teeth).toBe(5000 - SUB_MODELS[1]!.price); // already yours: free
  });

  it('is saved (v11); an older save’s boat becomes the bathyscaphe where the boat was', () => {
    const g = afterChapter1();
    g.gear.teeth = 5000;
    buySub(g, 'squalo_ferro');
    Object.assign(g.sub, { x: 9000, y: 200, hull: 50 });
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.sub).toMatchObject({ owned: true, x: 9000, y: 200, hull: 50, model: 'squalo_ferro' });
    expect(back.sub.models).toEqual(['batiscafo', 'squalo_ferro']);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(11);
    const old = migrate({ game: 'leviatano', version: 10, boat: { x: 777 } }) as {
      sub: unknown;
      boat?: unknown;
    };
    expect(old.sub).toEqual({
      x: 777,
      y: SUBMARINE.restY,
      model: 'batiscafo',
      models: ['batiscafo'],
      hull: 60,
    });
    expect(old.boat).toBeUndefined();
  });
});

describe('lampada del sottomarino', () => {
  it('punta dove guarda il sottomarino, non dove mirava il sub prima di salire', async () => {
    const { lampAim } = await import('../src/systems/submarine');
    const sub = { aboard: true, face: -1 } as unknown as Parameters<typeof lampAim>[0]['sub'];
    expect(lampAim({ sub, diver: { aim: 0 } })).toBeCloseTo(Math.PI);
    sub.face = 1;
    expect(lampAim({ sub, diver: { aim: 2 } })).toBe(0);
    sub.aboard = false;
    expect(lampAim({ sub, diver: { aim: 2 } })).toBe(2);
  });
});

describe('urti del sottomarino (4 ottobre: niente muro invisibile)', () => {
  /** A spot in open water with rock just ahead to the east, at depth y. */
  function nearWall(y: number): number {
    const free = (x: number) => SUBMARINE.body.every(([dx, r]) => !map.hitCircle(x + dx, y, r));
    for (let x = 1800; x < 9000; x += 2) if (free(x) && free(x - 40) && !free(x + 24)) return x - 30;
    throw new Error('no wall found');
  }

  it('veloce contro la roccia rimbalza, prende danno e lo dice', () => {
    const y = 150;
    const x = nearWall(y);
    const g = inside(x, y);
    const max = g.sub.hull;
    g.sub.vx = subModel(g.sub.model).speed;
    const ev = run(g, 1, { ...emptyInput(), moveX: 1 });
    const hit = ev.find((e) => e.type === 'subRammed');
    expect(hit && hit.type === 'subRammed' && hit.by).toBe('rock');
    expect(g.sub.hull).toBeLessThan(max);
    expect(SUBMARINE.body.every(([dx, r]) => !map.hitCircle(g.sub.x + dx, g.sub.y, r))).toBe(true);
  });

  it('piano contro la roccia rimbalza appena, senza danno', () => {
    const y = 150;
    const x = nearWall(y);
    const g = inside(x, y);
    const max = g.sub.hull;
    g.sub.vx = 12;
    const ev = run(g, 2);
    expect(ev.some((e) => e.type === 'subRammed')).toBe(false);
    expect(g.sub.hull).toBe(max);
  });

  it('una speronata spinge via il sottomarino, lontano dalla bestia', () => {
    const g = inside(SUBMARINE.mooredX + 300, 120);
    g.sub.vx = 0;
    ramSub(g, 6, g.sub.x - 20, g.sub.y, []);
    expect(g.sub.vx).toBeGreaterThan(0);
  });
});
