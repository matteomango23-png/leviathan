// Your boat (tappa 12): Aurelio's gift at the end of chapter 1, fast on the surface, a moving sanctuary where you
// wake up after losing your senses, fishing from it; no fast travel (you always sail).
import { beforeAll, describe, expect, it } from 'vitest';
import { BOAT } from '../src/data/boat';
import { DIVER } from '../src/data/diver';
import { WORLD } from '../src/data/worldLayout';
import { boatFishAt, canBoard } from '../src/systems/boat';
import type { GameEvent } from '../src/systems/events';
import { blackout, createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { migrate, parseSave, SAVE_VERSION } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

/** A game after chapter 1, with the boat given and you next to it at the surface. */
function afterChapter1(): GameState {
  const g = createGame(map, null, 4);
  g.story.step = 'chapter1Done';
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
  run(g, DT);
  Object.assign(g.diver, { x: g.boat.x + 6, y: WORLD.surfaceY + 6, vx: 0, vy: 0 });
  return g;
}

describe('the boat', () => {
  it('is Aurelio’s gift at the end of chapter 1, moored by the pier', () => {
    const g = createGame(map, null, 4);
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 8);
    g.story.step = 'findShark';
    run(g, DT);
    expect(g.boat.owned).toBe(false);
    g.story.step = 'chapter1Done';
    const ev = run(g, DT);
    expect(g.boat.owned).toBe(true);
    expect(g.boat.x).toBe(BOAT.mooredX);
    expect(ev.some((e) => e.type === 'boatGiven')).toBe(true);
  });

  it('you climb aboard at the surface next to it; aboard you and your team rest', () => {
    const g = afterChapter1();
    expect(canBoard(g)).toBe(true);
    g.beasts.team[0]!.hp = 1;
    g.diver.hp = 1;
    run(g, DT, { ...emptyInput(), action: true });
    expect(g.boat.aboard).toBe(true);
    expect(g.beasts.team[0]!.hp).toBeGreaterThan(1);
    expect(g.diver.hp).toBe(g.diver.maxHp);
    Object.assign(g.diver, { y: WORLD.surfaceY + 200 });
    g.boat.aboard = false;
    expect(canBoard(g)).toBe(false); // too deep
  });

  it('sails fast on the surface, uses no air, and land stops it', () => {
    const g = afterChapter1();
    run(g, DT, { ...emptyInput(), action: true });
    const x0 = g.boat.x;
    g.diver.o2 = 10;
    run(g, 2, { ...emptyInput(), moveX: 1 });
    expect(g.boat.x - x0).toBeGreaterThan(DIVER.maxSpeed * 2 * 1.5);
    expect(g.diver.o2).toBe(g.diver.maxO2);
    expect(g.diver.y).toBeLessThan(WORLD.surfaceY + 10);
    // west, towards the beach: it stops before the land
    run(g, 6, { ...emptyInput(), moveX: -1 });
    expect(map.solidAt(g.boat.x, WORLD.surfaceY + 6)).toBe(false);
  });

  it('you dive from it and it waits at anchor', () => {
    const g = afterChapter1();
    run(g, DT, { ...emptyInput(), action: true });
    run(g, 1, { ...emptyInput(), moveX: 1 });
    run(g, 1);
    const at = g.boat.x;
    run(g, DT, { ...emptyInput(), action: true });
    expect(g.boat.aboard).toBe(false);
    run(g, 1, { ...emptyInput(), moveX: 1, moveY: 1 });
    expect(g.boat.x).toBe(at);
    expect(g.diver.y).toBeGreaterThan(WORLD.surfaceY + 10);
  });

  it('after losing your senses you wake up aboard (losing some teeth, as before)', () => {
    const g = afterChapter1();
    Object.assign(g.diver, { x: g.boat.x + 600, y: 300 });
    g.gear.teeth = 100;
    const events: GameEvent[] = [];
    blackout(g, events);
    expect(g.boat.aboard).toBe(true);
    expect(g.diver.x).toBe(g.boat.x);
    expect(g.gear.teeth).toBe(90);
    expect(events).toContainEqual(expect.objectContaining({ type: 'blackout', place: 'sulla tua barca' }));
  });

  it('you fish from it: wait for the bite, tap while the float is under', () => {
    const g = afterChapter1();
    run(g, DT, { ...emptyInput(), action: true });
    const cast = run(g, DT, { ...emptyInput(), fireHeld: true });
    expect(cast.some((e) => e.type === 'lineCast')).toBe(true);
    let bit = false;
    for (let t = 0; t < 8 && !bit; t += DT) bit = run(g, DT).some((e) => e.type === 'fishBite');
    expect(bit).toBe(true);
    const bag = Object.values(g.gear.bag).reduce((a, b) => a + b, 0);
    const caught = run(g, DT, { ...emptyInput(), fireHeld: true });
    expect(caught.some((e) => e.type === 'fishCaught')).toBe(true);
    expect(Object.values(g.gear.bag).reduce((a, b) => a + b, 0)).toBe(bag + 1);
    // pulling the line too early: it gets away
    run(g, DT);
    run(g, DT, { ...emptyInput(), fireHeld: true });
    run(g, DT);
    expect(run(g, DT, { ...emptyInput(), fireHeld: true }).some((e) => e.type === 'fishEscaped')).toBe(true);
    expect(boatFishAt(g.boat.x).length).toBeGreaterThan(0);
  });

  it('no wild beast reaches you aboard', () => {
    const g = afterChapter1();
    run(g, DT, { ...emptyInput(), action: true });
    expect(g.beasts.aboard).toBe(true);
    const ev = run(g, 20);
    expect(ev.some((e) => e.type === 'battleStart')).toBe(false);
  });

  it('is saved with where it waits; older saves get it again once chapter 1 is over', () => {
    const g = afterChapter1();
    run(g, DT, { ...emptyInput(), action: true });
    run(g, 1.5, { ...emptyInput(), moveX: 1 });
    const save = toSave(g, new Date());
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.boat?.x).toBe(Math.round(g.boat.x));
    const back = createGame(map, parseSave(JSON.stringify(save)), 4);
    expect(back.boat.owned).toBe(true);
    expect(back.boat.x).toBe(Math.round(g.boat.x));
    expect((migrate({ game: 'leviatano', version: 8 }) as { boat: unknown }).boat).toBeNull();
  });
});
