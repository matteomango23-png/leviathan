// Owner, 9 ottobre 2026: air on a timer in the submarines too (the bigger, the more), the U-Boats the most; the whales
// no longer lend you theirs and the suits give only a little more. The submarine's air goes down under water, fills
// again at the surface or in the hold, warns 30 seconds before the end and at zero rises by itself.
import { describe, expect, it } from 'vitest';
import { SHIP_MODELS } from '../src/data/fleet';
import { SUB_MODELS, SUBMARINE } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { emptyInput } from '../src/systems/input';
import { restSubAir, stepSubAir, subUnder } from '../src/systems/subAir';
import { stepSub } from '../src/systems/submarine';
import { subTopY } from '../src/systems/subState';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveSub } from './helpers/vessels';

const DT = 1 / 30;

describe('the submarine’s air', () => {
  it('the bigger the vehicle, the more air; the U-Boats more than any submarine', () => {
    const subs = [...SUB_MODELS].sort((a, b) => a.lengthM - b.lengthM);
    for (let i = 1; i < subs.length; i++)
      expect(subs[i]!.airSeconds).toBeGreaterThanOrEqual(subs[i - 1]!.airSeconds);
    const most = Math.max(...SUB_MODELS.map((m) => m.airSeconds));
    for (const m of SHIP_MODELS) if (m.dive) expect(m.dive.airSeconds).toBeGreaterThan(most);
  });

  it('under water it goes down, warns at 30 s, at zero rises by itself; at the surface it fills again', () => {
    const s = { y: WORLD.surfaceY + 300, vy: 0, air: SUBMARINE.air.warnAt + 1 };
    const ev: GameEvent[] = [];
    for (let t = 0; t < 2; t += DT) stepSubAir(s, 120, DT, ev);
    expect(ev.some((e) => e.type === 'subAir')).toBe(true);
    s.air = 0.01;
    s.vy = 50; // the lever down
    stepSubAir(s, 120, DT, ev);
    expect(ev.some((e) => e.type === 'subSurfacing')).toBe(true);
    expect(s.vy).toBeLessThan(0);
    const up = { y: SUBMARINE.restY, vy: 0, air: 0 };
    expect(subUnder(up)).toBe(false);
    for (let t = 0; t < 5; t += DT) stepSubAir(up, 120, DT, []);
    expect(up.air).toBeGreaterThan(20);
    const held = { y: WORLD.surfaceY + 300, vy: 0, air: 0 };
    restSubAir(held, 120, true, 1);
    expect(held.air).toBeGreaterThan(0); // in the ship's hold it breathes too
  });

  it('it runs out driving deep, and is saved', () => {
    const map = generateWorld();
    const g = createGame(map, null, 4);
    giveSub(g, 2600);
    Object.assign(g.sub, { aboard: true, y: WORLD.surfaceY + 200 });
    const full = g.sub.air;
    for (let t = 0; t < 5; t += DT) stepSubAir(g.sub, full, DT, []);
    expect(g.sub.air).toBeLessThan(full);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.sub.air).toBeCloseTo(Math.round(g.sub.air), 0);
  });
});

describe('surfaced (owner, 9 ottobre: "a block kept them under the water line")', () => {
  it('near the surface, the dive lever let go, it rises with its deck and tower out of the water', () => {
    const g = createGame(generateWorld(), null, 4);
    giveSub(g, 2600);
    Object.assign(g.sub, { aboard: true, y: SUBMARINE.restY + 4, vy: 0 });
    for (let t = 0; t < 4; t += DT) stepSub(g, emptyInput(), DT, []);
    expect(g.sub.y).toBeLessThan(WORLD.surfaceY);
    expect(g.sub.y).toBeCloseTo(subTopY(g.sub), 0);
  });
});
