// Lot C5 (owner, 25 ottobre 2026): ridges at a fixed height per region, a U-Boat breaking the ice it touches, and
// coming up fast a submarine or a U-Boat leaves the water a little and falls back (no invisible wall, no leap).
import { beforeAll, describe, expect, it } from 'vitest';
import { SEA_LOOKS, SEA_RIDGE_SINK } from '../src/data/seaLooks';
import { SHIP } from '../src/data/ship';
import { SUBMARINE } from '../src/data/submarine';
import { TILE, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { shipHeight } from '../src/systems/ship/geometry';
import { newShip } from '../src/systems/ship/ship';
import { hullBlocked, smashIce, stepDive, stepHop } from '../src/systems/ship/uboat';
import { stepSub, subLength, subTopY } from '../src/systems/submarine';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveSub } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const uboat = (x: number, dive: number) =>
  newShip({ x, face: 1, hatches: [], bay: 'none', aboard: true, fuel: 1, model: 'abissale', dive });

describe('le montagne di sfondo', () => {
  it('ogni regione ha la sua altezza fissa (non il fondale sotto di te)', () => {
    for (const id of Object.keys(SEA_LOOKS))
      expect(SEA_RIDGE_SINK[id as keyof typeof SEA_LOOKS], id).toBeDefined();
  });
});

describe('gli U-Boot rompono il ghiaccio', () => {
  it('appena sotto la superficie, il ghiaccio che tocca si rompe e non lo blocca', () => {
    // a block of ice in open water, where the hull will be
    const s = uboat(60000, 20);
    const T = map.tileSize;
    // a wall of ice across its whole height, where its bow is
    const bow = Math.floor((s.x + shipHeight(s) * 0.9) / T);
    const top = Math.floor((WORLD.surfaceY - shipHeight(s)) / T);
    for (let tx = bow - 2; tx <= bow + 2; tx++)
      for (let ty = top; ty * T < WORLD.surfaceY + 20 + shipHeight(s); ty++) map.set(tx, ty, TILE.ice);
    const before = hullBlocked(map, s, s.x, s.dive);
    const broken = smashIce(map, s, s.x, s.dive);
    expect(before).toBe(true);
    expect(broken.length).toBeGreaterThan(0);
    expect(hullBlocked(map, s, s.x, s.dive)).toBe(false);
  });
});

describe('uscire dall’acqua a tutta velocità', () => {
  it('il sottomarino esce un poco e ricade; piano si ferma alla superficie', () => {
    const run = (vy: number): { top: number; splash: boolean } => {
      const g = createGame(map, null, 4);
      giveSub(g);
      const top = subTopY(g.sub);
      Object.assign(g.sub, { aboard: true, x: SUBMARINE.mooredX, y: top + 4, vx: 0, vy, air: 100 });
      const input = emptyInput();
      input.helm.dive = vy < -60 ? -1 : 0;
      let highest = g.sub.y;
      let splash = false;
      for (let t = 0; t < 3; t += 1 / 60) {
        const ev: GameEvent[] = [];
        stepSub(g, input, 1 / 60, ev);
        highest = Math.min(highest, g.sub.y);
        if (ev.some((e) => e.type === 'breachSplash')) splash = true;
      }
      return { top: top - highest, splash };
    };
    const g = createGame(map, null, 4);
    giveSub(g);
    const fast = run(-200);
    expect(fast.top).toBeGreaterThan(1);
    expect(fast.top).toBeLessThanOrEqual(SUBMARINE.hop.maxShare * subLength(g.sub) + 0.5);
    expect(fast.splash).toBe(true);
    expect(run(-20).top).toBeLessThan(0.5);
  });

  it('l’U-Boot salendo veloce esce un poco e ricade', () => {
    const s = uboat(60000, 4);
    const ev: GameEvent[] = [];
    const helm = { ...emptyInput().helm, dive: -1 };
    stepDive(map, s, helm, 1 / 10, ev);
    expect(s.dive).toBe(0);
    expect(s.hopV).toBeGreaterThan(0);
    let highest = 0;
    for (let t = 0; t < 3; t += 1 / 60) {
      stepHop(s, 1 / 60, ev);
      highest = Math.max(highest, s.hop ?? 0);
    }
    expect(highest).toBeGreaterThan(0);
    expect(highest).toBeLessThanOrEqual(SHIP.hop.maxShare * shipHeight(s) + 0.5);
    expect(s.hop).toBeUndefined();
    expect(ev.some((e) => e.type === 'breachSplash')).toBe(true);
  });
});
