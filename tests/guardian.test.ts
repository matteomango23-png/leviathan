import { describe, expect, it } from 'vitest';
import { LAIR } from '../src/data/guardians';
import { TILE, WORLD } from '../src/data/worldLayout';
import { GUARDIAN_TEETH_REWARD } from '../src/data/world';
import { battleSetup, finishBattle } from '../src/systems/battleResult';
import { isInWater } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { parseSave, serializeSave } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import { lairRoofY } from '../src/systems/world/lair';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

function fresh(): GameState {
  const g = createGame(map, null, 7); // the fight never changes the map
  giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 9);
  return g;
}

/** Tiles reachable by water from a point (bones and rock block). */
function reach(m: TileMap, x: number, y: number): Set<number> {
  const T = WORLD.tileSize;
  const start = Math.floor(y / T) * m.cols + Math.floor(x / T);
  const seen = new Set([start]);
  const todo = [start];
  while (todo.length) {
    const i = todo.pop()!;
    const tx = i % m.cols;
    const ty = Math.floor(i / m.cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= m.cols || ny >= m.rows) continue;
      const j = ny * m.cols + nx;
      if (seen.has(j) || m.get(nx, ny) !== TILE.water) continue;
      seen.add(j);
      todo.push(j);
    }
  }
  return seen;
}

function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds && !g.beasts.battle; t += 1 / 30) {
    g.diver.o2 = g.diver.maxO2;
    all.push(...stepGame(g, emptyInput(), 1 / 30));
  }
  return all;
}

const boss = (g: GameState) => g.beasts.wilds.find((w) => w.guardian)!;
const intoCave = (g: GameState) => Object.assign(g.diver, { x: LAIR.x - 120, y: LAIR.y, vx: 0, vy: 0 });

/** Plays the battle with the Guardian to an end, straight through finishBattle. */
function endBattle(g: GameState, over: 'won' | 'caught' | 'lost' | 'fled'): GameEvent[] {
  const setup = battleSetup(g)!;
  return finishBattle(g, {
    wildId: setup.wildId,
    over,
    team: setup.state.team.map((f) => ({ uid: f.uid!, hp: f.hp })),
    lastActive: setup.state.team[0]!.uid,
    foe: { form: setup.state.foe.form, level: setup.state.foe.level, hp: 1 },
  });
}

describe('the lair of Lo Sfregiato', () => {
  it('is a closed cave: only the shaft leads in, and bones close it', () => {
    const inside = reach(map, LAIR.x, LAIR.y);
    const surface = Math.floor((WORLD.surfaceY + 10) / WORLD.tileSize) * map.cols + 100;
    expect(inside.has(surface)).toBe(false);
    const open = generateWorld();
    for (const ty of LAIR.gateRows)
      for (let tx = 0; tx < open.cols; tx++)
        if (open.get(tx, ty) === TILE.bone && ty < 60) open.set(tx, ty, 0);
    expect(reach(open, LAIR.x, LAIR.y).has(surface)).toBe(true);
    expect(lairRoofY()).toBeGreaterThan(WORLD.surfaceY);
  });
});

describe('the Guardian', () => {
  it('appears when you swim into the cave and comes at you: a boss battle, no fleeing', () => {
    const g = fresh();
    intoCave(g);
    const ev = run(g, 15);
    expect(ev.some((e) => e.type === 'guardianAppeared')).toBe(true);
    expect(g.beasts.battle?.wildId).toBe(boss(g).id);
    const setup = battleSetup(g)!;
    expect(setup.noFlee).toBe(true);
    expect(setup.state.foe.form.unique).toBe('sfregiato');
    expect(setup.state.foe.level).toBe(8);
  });

  it('beaten: 800 teeth and a new mythic harpoon only the first time, back after the port', () => {
    const g = fresh();
    g.gear.mythicStock = 0;
    intoCave(g);
    run(g, 15);
    const ev = endBattle(g, 'won');
    expect(ev).toContainEqual({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
    expect(g.gear.teeth).toBe(GUARDIAN_TEETH_REWARD);
    expect(g.gear.mythicStock).toBe(1);
    expect(isInWater(boss(g))).toBe(false);
    expect(g.guardian.ready).toBe(false);
    run(g, 1);
    expect(isInWater(boss(g))).toBe(false); // not back yet
    enterPort(g);
    intoCave(g);
    run(g, 15);
    expect(endBattle(g, 'won')).toContainEqual({ type: 'guardianBeaten', teeth: 0 });
    expect(g.gear.teeth).toBe(GUARDIAN_TEETH_REWARD);
  });

  it('tamed in battle: Lo Sfregiato joins your team and the lair stays empty', () => {
    const g = fresh();
    intoCave(g);
    run(g, 15);
    endBattle(g, 'caught');
    expect(g.beasts.team.some((b) => b.form.unique === 'sfregiato')).toBe(true);
    g.diver.y = WORLD.surfaceY + 20;
    run(g, 0.2);
    intoCave(g);
    expect(run(g, 2).some((e) => e.type === 'guardianAppeared')).toBe(false);
  });

  it('leaving the cave sends it back into the dark', () => {
    const g = fresh();
    g.beasts.team[0]!.ko = true; // no battle: it only follows you around
    g.beasts.team[0]!.hp = 0;
    intoCave(g);
    run(g, 0.2);
    expect(isInWater(boss(g))).toBe(true);
    g.diver.y = WORLD.surfaceY + 20;
    expect(run(g, 0.2).some((e) => e.type === 'guardianLeft')).toBe(true);
    expect(isInWater(boss(g))).toBe(false);
  });

  it('beaten Guardians are saved', () => {
    const g = fresh();
    g.gear.guardians.push('sfregiato');
    expect(parseSave(serializeSave(toSave(g, new Date()))).gear?.guardians).toEqual(['sfregiato']);
  });
});
