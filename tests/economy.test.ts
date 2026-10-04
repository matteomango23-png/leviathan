import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_ACTIVE_MISSIONS, PORT, WEAPON_RULES } from '../src/data/economy';
import { SUITS, SWARMS } from '../src/data/world';
import { bay, START, WORLD } from '../src/data/worldLayout';
import {
  createGame,
  currentAction,
  enterPort,
  sellAtPort,
  stepGame,
  toSave,
  type GameState,
} from '../src/systems/game';
import { buyItem, buySuit, buyUpgrade, setSlot, stockLeft } from '../src/systems/economy/gear';
import { acceptMission, boardMissions, claimMission, isComplete } from '../src/systems/economy/missions';
import { useSlot } from '../src/systems/economy/backpack';
import { emptyInput, consumePresses, type InputState } from '../src/systems/input';
import { SAVE_VERSION, migrate, parseSave, serializeSave, validate } from '../src/systems/save/saveData';
import { generateWorld } from '../src/systems/world/worldGen';
import type { GameEvent } from '../src/systems/events';
import type { TileMap } from '../src/systems/world/tileMap';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 60;
const fresh = (): GameState => createGame(generateWorld(), null, 5);

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const out: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    out.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return out;
}

/** Keeps only one fish of a kind alive, right in front of the diver. */
function fishAhead(g: GameState, kind: string, dx: number): void {
  for (const f of g.fish.fish) {
    f.alive = false;
    f.respawn = 999;
  }
  g.diver.x = bay(900); // open water in the bay (the start is over the shallow beach)
  const f = g.fish.fish.find((x) => x.kind === kind)!;
  f.alive = true;
  f.x = g.diver.x + dx;
  f.y = g.diver.y;
}

describe('fish, bag and market', () => {
  it('a fish caught at full health goes into the bag and sells for teeth', () => {
    const g = fresh();
    g.diver.y = 150;
    fishAhead(g, 'sgombro', 30);
    run(g, 1, { ...emptyInput(), fireHeld: true, aim: 0 });
    expect(g.gear.bag.sgombro).toBe(1);
    const r = sellAtPort(g);
    expect(r).toMatchObject({ count: 1, teeth: 3 });
    expect(g.gear.teeth).toBe(3);
    expect(g.gear.bag).toEqual({});
  });
});

describe('shopping', () => {
  it('buys a suit only with enough teeth, and the suit changes the diver', () => {
    const g = fresh();
    expect(buySuit(g.gear, 'rinforzata').ok).toBe(false);
    g.gear.teeth = 500;
    expect(buySuit(g.gear, 'rinforzata').ok).toBe(true);
    expect(g.gear.teeth).toBe(100);
    run(g, DT);
    expect(g.diver.maxHp).toBe(5 + SUITS.find((s) => s.id === 'rinforzata')!.hpBonus);
  });

  it('upgrades need their prerequisite, unfinished ones are not for sale', () => {
    const g = fresh();
    g.gear.teeth = 5000;
    expect(buyUpgrade(g.gear, 'lampada_2').ok).toBe(false);
    expect(buyUpgrade(g.gear, 'lampada_1').ok).toBe(true);
    expect(buyUpgrade(g.gear, 'lampada_2').ok).toBe(true);
    expect(buyUpgrade(g.gear, 'lampo_sonar').ok).toBe(false);
  });

  it('limits items per port visit and the mythic harpoon until a Guardian falls', () => {
    const g = fresh();
    g.gear.teeth = 20000;
    expect(buyItem(g.gear, 'krill_dorato').ok).toBe(true);
    expect(buyItem(g.gear, 'krill_dorato').ok).toBe(true);
    expect(buyItem(g.gear, 'krill_dorato').ok).toBe(false);
    enterPort(g);
    expect(stockLeft(g.gear, 'krill_dorato')).toBe(2);
    expect(buyItem(g.gear, 'arpione_mitico').ok).toBe(true);
    enterPort(g);
    expect(buyItem(g.gear, 'arpione_mitico').ok).toBe(false);
  });
});

describe('the suit sets the maximum depth', () => {
  it('below it there is no wall: the pressure bar empties (faster the deeper), then it hurts (4 ottobre)', () => {
    const after = (extraM: number, seconds: number) => {
      const g = fresh();
      const limitY = WORLD.surfaceY + SUITS[0]!.maxDepth * WORLD.unitsPerMetre;
      g.diver.x = bay(340); // the open shaft down to the abyss (the test needs open water at every depth)
      g.diver.y = limitY + extraM * WORLD.unitsPerMetre;
      expect(g.map.hitCircle(g.diver.x, g.diver.y, 5)).toBe(false);
      const y0 = g.diver.y;
      const ev = run(g, seconds);
      if (seconds < 5) expect(g.diver.y).toBeGreaterThanOrEqual(y0 - 1); // not pushed back up
      if (extraM > 0) expect(ev.some((e) => e.type === 'tooDeep')).toBe(true);
      return {
        pressure: g.diver.pressure,
        hurt: ev.filter((e) => e.type === 'hurt').length,
        o2: g.diver.o2 / g.diver.maxO2,
      };
    };
    expect(after(-5, 2).pressure).toBe(1); // within the suit: nothing
    const just = after(1, 2);
    const deep = after(25, 2);
    expect(just.pressure).toBeLessThan(1);
    expect(deep.pressure).toBeLessThan(just.pressure);
    expect(just.o2).toBeGreaterThan(0.9); // the air is not what drops
    expect(after(25, 15).hurt).toBeGreaterThan(0); // empty, it costs hearts
  });
});

describe('wrecks, weapons and the backpack', () => {
  it('the Baia wreck gives the fiocine once, and they can be equipped', () => {
    const g = fresh();
    const w = g.wrecks.find((x) => x.def.id === 'relitto_baia')!;
    g.diver.x = w.x;
    g.diver.y = w.y - 6;
    expect(currentAction(g)).toBe('apri');
    const ev = run(g, DT, { ...emptyInput(), action: true });
    expect(ev.find((e) => e.type === 'wreckOpened')).toMatchObject({ weapon: 'fiocine' });
    expect(g.gear.weapons).toContain('fiocine');
    expect(currentAction(g)).not.toBe('apri');
    expect(setSlot(g.gear, 0, 'fiocine')).toBe(true);
    expect(setSlot(g.gear, 1, 'fiocine')).toBe(false); // no duplicates
    useSlot(g, 0, []);
    expect(g.gear.activeWeapon).toBe('fiocine');
  });

  it('fiocine catch fish with a fan of darts', () => {
    const g = fresh();
    g.gear.weapons.push('fiocine');
    g.gear.activeWeapon = 'fiocine';
    g.diver.y = 150;
    fishAhead(g, 'sardina', 25);
    const ev = run(g, 0.5, { ...emptyInput(), fireHeld: true, aim: 0 });
    expect(ev.filter((e) => e.type === 'weaponFired')).not.toHaveLength(0);
    expect(g.fishCaught.sardina).toBe(1);
  });

  it('the net catches at most 5 fish', () => {
    const g = fresh();
    g.gear.weapons.push('rete');
    g.gear.activeWeapon = 'rete';
    g.diver.x = bay(900);
    g.diver.y = 150;
    const dist = WEAPON_RULES.rete.speed * WEAPON_RULES.rete.life;
    const sardines = g.fish.fish.filter((f) => f.kind === 'sardina').slice(0, 8);
    for (const f of g.fish.fish) {
      f.alive = false;
      f.respawn = 999;
    }
    for (const f of sardines) {
      f.alive = true;
      f.x = g.diver.x + dist + (Math.random() - 0.5) * 6;
      f.y = g.diver.y + (Math.random() - 0.5) * 6;
    }
    const input = { ...emptyInput(), fireHeld: true, aim: 0 };
    for (let t = 0; t < 0.6; t += DT) {
      for (const f of sardines) if (f.alive) f.vx = f.vy = 0;
      stepGame(g, input, DT);
      input.fireHeld = false;
    }
    expect(g.fishCaught.sardina).toBe(WEAPON_RULES.rete.maxFish);
  });
});

describe('sardine swarm', () => {
  it('binds after 10 sardines and absorbs bites when called', () => {
    const g = fresh();
    const sw = SWARMS.find((s) => s.id === 'sciame_sardine')!;
    g.fishCaught.sardina = sw.bindCount - 1;
    g.diver.y = 150;
    fishAhead(g, 'sardina', 30);
    const ev = run(g, 1, { ...emptyInput(), fireHeld: true, aim: 0 });
    expect(ev.some((e) => e.type === 'swarmBound')).toBe(true);
    expect(setSlot(g.gear, 2, 'sciame_sardine')).toBe(true);
    const ev2: GameEvent[] = [];
    useSlot(g, 2, ev2);
    expect(ev2.some((e) => e.type === 'swarmSummoned')).toBe(true);
    expect(g.beasts.decoy?.t).toBeGreaterThan(0); // the swarm hides you for a while
  });
});

describe('items', () => {
  it('the air bubble refills oxygen and leaves the slot when used up', () => {
    const g = fresh();
    g.gear.inventory.bolla_aria = 1;
    setSlot(g.gear, 0, 'bolla_aria');
    g.diver.o2 = 5;
    useSlot(g, 0, []);
    expect(g.diver.o2).toBe(g.diver.maxO2);
    expect(g.gear.backpack[0]).toBeNull();
  });
});

describe('missions', () => {
  it('accept, progress, claim', () => {
    const g = fresh();
    expect(boardMissions(g.gear).map((m) => m.id)).not.toContain('sgombri_5'); // needs sardine_10 first
    expect(acceptMission(g.gear, 'sardine_10')).toBe(true);
    g.fishCaught.sardina = 0;
    for (let i = 0; i < 10; i++) {
      g.diver.y = 150;
      g.harpoon.shot = null; // start each throw with the harpoon in hand
      g.harpoon.cooldown = 0;
      fishAhead(g, 'sardina', 30);
      run(g, 0.8, { ...emptyInput(), fireHeld: true, aim: 0 });
    }
    expect(isComplete(g.gear, 'sardine_10')).toBe(true);
    expect(claimMission(g.gear, 'sardine_10')).toBe(30);
    expect(boardMissions(g.gear).map((m) => m.id)).toContain('sgombri_5');
  });

  it(`allows at most ${MAX_ACTIVE_MISSIONS} active missions`, () => {
    const g = fresh();
    const ids = boardMissions(g.gear).map((m) => m.id);
    for (const id of ids) acceptMission(g.gear, id);
    expect(g.gear.missions.active).toHaveLength(MAX_ACTIVE_MISSIONS);
  });
});

describe('port', () => {
  it('the pier opens the port and heals', () => {
    const g = fresh();
    g.diver.x = PORT.x;
    g.diver.y = START.y;
    g.diver.hp = 1;
    expect(currentAction(g)).toBe('porto');
    const ev = run(g, DT, { ...emptyInput(), action: true });
    expect(ev.some((e) => e.type === 'portArrived')).toBe(true);
    enterPort(g);
    expect(g.diver.hp).toBe(g.diver.maxHp);
  });

  it('a submarine moored at the pier can be boarded (the port button used to hide it)', () => {
    const g = fresh();
    g.diver.x = PORT.x;
    g.diver.y = START.y;
    Object.assign(g.sub, { owned: true, aboard: false, x: PORT.x + 5, y: START.y });
    expect(currentAction(g)).toBe('sali');
    g.sub.x = PORT.x + 200; // away from it, the pier opens the port again
    expect(currentAction(g)).toBe('porto');
  });
});

describe('save v3', () => {
  it('keeps the equipment', () => {
    const g = fresh();
    g.gear.teeth = 77;
    g.gear.weapons.push('fiocine');
    g.gear.backpack[1] = 'fiocine';
    g.gear.missions.active.push('sardine_10');
    const s = parseSave(serializeSave(toSave(g, new Date())));
    const g2 = createGame(map, s, 2);
    expect(g2.gear.teeth).toBe(77);
    expect(g2.gear.backpack[1]).toBe('fiocine');
    expect(g2.gear.missions.active).toEqual(['sardine_10']);
  });

  it('upgrades a v2 save', () => {
    const v2 = { ...toSave(fresh(), new Date()), version: 2 } as Record<string, unknown>;
    delete v2.gear;
    const s = validate(migrate(v2));
    expect(s.version).toBe(SAVE_VERSION);
    expect(createGame(map, s, 1).gear.suit).toBe('leggera');
  });

  it('drops unknown ids from a newer or edited file', () => {
    const s = toSave(fresh(), new Date());
    (s.gear as unknown as Record<string, unknown>).weapons = ['arpione', 'laser'];
    expect(parseSave(JSON.stringify(s)).gear!.weapons).toEqual(['arpione']);
  });
});
