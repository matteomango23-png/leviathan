// Lotto J (owner, 16 ottobre 2026): on a beast you ride, racing up to the surface it leaps out of the water like in
// Angry Shark, arcs through the air and splashes back; in the air it can snap up a gull. Since 19 ottobre the surface
// is soft water (lottoL.test.ts): no threshold, the faster the higher.
import { beforeAll, describe, expect, it } from 'vitest';
import { RIDE_BREACH } from '../src/data/beasts';
import { bay, WORLD } from '../src/data/worldLayout';
import { rideTop } from '../src/systems/breach';
import { createDiver, stepDiver, type DiverState } from '../src/systems/diver';
import { createBirds, eatBirdsNear } from '../src/systems/birds';
import { mountAteBird } from '../src/systems/beastPlay';
import { makeTeamBeast, maxHpOf } from '../src/systems/beasts/team';
import { createGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import type { GameEvent } from '../src/systems/events';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const SPEED = 55; // a white shark ridden, units/s
const DT = 1 / 60;

/** A rider just under the surface, coming up at `up` units/s; flown until back in the water (or 6 s). */
function leap(
  up: number,
  mounted = true,
  how: { sprint?: boolean; dash?: boolean } = { sprint: true },
): { d: DiverState; events: GameEvent[]; top: number } {
  const d = createDiver(bay(1000), rideTop(WORLD.surfaceY) + 2);
  d.vy = -up;
  if (how.dash) d.dashTime = 0.35; // a dash: no speed cap while it lasts
  const events: GameEvent[] = [];
  let top = d.y;
  const input = { ...emptyInput(), moveY: -1, dashHeld: !!how.sprint };
  for (let t = 0; t < 6; t += DT) {
    stepDiver(d, input, map, DT, makeRng(1), events, {
      respawnAt: { x: bay(1000), y: 100 },
      ...(mounted ? { mountSpeed: SPEED, mountSprint: 1.45 } : {}),
    });
    top = Math.min(top, d.y);
    if (events.some((e) => e.type === 'breachSplash')) break;
  }
  return { d, events, top };
}

const heightM = (top: number): number => (rideTop(WORLD.surfaceY) - top) / WORLD.unitsPerMetre;

describe('il salto fuori dall’acqua', () => {
  it('salendo forte la bestia esce, vola e ricade con uno spruzzo', () => {
    const { d, events, top } = leap(SPEED * 1.45);
    const kinds = events.map((e) => e.type);
    expect(kinds).toContain('breach');
    expect(kinds).toContain('breachSplash');
    expect(kinds.indexOf('breach')).toBeLessThan(kinds.indexOf('breachSplash'));
    expect(top).toBeLessThan(WORLD.surfaceY); // above the water
    expect(d.airborne).toBe(false);
  });

  it('a velocità normale niente spruzzo grande: al massimo un saltino (19 ottobre)', () => {
    const { events, top } = leap(SPEED * 0.9, true, {}); // swimming up at its cruising speed
    expect(events.some((e) => e.type === 'breach')).toBe(false);
    expect(top).toBeGreaterThan(WORLD.surfaceY - 1.5 * WORLD.unitsPerMetre);
  });

  it('a piedi il sub non salta mai', () => {
    const { events } = leap(200, false);
    expect(events.some((e) => e.type === 'breach')).toBe(false);
  });

  it('lo scatto va più in alto dello sprint, ma non oltre il massimo', () => {
    const sprint = heightM(leap(SPEED * 1.45).top);
    const dash = heightM(leap(SPEED * 2.4, true, { dash: true }).top);
    const cap = heightM(leap(1000, true, { dash: true }).top);
    expect(sprint).toBeGreaterThan(1);
    expect(dash).toBeGreaterThan(sprint);
    expect(cap).toBeLessThanOrEqual(
      RIDE_BREACH.maxLeapSpeed ** 2 / (2 * RIDE_BREACH.gravity) / WORLD.unitsPerMetre + 2.5, // + the swim line
    );
  });
});

describe('gli uccelli presi al volo', () => {
  it('solo quelli vicino alla bocca', () => {
    const s = createBirds(3);
    const f = s.flocks[0]!;
    f.active = true;
    f.birds = [0, 30].map((x) => ({
      x,
      y: 0,
      vx: 0,
      vy: 0,
      ox: 0,
      oy: 0,
      phase: 0,
      flapHz: 1,
      glide: 0,
      dive: 'none' as const,
      diveX: 0,
    }));
    expect(eatBirdsNear(s, 2, 0, 5)).toHaveLength(1);
    expect(f.birds.map((b) => b.x)).toEqual([30]);
  });

  it('la bestia cavalcata recupera un po’ di vita, mai oltre il massimo', () => {
    const g = createGame(map, null, 4);
    const b = makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, 20, true);
    g.beasts.team.push(b);
    g.beasts.mount = { ...(g.beasts.mount ?? {}), uid: 'b1' } as typeof g.beasts.mount;
    g.beasts.riding = true;
    b.hp = maxHpOf(b) - 1;
    const ev: GameEvent[] = [];
    mountAteBird(g, 0, 0, ev);
    expect(b.hp).toBe(maxHpOf(b));
    expect(ev[0]).toMatchObject({ type: 'birdEaten', healed: 1 });
  });
});
