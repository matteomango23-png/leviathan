// Lot X (20 ottobre 2026): the sea. Packs swim behind their leader without little jumps; the diver floats at the
// surface with its waves, no invisible wall and never out of the water; octopuses and squids wave their arms; the
// crab walks on the floor.
import { beforeAll, describe, expect, it } from 'vitest';
import { BEAST_SPRITE, CEPHALOPODS } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { WORLD, bay } from '../src/data/worldLayout';
import { floorNear, stepRoam } from '../src/systems/beasts/roam';
import { swimLook } from '../src/systems/beasts/forms';
import { bodyRadius } from '../src/systems/beasts/wildState';
import { createDiver, stepDiver } from '../src/systems/diver';
import { createGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { PackTrail } from '../src/views/packFormation';
import { spineOf } from '../src/views/swimPose';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 60;

describe('a pack follows its leader smoothly (owner: "piccoli scatti")', () => {
  it('a mate moves a little every frame, never standing still and then jumping', () => {
    const trail = new PackTrail();
    const steps: number[] = [];
    let last: number | undefined;
    for (let i = 0; i < 180; i++) {
      const t = i * DT;
      trail.push({ t, x: t * 60, y: 0, face: 1, pitch: 0 }, 'wander', DT);
      const m = trail.mate(t, 0, 40, t);
      if (m && t > 1) {
        if (last !== undefined) steps.push(m.x - last);
        last = m.x;
      }
    }
    expect(Math.min(...steps)).toBeGreaterThan(0.5);
    expect(Math.max(...steps)).toBeLessThan(1.5); // the leader moves 1 unit a frame: so do its mates
  });
});

describe('the diver floats at the surface (owner: "muro invisibile… galleggiare… tra un\'onda e l\'altra")', () => {
  const start = () => createDiver(bay(340), WORLD.surfaceY + 70);

  it('coming up fast he slows before the surface instead of hitting a wall, and never leaves the water', () => {
    const d = start();
    const up = { ...emptyInput(), moveY: -1 };
    let worstStop = 0;
    let prevVy = d.vy;
    for (let i = 0; i < 300; i++) {
      stepDiver(d, i === 5 ? { ...up, dash: true } : up, map, DT, makeRng(1), []);
      expect(d.y).toBeGreaterThanOrEqual(WORLD.surfaceY);
      // near the surface only (the end of the dash, deeper, slows him as it always did)
      if (d.y - WORLD.surfaceY < DIVER.float.band * 2) worstStop = Math.max(worstStop, d.vy - prevVy);
      prevVy = d.vy;
    }
    // the old wall took all his speed (42 u/s and more) away in one frame
    expect(worstStop).toBeLessThan(DIVER.maxSpeed * 0.5);
    expect(d.y - WORLD.surfaceY).toBeLessThan(DIVER.float.band);
  });

  it('still at the surface he floats there and does not sink', () => {
    const d = start();
    d.y = WORLD.surfaceY + DIVER.float.rest;
    for (let i = 0; i < 600; i++) stepDiver(d, emptyInput(), map, DT, makeRng(1), []);
    expect(Math.abs(d.y - WORLD.surfaceY - DIVER.float.rest)).toBeLessThan(2);
  });

  it('he rises and falls with the wave over him', () => {
    const d = start();
    d.y = WORLD.surfaceY + DIVER.float.rest;
    let worst = 0;
    for (let i = 0; i < 600; i++) {
      const line = WORLD.surfaceY - 10 * Math.sin(i * DT * 1.2);
      stepDiver(d, emptyInput(), map, DT, makeRng(1), [], { respawnAt: { x: 0, y: 0 }, waterLine: line });
      expect(d.y).toBeGreaterThanOrEqual(line);
      if (i > 120) worst = Math.max(worst, Math.abs(d.y - line - DIVER.float.rest));
    }
    expect(worst).toBeLessThan(5); // the old flat line left him 10 units off the wave
  });
});

describe('octopuses and squids wave their arms (owner: "troppo statici")', () => {
  it('the mantle stays whole, the arms move and open, no piece shortens', () => {
    expect(CEPHALOPODS).toEqual(expect.arrayContaining(['polpo_gigante', 'calamaro_gigante', 'piovra']));
    expect(swimLook({ speciesId: 'piovra', variant: 'comune' }).cephalopod).toBe(true);
    const SEG = BEAST_SPRITE.frameW / BEAST_SPRITE.segments;
    const a = spineOf({ pitch: 0, pitchV: 0, phase: 0.5, cephalopod: true });
    const b = spineOf({ pitch: 0, pitchV: 0, phase: 2.5, cephalopod: true });
    for (const l of a.lens) expect(l).toBeCloseTo(SEG, 6);
    const mantle = Math.round(BEAST_SPRITE.segments * BEAST_SPRITE.cephalopodWave.from * 0.9);
    for (let i = 0; i < mantle; i++) {
      expect(a.ang[i]).toBeCloseTo(b.ang[i]!, 6);
      expect(a.tall[i]).toBe(1);
    }
    const tip = a.ang.length - 1;
    expect(Math.abs(a.ang[tip]! - b.ang[tip]!)).toBeGreaterThan(0.1);
    expect(Math.abs(a.tall[tip]! - b.tall[tip]!)).toBeGreaterThan(0.05);
  });
});

describe('the crab walks on the floor (owner: "non può fluttuare come un pesce")', () => {
  it('wandering, called by the light under the ship or chasing, it keeps to the floor', () => {
    const g = createGame(map, null, 4);
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'granchio_ragno')!;
    expect(swimLook(w.form).walker).toBe(true);
    const diver = { x: w.x, y: WORLD.surfaceY + 10, dead: false };
    w.drawn = { x: w.x + 200, y: WORLD.surfaceY + 30 }; // the light calls it up
    let worst = 0;
    for (let i = 0; i < 1200; i++) {
      stepRoam(w, { diver, map: g.map, rng: g.rng, dt: DT, hidden: false });
      if (i === 600) [w.drawn, w.mood] = [null, 'flee'];
      if (i > 120) worst = Math.max(worst, floorNear(g.map, w.x, w.y) - bodyRadius(w) - w.y);
    }
    expect(worst).toBeLessThan(bodyRadius(w) * 2 + 12);
  });
});
