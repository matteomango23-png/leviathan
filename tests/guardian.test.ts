import { describe, expect, it } from 'vitest';
import { GUARDIAN_FIGHT, LAIR } from '../src/data/guardians';
import { TILE, WORLD } from '../src/data/worldLayout';
import { GUARDIAN_TEETH_REWARD } from '../src/data/world';
import { finishTaming, weaponHitsBeast } from '../src/systems/beastFights';
import { isInWater } from '../src/systems/beasts/wild';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../src/systems/game';
import { activeGuardian, stepGuardian } from '../src/systems/guardian';
import { emptyInput } from '../src/systems/input';
import { parseSave, serializeSave } from '../src/systems/save/saveData';
import { inLairCave, lairRoofY } from '../src/systems/world/lair';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const fresh = (): GameState => createGame(map, null, 7); // the fight never changes the map

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

function run(g: GameState, seconds: number, safe = true): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    if (safe) {
      g.diver.invulnerable = 5;
      g.diver.o2 = g.diver.maxO2;
    }
    all.push(...stepGame(g, emptyInput(), 1 / 30));
  }
  return all;
}

const boss = (g: GameState) => g.beasts.wilds.find((w) => w.guardian)!;
const intoCave = (g: GameState) => Object.assign(g.diver, { x: LAIR.x - 120, y: LAIR.y, vx: 0, vy: 0 });

function exhaust(g: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const b = boss(g);
  for (let i = 0; i < 200 && b.mood !== 'tired'; i++) weaponHitsBeast(g, b.x, b.y, 5, events);
  events.push(...stepGame(g, emptyInput(), 1 / 30));
  return events;
}

describe('the lair of Lo Sfregiato', () => {
  it('is a closed cave: only the shaft leads in, and bones close it', () => {
    const inside = reach(map, LAIR.x, LAIR.y);
    const surface = Math.floor((WORLD.surfaceY + 10) / WORLD.tileSize) * map.cols + 100;
    expect(inside.has(surface)).toBe(false);
    expect([...inside].every((i) => Math.floor(i / map.cols) * WORLD.tileSize < LAIR.y + LAIR.ry + 8)).toBe(
      true,
    );
    const open = generateWorld();
    for (const ty of LAIR.gateRows)
      for (let tx = 0; tx < open.cols; tx++)
        if (open.get(tx, ty) === TILE.bone && ty < 60) open.set(tx, ty, 0);
    expect(reach(open, LAIR.x, LAIR.y).has(surface)).toBe(true);
    expect(lairRoofY()).toBeGreaterThan(WORLD.surfaceY);
  });
});

describe('the Guardian fight', () => {
  it('starts when you swim into the cave, and keeps the other beasts away', () => {
    const g = fresh();
    intoCave(g);
    const ev = run(g, 0.2);
    expect(ev.some((e) => e.type === 'guardianAppeared')).toBe(true);
    expect(isInWater(boss(g))).toBe(true);
    expect(boss(g).level).toBe(8);
    expect(g.beasts.arena).toBe(true);
    expect(activeGuardian(g)).toBe(boss(g));
  });

  it('stays inside its cave, turning at the walls', () => {
    const g = fresh();
    intoCave(g);
    run(g, 20);
    const b = boss(g);
    expect(isInWater(b)).toBe(true);
    expect(inLairCave(b.x, b.y)).toBe(true);
  });

  it('rages below 70% and calls two sharks below half', () => {
    const g = fresh();
    intoCave(g);
    run(g, 0.1);
    const b = boss(g);
    b.hp = b.maxHp * (GUARDIAN_FIGHT.phase2HpFraction - 0.05);
    expect(run(g, 0.1).some((e) => e.type === 'guardianRage')).toBe(true);
    b.hp = b.maxHp * (GUARDIAN_FIGHT.escortHpFraction - 0.05);
    expect(run(g, 0.1).some((e) => e.type === 'guardianCalls')).toBe(true);
    const escort = g.beasts.wilds.filter((w) => w.arena && !w.guardian && isInWater(w));
    expect(escort).toHaveLength(GUARDIAN_FIGHT.escortCount);
  });

  it('exhausted: 800 teeth and a new mythic harpoon, only the first time', () => {
    const g = fresh();
    g.gear.mythicStock = 0;
    intoCave(g);
    run(g, 0.1);
    const ev = exhaust(g);
    expect(ev).toContainEqual({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
    expect(g.gear.teeth).toBe(GUARDIAN_TEETH_REWARD);
    expect(g.gear.mythicStock).toBe(1);
    expect(g.gear.guardians).toContain('sfregiato');
    // leave it exhausted (it slips away), visit the port, come back: a new fight gives no teeth
    g.diver.y = WORLD.surfaceY + 20;
    run(g, 0.1);
    expect(g.guardian.ready).toBe(false);
    enterPort(g);
    intoCave(g);
    run(g, 0.1);
    expect(exhaust(g)).toContainEqual({ type: 'guardianBeaten', teeth: 0 });
    expect(g.gear.teeth).toBe(GUARDIAN_TEETH_REWARD);
  });

  it('leaving the cave or dying resets it at full health', () => {
    const g = fresh();
    intoCave(g);
    run(g, 0.1);
    boss(g).hp = 5;
    g.diver.y = WORLD.surfaceY + 20;
    expect(run(g, 0.1).some((e) => e.type === 'guardianLeft')).toBe(true);
    expect(isInWater(boss(g))).toBe(false);
    expect(g.beasts.arena).toBe(false);
    intoCave(g);
    run(g, 0.1);
    expect(boss(g).hp).toBe(boss(g).maxHp);
  });

  it('a failed taming makes it escape until your next visit to the port', () => {
    const g = fresh();
    intoCave(g);
    run(g, 0.1);
    exhaust(g);
    const events: GameEvent[] = [];
    finishTaming(g, boss(g), false, events); // thrown off: 'tamingFailed'
    stepGuardian(g, 1 / 30, events);
    expect(events).toContainEqual({ type: 'guardianEscaped' });
    expect(g.guardian.ready).toBe(false);
    run(g, GUARDIAN_FIGHT.fleeSeconds + 1);
    expect(isInWater(boss(g))).toBe(false);
    expect(g.beasts.arena).toBe(false);
    enterPort(g);
    expect(g.guardian.ready).toBe(true);
  });

  it('tamed: it joins your team as Lo Sfregiato and the lair stays empty', () => {
    const g = fresh();
    intoCave(g);
    run(g, 0.1);
    exhaust(g);
    finishTaming(g, boss(g), true, []);
    run(g, 0.1);
    expect(g.beasts.team.some((b) => b.form.unique === 'sfregiato')).toBe(true);
    expect(g.guardian.status).toBe('idle');
    g.diver.y = WORLD.surfaceY + 20;
    run(g, 0.1);
    intoCave(g);
    expect(run(g, 0.5).some((e) => e.type === 'guardianAppeared')).toBe(false);
  });

  it('beaten Guardians are saved', () => {
    const g = fresh();
    g.gear.guardians.push('sfregiato');
    expect(parseSave(serializeSave(toSave(g, new Date()))).gear?.guardians).toEqual(['sfregiato']);
  });

  it('comes back after escaping only once you visit the port', () => {
    const g = fresh();
    g.guardian.ready = false;
    intoCave(g);
    expect(run(g, 0.2).some((e) => e.type === 'guardianAppeared')).toBe(false);
    enterPort(g);
    intoCave(g);
    expect(run(g, 0.2).some((e) => e.type === 'guardianAppeared')).toBe(true);
  });
});
