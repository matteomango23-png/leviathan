// The big predators' patrol (owner, 15 ottobre 2026): passes by, out of the screen speeding up, back from the same
// side; bolts when followed; charges in the end.
import { beforeAll, describe, expect, it } from 'vitest';
import { PATROL } from '../src/data/beasts';
import { WORLD } from '../src/data/worldLayout';
import { stepRoam } from '../src/systems/beasts/roam';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import { createGame } from '../src/systems/game';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 30;

/** A white shark in open water near the diver, with a wide area so its passes are not cut short. */
function setup(roll: number): { w: WildBeast; diver: { x: number; y: number; dead: boolean; vx: number } } {
  const g = createGame(map, null, 4);
  const w = g.beasts.wilds.find((b) => !b.spawn.endless)!;
  const p = map.nearestOpen(3600, WORLD.surfaceY + 160, 40);
  w.spawn = {
    ...w.spawn,
    speciesId: 'squalo_bianco',
    area: [p.x - 3000, WORLD.surfaceY + 20, p.x + 3000, p.y + 300],
  };
  spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 10, p.x - 60, p.y, 1);
  const diver = { x: p.x, y: p.y, dead: false, vx: 0 };
  return { w, diver, ...{ roll } };
}

function run(
  w: WildBeast,
  diver: { x: number; y: number; dead: boolean; vx: number },
  seconds: number,
  rng: () => number,
  each?: (t: number) => void,
): boolean {
  const view = { x: diver.x - 260, y: diver.y - 140, width: 520, height: 280 };
  for (let t = 0; t < seconds; t += DT) {
    each?.(t);
    if (stepRoam(w, { diver, map, rng, dt: DT, hidden: false, view })) return true;
  }
  return false;
}

describe('the patrol of the big predators', () => {
  it('passes by without biting, leaves the screen and comes back from the same side', () => {
    const { w, diver } = setup(0);
    let calls = 0;
    // first roll: patrol (0 < chance); passes: 3; then no turn in view (rolls 0.9)
    const rng = (): number => [0, 0.99, 0.9][Math.min(2, calls++)] ?? 0.9;
    let leftAt = 0;
    let backFrom = 0;
    let wasOut = false;
    const view = { x: diver.x - 260, width: 520 };
    const touched = run(w, diver, 14, rng, () => {
      const out = w.x > view.x + view.width + w.length * 0.6 || w.x < view.x - w.length * 0.6;
      if (out && !wasOut && !leftAt) leftAt = Math.sign(w.x - diver.x);
      if (!out && wasOut && !backFrom) backFrom = Math.sign(w.x - diver.x);
      wasOut = out;
    });
    expect(w.patrolled).toBe(true);
    expect(leftAt).toBe(1); // it went out of the far edge
    expect(backFrom).toBe(1); // and came back in from that same side
    expect(touched).toBe(false);
  });

  it('bolts away when you follow it', () => {
    const { w, diver } = setup(0);
    let calls = 0;
    const rng = (): number => [0, 0.99, 0.9][Math.min(2, calls++)] ?? 0.9;
    run(w, diver, 0.5, rng);
    diver.vx = 40; // you follow it its way
    run(w, diver, 1.6, rng, () => (diver.x += diver.vx * DT));
    expect(w.patrol?.st === 'bolt' || w.patrol?.st === 'wait' || w.patrol === undefined).toBe(true);
  });

  it('not always: sometimes it charges at once', () => {
    const { w, diver } = setup(0);
    const rng = (): number => 0.99; // above PATROL.chance: no passes
    run(w, diver, 0.2, rng);
    expect(PATROL.chance).toBeLessThan(1);
    expect(w.patrol).toBeUndefined();
    expect(w.mood).toBe('chase');
  });
});
