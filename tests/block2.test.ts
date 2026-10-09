// Block 2 of the owner's feedback (8 ottobre 2026): each test would have caught the problem.
import { describe, expect, it } from 'vitest';
import { BAG, OUTPOSTS, PORTO_FANGO } from '../src/data/economy';
import { ENDLESS } from '../src/data/endless';
import { XP_RULES } from '../src/data/progression';
import { SHIP } from '../src/data/ship';
import { FISH } from '../src/data/world';
import { WORLD } from '../src/data/worldLayout';
import { headOf } from '../src/systems/beasts/combat';
import { tailUpDown } from '../src/systems/beasts/forms';
import { fishXp } from '../src/systems/beasts/growth';
import { LEGEND_GIANTS } from '../src/systems/beasts/legends';
import { callMount } from '../src/systems/beasts/mount';
import { wanderPoint } from '../src/systems/beasts/roam';
import { catchFish } from '../src/systems/catching';
import { bagCount } from '../src/systems/economy/gear';
import { shipAlongside } from '../src/systems/economy/places';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { emptyInput, type InputState } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import { rideTank } from '../src/systems/rideAir';
import { launchShown, launchSub, stepBay } from '../src/systems/ship/hatch';
import { engineHeard, newShip, sailShip, saveShip, type ShipWorld } from '../src/systems/ship/ship';
import { iceIn } from '../src/systems/ship/surface';
import { subModel } from '../src/systems/submarine';
import { giveTestBeast } from '../src/systems/testTools';
import { icebergAcross, icebergsOfStretch } from '../src/systems/world/icebergs';
import { biomeOf } from '../src/systems/world/stretches';
import { generateWorld } from '../src/systems/world/worldGen';
import { zoneAt } from '../src/systems/world/zones';
import { giveSub, giveVessels } from './helpers/vessels';

const map = generateWorld();
const DT = 1 / 30;

function run(g: GameState, seconds: number, input: InputState = emptyInput()): void {
  for (let t = 0; t < seconds; t += DT) stepGame(g, input, DT);
}

/** Riding a beast of yours at (x, y). */
function riding(speciesId: string, level: number, x: number, y: number): GameState {
  const g = createGame(map, null, 2);
  giveTestBeast(g, { speciesId, variant: 'comune' }, level);
  Object.assign(g.diver, { x, y, vx: 0, vy: 0 });
  const c = callMount(g.beasts.team[0]!, g.diver, map);
  Object.assign(c, { x, y, state: 'ride' });
  g.beasts.mount = c;
  g.beasts.riding = true;
  return g;
}

describe('the air of the whales (owner, 9 ottobre: they no longer lend you theirs)', () => {
  it.each(['megattera', 'capodoglio', 'livyatan'])('riding a %s, you breathe your own air', (id) => {
    const g = riding(id, 20, 2600, 200);
    run(g, DT);
    expect(rideTank(g, g.rideTanks, g.diver.maxO2)).toBeUndefined();
  });
});

describe('the engine of the ship (owner: in neutral it burnt fuel, and nothing switched it off)', () => {
  const still = (engineOn: boolean): ShipWorld => ({
    ship: newShip({
      x: 20000,
      face: 1,
      hatches: [],
      bay: 'docked',
      aboard: true,
      fuel: 100,
      model: 'aurelia',
      engineOn,
    }),
    map,
    sub: { owned: true, aboard: false },
    diver: { x: 20000, y: 0, vx: 0, vy: 0, face: 1 },
  });
  const helm = (throttle: number) => ({ throttle, dir: 1 as const, dive: 0 });

  it('running and still, it burns a little; off, nothing', () => {
    const on = still(true);
    for (let t = 0; t < 60; t += 0.5) sailShip(on, helm(0), 0.5, [], () => false);
    expect(on.ship.fuel).toBeCloseTo(100 - SHIP.fuel.idlePerMinute, 5);
    const off = still(false);
    for (let t = 0; t < 60; t += 0.5) sailShip(off, helm(0), 0.5, [], () => false);
    expect(off.ship.fuel).toBe(100);
  });

  it('the throttle starts it; the button switches it off and the throttle goes back to zero', () => {
    const w = still(false);
    sailShip(w, helm(0.5), 0.1, [], () => false);
    expect(w.ship.engineOn).toBe(true);
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.aboard = true;
    g.ship.engineOn = true;
    const input: InputState = { ...emptyInput(), helmCmd: 'engine' };
    input.helm.throttle = 0.7;
    stepGame(g, input, DT);
    expect(g.ship.engineOn).toBe(false);
    expect(input.helm.throttle).toBe(0);
  });

  it('it is saved; an older save has it off', () => {
    const base = {
      x: 20000,
      face: 1 as const,
      hatches: [],
      bay: 'none' as const,
      aboard: false,
      fuel: 9,
    };
    expect(
      saveShip({ ...newShip({ ...base, model: 'aurelia', engineOn: true }), owned: true })?.engineOn,
    ).toBe(true);
    expect(newShip({ ...base, model: 'aurelia' }).engineOn).toBe(false);
  });

  it('you hear it only while it runs, less the farther you swim', () => {
    const s = still(true).ship;
    expect(engineHeard({ ...s, engineOn: false }, { x: s.x, y: 0 }, 1, 500)).toBeNull();
    expect(engineHeard(s, { x: s.x, y: 0 }, 0.4, 500)).toEqual({ level: 0.4, near: 1 });
    const away = { ...s, aboard: false };
    expect(engineHeard(away, { x: s.x + 250, y: WORLD.surfaceY }, 0, 500)?.near).toBeCloseTo(0.5);
    expect(engineHeard(away, { x: s.x + 900, y: WORLD.surfaceY }, 0, 500)?.near).toBe(0);
  });
});

describe('the ice (owner: entering the Banchisa capped the ship at 10 knots)', () => {
  it('the ice sheet of the Banchisa does not count as an iceberg (there are none out there for now)', () => {
    let k = 0;
    while (!biomeOf(k).ice && k < 300) k++;
    expect(biomeOf(k).ice).toBeTruthy();
    expect(icebergsOfStretch(k)).toHaveLength(0); // owner, 5 ottobre: no icebergs in the endless sea for now
    const x0 = ENDLESS.startX + k * ENDLESS.stretch;
    let at = 0;
    for (let x = x0; x < x0 + ENDLESS.stretch && !at; x += 20)
      if (iceIn(map, x, x + 40) && !icebergAcross(x, x + 40)) at = x;
    expect(at).toBeGreaterThan(0);
  });
});

describe('the submarine', () => {
  it('after a bump the throttle drives again (bug: the bounce never ended, the gas stayed stuck)', () => {
    const g = createGame(map, null, 4);
    giveSub(g, 2600);
    Object.assign(g.sub, { y: 200, face: 1, vx: -8, aboard: true }); // bouncing back off a rock
    const input = emptyInput();
    Object.assign(input.helm, { throttle: 1, dir: 1 });
    run(g, 4, input);
    expect(g.sub.vx).toBeGreaterThan(5);
  });

  it('back in the hold the ship mends it, for teeth', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.gear.teeth = 1000;
    g.sub.hull = 1;
    Object.assign(g.ship, { bay: 'docking', bayT: 0.01, dockFrom: null });
    const ev: GameEvent[] = [];
    stepBay(g, 0.5, ev);
    expect(g.ship.bay).toBe('docked');
    expect(g.sub.hull).toBe(subModel(g.sub.model).hull);
    expect(g.gear.teeth).toBeLessThan(1000);
    expect(ev.some((e) => e.type === 'subRepaired')).toBe(true);
  });

  it('broken and no teeth: Cala says how to mend it', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    Object.assign(g.ship, { aboard: true, hatches: [{ t: 1, open: true }] });
    g.sub.hull = 0;
    g.gear.teeth = 0;
    expect(launchShown(g)).toBe(true);
    const ev: GameEvent[] = [];
    launchSub(g, ev);
    expect(ev).toContainEqual({ type: 'shipHint', text: 'subBroken' });
    expect(g.ship.bay).toBe('docked');
  });
});

describe('getting aboard (owner: the submarine turned round once in the hold)', () => {
  it('the levers start pointing where the ship points: it does not turn round', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.face = 1;
    Object.assign(g.diver, { x: g.ship.x, y: WORLD.surfaceY + 4, vx: 0, vy: 0 });
    const input: InputState = { ...emptyInput(), action: true };
    input.helm.dir = -1; // the way the last vehicle pointed
    stepGame(g, input, DT);
    expect(g.ship.aboard).toBe(true);
    input.action = false;
    run(g, 1, input);
    expect(g.ship.face).toBe(1);
    expect(input.helm.dir).toBe(1);
  });
});

describe('the outposts (owner: the Porto button came only on the right of the barge)', () => {
  it('alongside on either side counts; the trading harbour keeps its berth', () => {
    const o = OUTPOSTS[0]!;
    expect(shipAlongside(o.x - 200, o)).toBe(true);
    expect(shipAlongside(o.x + 200, o)).toBe(true);
    expect(shipAlongside(o.x + 600, o)).toBe(false);
    expect(shipAlongside(PORTO_FANGO.shipDock, PORTO_FANGO)).toBe(true);
  });
});

describe('the bestiary (owner: the megalodon was not among the legends)', () => {
  it('the hunted giants are legends too', () => {
    const ids = LEGEND_GIANTS.map((l) => l.speciesId);
    expect(ids).toContain('megalodonte');
    expect(ids).toContain('livyatan');
  });
});

describe('sardines and teeth (owner: thousands of teeth in two minutes)', () => {
  it('a sardine is worth 1; the bag holds BAG.capacity, then says it is full once', () => {
    expect(FISH.find((f) => f.id === 'sardina')!.sellPrice).toBe(1);
    const g = createGame(map, null, 4);
    g.gear.bag = { sardina: BAG.capacity - 1 };
    const ev: GameEvent[] = [];
    const sardines = g.fish.fish.filter((f) => f.kind === 'sardina');
    catchFish(g, sardines[0]!, ev);
    catchFish(g, sardines[1]!, ev);
    expect(bagCount(g.gear)).toBe(BAG.capacity);
    expect(ev.filter((e) => e.type === 'bagFull')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'fishCaught')).toHaveLength(2); // still caught: they heal, they feed
  });

  it('a gulp of a whole school is worth at most XP_RULES.fishPerBiteMax fish of experience', () => {
    const g = riding('megattera', 20, 2600, 200);
    run(g, DT);
    const b = g.beasts.team[0]!;
    const h = headOf(g.beasts.mount!);
    const school = g.fish.fish.filter((f) => f.kind === 'sardina').slice(0, 20);
    for (const f of school) Object.assign(f, { x: h.x, y: h.y, vx: 0, vy: 0, alive: true });
    g.timers.feed = 0;
    const xp0 = b.xp;
    const lv0 = b.level;
    stepGame(g, emptyInput(), DT);
    expect(b.level).toBe(lv0);
    expect(b.xp - xp0).toBeGreaterThan(0);
    expect(b.xp - xp0).toBeLessThanOrEqual(fishXp(lv0) * XP_RULES.fishPerBiteMax);
  });
});

describe('beasts', () => {
  it('the prehistoric albino orca swims like a shark (owner)', () => {
    expect(tailUpDown({ speciesId: 'orca', variant: 'comune' })).toBe(true);
    expect(tailUpDown({ speciesId: 'orca', variant: 'comune', unique: 'orca_preistorica_albina' })).toBe(
      false,
    );
  });

  it('crabs walk on the floor (owner: they swam like fish)', () => {
    const g = createGame(map, null, 4);
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'granchio_ragno')!;
    const rng = makeRng(3);
    for (let i = 0; i < 10; i++) {
      const p = wanderPoint(w, map, rng);
      expect(map.floorBelow(p.x, p.y) - p.y).toBeLessThan(15);
    }
  });
});

describe('places', () => {
  it('at Porto Fango the zone is Porto Fango (it said Barriera Rossa)', () => {
    expect(zoneAt(PORTO_FANGO.x, 30)).toBe('Porto Fango');
  });
});
