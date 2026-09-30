// Riding and big-beast behaviour after the owner's feedback (v0.3.1).
import { beforeAll, describe, expect, it } from 'vitest';
import { BEAST_TEMPER, TEAM_RULES } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { createBeasts } from '../src/systems/beastPlay';
import { summonCompanion } from '../src/systems/beasts/companion';
import { formLengthM, formStats } from '../src/systems/beasts/forms';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput } from '../src/systems/input';
import { generateWorld } from '../src/systems/world/worldGen';
import type { TileMap } from '../src/systems/world/tileMap';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function ridingShark(level = 5): GameState {
  const g = createGame(map, null, 3);
  g.beasts = createBeasts([
    makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, level, true),
  ]);
  g.diver.x = 900;
  g.diver.y = 200;
  g.beasts.companion = summonCompanion(g.beasts.team[0]!, g.diver, map);
  Object.assign(g.beasts.companion, { x: 900, y: 200, face: 1 });
  g.beasts.riding = true;
  return g;
}

describe('riding', () => {
  it('is faster than swimming, and the dash works in the saddle', () => {
    const g = ridingShark();
    const input = { ...emptyInput(), moveX: 1 };
    for (let i = 0; i < 60; i++) {
      stepGame(g, input, 1 / 60);
      consumePresses(input);
    }
    const cruise = Math.hypot(g.diver.vx, g.diver.vy);
    const shark = formStats({ speciesId: 'squalo_bianco', variant: 'comune' }, 5).speed;
    expect(cruise).toBeGreaterThan(DIVER.maxSpeed * 2);
    expect(cruise).toBeCloseTo(shark * TEAM_RULES.rideSpeedMult, -1);
    const ev = stepGame(g, { ...emptyInput(), moveX: 1, dash: true }, 1 / 60);
    expect(ev.some((e) => e.type === 'dash')).toBe(true);
    expect(Math.hypot(g.diver.vx, g.diver.vy)).toBeGreaterThan(cruise * 1.8);
  });

  it('a bite lunges forward', () => {
    const g = ridingShark();
    stepGame(g, emptyInput(), 1 / 60);
    const before = g.diver.vx;
    stepGame(g, { ...emptyInput(), move: 1 }, 1 / 60);
    expect(g.diver.vx).toBeGreaterThan(before + 50);
  });

  it('a big beast eats the fish it swims through (bag or hearts)', () => {
    const g = ridingShark();
    g.diver.hp = g.diver.maxHp;
    const c = g.beasts.companion!;
    for (const f of g.fish.fish) {
      f.alive = false;
      f.respawn = 999;
    }
    const f = g.fish.fish.find((x) => x.kind === 'sardina')!;
    f.alive = true;
    f.x = c.x + c.length * 0.45;
    f.y = c.y;
    stepGame(g, emptyInput(), 1 / 60);
    expect(g.gear.bag.sardina).toBe(1);
  });
});

describe('sea turtle', () => {
  it('is 2 m long (the owner chose a giant turtle) and swims slower than the shark', () => {
    expect(formLengthM({ speciesId: 'tartaruga_marina', variant: 'comune' })).toBe(2);
    expect(BEAST_TEMPER.tartaruga_marina!.speedMult).toBeLessThan(1);
  });
});
