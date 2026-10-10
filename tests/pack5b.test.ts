// Block 5b (owner, 9 ottobre 2026): the light under the still ship calls the beasts (the curious ones at once, the
// hunters after a while); aggressive packs fight together, one after the other; packs hunt sardines, orcas chase
// smaller beasts.
import { beforeAll, describe, expect, it } from 'vitest';
import { PACK_RULES } from '../src/data/beasts';
import { ENDLESS } from '../src/data/endless';
import { SHIP } from '../src/data/ship';
import { WORLD } from '../src/data/worldLayout';
import { createBattle, endRound, nextFoe } from '../src/systems/battle/battle';
import { makeFighter } from '../src/systems/battle/fighter';
import { battleSetup, finishBattle } from '../src/systems/battleResult';
import { stepPackHunt } from '../src/systems/beasts/packHunt';
import { stepRoam } from '../src/systems/beasts/roam';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { lightCan, stepLight, toggleLight } from '../src/systems/ship/underLight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 30;
const km = WORLD.unitsPerMetre * 1000;

function atSea(): GameState {
  const g = createGame(map, null, 4);
  giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 20);
  giveVessels(g);
  Object.assign(g.ship, { aboard: true, x: ENDLESS.startX + 3 * km, speed: 0, fuel: 1000 });
  for (const w of g.beasts.wilds) w.motion = 'gone';
  return g;
}

/** A coast slot made into this beast here. */
function put(g: GameState, speciesId: string, x: number, y: number, n = 0): WildBeast {
  const w = g.beasts.wilds.filter((b) => !b.spawn.endless)[n]!;
  spawnWild(w, { speciesId, variant: 'comune' }, 8, x, y, 1);
  w.respawn = 1e9;
  return w;
}

describe('the light under the still ship', () => {
  it('only with the ship still; it burns fuel and goes off when the ship moves', () => {
    const g = atSea();
    const ev: GameEvent[] = [];
    g.ship.speed = 40;
    expect(lightCan(g)).toBe(false);
    toggleLight(g, ev);
    expect(g.ship.lightOn).toBe(false);
    g.ship.speed = 0;
    toggleLight(g, ev);
    expect(g.ship.lightOn).toBe(true);
    const fuel = g.ship.fuel;
    for (let t = 0; t < 60; t += 1) stepLight(g, 1, ev);
    expect(g.ship.fuel).toBeCloseTo(fuel - SHIP.underLight.litresPerMinute, 1);
    g.ship.speed = 40;
    stepLight(g, DT, ev);
    expect(g.ship.lightOn).toBe(false);
  });

  it('calls the curious ones at once, the hunters only after a while', () => {
    const g = atSea();
    const y = WORLD.surfaceY + 150;
    const calm = put(g, 'tartaruga_marina', g.ship.x + 400, y, 0);
    const hunter = put(g, 'squalo_tigre', g.ship.x - 400, y, 1);
    toggleLight(g, []);
    stepLight(g, DT, []);
    expect(calm.drawn).not.toBeNull();
    expect(hunter.drawn).toBeNull();
    for (let t = 0; t < SHIP.underLight.predatorsAfter + SHIP.underLight.pulseSeconds; t += 1)
      stepLight(g, 1, []);
    expect(hunter.drawn).not.toBeNull();
  });

  it('a beast called swims to the ship even out of its own waters', () => {
    const g = atSea();
    const w = put(g, 'tartaruga_marina', 0, 0);
    w.spawn = {
      ...w.spawn,
      area: [g.ship.x + 500, WORLD.surfaceY + 50, g.ship.x + 800, WORLD.surfaceY + 300],
    };
    Object.assign(w, { x: g.ship.x + 650, y: WORLD.surfaceY + 150 });
    w.drawn = { x: g.ship.x, y: WORLD.surfaceY + 120 };
    const d0 = Math.abs(w.x - g.ship.x);
    const ctx = {
      diver: { x: g.ship.x, y: WORLD.surfaceY - 30, dead: false },
      map,
      rng: g.rng,
      dt: DT,
      hidden: false,
    };
    for (let t = 0; t < 40; t += DT) stepRoam(w, ctx);
    expect(Math.abs(w.x - g.ship.x)).toBeLessThan(d0 - 300);
    expect(w.x).toBeLessThan(g.ship.x + 500); // out of its waters
  });
});

describe('packs that fight together', () => {
  it('the next one comes in when one is beaten; won only when all are down', () => {
    const f = (lv: number) => makeFighter({ speciesId: 'barracuda', variant: 'comune' }, lv);
    const s = createBattle([makeFighter({ speciesId: 'squalo_bianco', variant: 'comune' }, 20)], f(5), [
      f(5),
      f(6),
    ]);
    s.foe.hp = 0;
    endRound(s);
    expect(s.over).toBeNull();
    expect(nextFoe(s)).toBe(true);
    expect(s.defeated.length).toBe(1);
    expect(s.foe.hp).toBeGreaterThan(0);
    s.foe.hp = 0;
    nextFoe(s);
    s.foe.hp = 0;
    expect(nextFoe(s)).toBe(false);
    endRound(s);
    expect(s.over).toBe('won');
    expect(s.defeated.length).toBe(2);
  });

  it('an aggressive pack brings its mates into the battle; a shy one does not', () => {
    const g = atSea();
    const b = put(g, 'barracuda', g.ship.x, WORLD.surfaceY + 100, 0);
    g.beasts.battle = { wildId: b.id, first: 'normal' };
    expect(battleSetup(g)!.state.reserve.length).toBe(b.pack);
    expect(b.pack).toBeGreaterThan(0);
    const t = put(g, 'tonno', g.ship.x, WORLD.surfaceY + 100, 1);
    g.beasts.battle = { wildId: t.id, first: 'normal' };
    expect(battleSetup(g)!.state.reserve.length).toBe(0);
  });

  it('fleeing leaves the pack smaller; each one beaten gives experience', () => {
    const g = atSea();
    const b = put(g, 'barracuda', g.ship.x, WORLD.surfaceY + 100);
    const me = g.beasts.team[0]!;
    const [xp, level] = [me.xp, me.level];
    finishBattle(g, {
      wildId: b.id,
      over: 'fled',
      team: [{ uid: me.uid, hp: 10 }],
      lastActive: me.uid,
      foe: { form: b.form, level: 8, hp: 5 },
      defeated: [{ form: b.form, level: 8 }],
      packLeft: 1,
    });
    expect(b.pack).toBe(1);
    // the one beaten before fleeing still gave experience
    expect(me.level > level || me.xp > xp).toBe(true);
  });
});

describe('packs that hunt', () => {
  it('a pack hunter goes after a sardine school near it and bites the fish at its mouth', () => {
    const g = atSea();
    const school = g.fish.schools[0]!;
    const b = put(g, 'barracuda', school.x - 60, school.y);
    b.lookT = 0;
    stepPackHunt(g, DT);
    expect(b.hunt?.school).toBe(0);
    const fish = g.fish.fish.find((f) => f.school === school && f.alive)!;
    Object.assign(fish, { x: b.x + b.face * b.length * 0.45, y: b.y });
    stepPackHunt(g, DT);
    expect(fish.alive).toBe(false);
  });

  it('an orca chases a far smaller beast, which flees from it', () => {
    const g = atSea();
    const y = WORLD.surfaceY + 150;
    const orca = put(g, 'orca', g.ship.x, y, 0);
    const prey = put(g, 'barracuda', g.ship.x + 150, y, 1);
    for (const s of g.fish.schools) Object.assign(s, { x: -1e6 });
    orca.lookT = 0;
    stepPackHunt(g, DT);
    expect(orca.hunt?.prey).toBe(prey.id);
    expect(prey.fleeFrom).not.toBeNull();
    expect(PACK_RULES.preyOf.orca).toBeGreaterThan(0);
  });

  it('nothing breaks in a running game with the light on', () => {
    const g = atSea();
    toggleLight(g, []);
    for (let t = 0; t < 20; t += DT) stepGame(g, emptyInput(), DT);
    expect(g.ship.lightOn).toBe(true);
  });
});
