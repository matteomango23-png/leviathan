// The open sea after the switch to turn-based battles: wild beasts roam and start battles, mounts carry
// you and use their abilities, nothing heals in the sea, old saves still load.
import { beforeAll, describe, expect, it } from 'vitest';
import { ROAM, TEAM_RULES } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { bay as bayX, TILE } from '../src/data/worldLayout';
import { canBreakBones } from '../src/systems/abilities';
import { contextAction, mountSpeed } from '../src/systems/beastPlay';
import { stepRoam } from '../src/systems/beasts/roam';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import { ambush } from '../src/systems/encounters';
import { weaponHitsBeast } from '../src/systems/swimFight';
import { currentAction } from '../src/systems/playerActions';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { SAVE_VERSION, migrate, parseSave, validate } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
const X = bayX(900); // a spot in the middle of the bay, in open water

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 30;
const U = DIVER.lengthUnits;

function bay(seed = 3): GameState {
  const g = createGame(map, null, seed);
  Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
  giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 8);
  return g;
}

function run(g: GameState, seconds: number, input: InputState = emptyInput(), still = true): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2;
    if (still) Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

/** A wild beast of a species placed at (x, y), in the water. */
function place(
  g: GameState,
  speciesId: string,
  x: number,
  y: number,
  face: 1 | -1,
  variant: 'comune' | 'albino' = 'comune',
): WildBeast {
  const w = g.beasts.wilds.find((b) => b.spawn.speciesId === speciesId)!;
  spawnWild(w, { speciesId, variant }, 5, x, y, face);
  return w;
}

describe('wild beasts in the open sea', () => {
  it('appear in the bay, in the dark, away from you', () => {
    const g = bay();
    const ev = run(g, 12);
    const out = g.beasts.wilds.filter((w) => w.motion === 'roam');
    expect(out.length).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'wildAppeared')).toBe(true);
  });

  it('never turn around in the light of your lamp', () => {
    const g = bay();
    const w = place(g, 'tartaruga_marina', X + 40, 200, 1); // swimming away from you, in the light
    w.target = { x: X - 300, y: 200 }; // it wants to go back past you
    const ctx = { diver: g.diver, map, rng: g.rng, dt: DT, hidden: false };
    let turnedInLight = false;
    for (let i = 0; i < 120; i++) {
      const before = w.face;
      stepRoam(w, ctx);
      const lit = Math.hypot(w.x - g.diver.x, w.y - g.diver.y) < ROAM.litRadius;
      if (w.face !== before && lit && w.turn > 0 && !map.hitCircle(w.x + w.face * 30, w.y, 4))
        turnedInLight = true;
    }
    expect(turnedInLight).toBe(false);
  });

  it('an aggressive one comes at you: it bites and the battle starts, it goes first (24 ottobre: no Affronta)', () => {
    const g = bay();
    const w = place(g, 'squalo_tigre', X + 70, 200, -1);
    const ev = run(g, 6);
    expect(ev.some((e) => e.type === 'bitten')).toBe(true);
    expect(ev.some((e) => e.type === 'hurt')).toBe(true);
    expect(g.beasts.battle).toMatchObject({ wildId: w.id, first: 'foe' });
    expect(currentAction(g)).not.toBe('affronta');
    expect(ambush).toBeDefined();
  });

  it('a shy one slips away, but slower than you', () => {
    const g = bay();
    const w = place(g, 'torpedine', X + 50, 200, 1);
    const d0 = Math.hypot(w.x - 900, w.y - 200);
    run(g, 2);
    expect(Math.hypot(w.x - 900, w.y - 200)).toBeGreaterThan(d0);
    expect(ROAM.shySpeed * U).toBeLessThan(DIVER.maxSpeed);
  });

  it('hitting one with the gun wears it down (no battle), and a calm one slips away (lot BA, 22 ottobre)', () => {
    const g = bay();
    const w = place(g, 'tartaruga_marina', X + 100, 200, 1);
    const ev: GameEvent[] = [];
    expect(weaponHitsBeast(g, w.x, w.y, ev)).toBe(true);
    expect(g.beasts.battle).toBeNull();
    expect(w.wounds).toBeGreaterThan(0);
    expect(w.mood).toBe('flee');
  });

  it('with every beast of yours KO: no battle, it only bites, and there is no Affronta (lot BA, 22 ottobre)', () => {
    const g = bay();
    for (const b of g.beasts.team) {
      b.hp = 0;
      b.ko = true;
    }
    place(g, 'squalo_tigre', X + 60, 200, -1);
    const ev = run(g, 4);
    expect(ev.some((e) => e.type === 'bitten')).toBe(true);
    expect(g.beasts.battle).toBeNull();
    expect(currentAction(g)).not.toBe('affronta');
  });

  it('the sea waits while a battle is on', () => {
    const g = bay();
    g.beasts.battle = { wildId: 1, first: 'normal' };
    const t = g.time;
    run(g, 1);
    expect(g.time).toBe(t);
  });
});

describe('mounts', () => {
  it('called from the team bar it swims to you and you ride it, faster, with a dash', () => {
    const g = bay();
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    expect(g.beasts.riding).toBe(true);
    const input = { ...emptyInput(), moveX: 1 };
    run(g, 1, input, false);
    expect(Math.abs(g.diver.vx)).toBeGreaterThan(DIVER.maxSpeed);
    expect(contextAction(g)).toBe('scendi');
  });

  it('a beast that is not a mount swims with you in your pack and eats fish; a second tap sends it away', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    expect(g.beasts.mount).toBeNull(); // the mount's place is for the beast you ride (systems/pack.ts)
    const m = g.beasts.pack[0]!;
    expect(m.state).toBe('follow');
    expect(g.beasts.riding).toBe(false);
    // it keeps up when you swim away
    run(g, 2, { ...emptyInput(), moveX: 1 }, false);
    expect(Math.abs(m.x - g.diver.x)).toBeLessThan(m.length + 40);
    // a sardine in front of its mouth: eaten, experience for it
    for (const f of g.fish.fish) Object.assign(f, { alive: false, respawn: 999 });
    const fish = g.fish.fish.find((x) => x.kind === 'sardina')!;
    Object.assign(fish, { alive: true, x: m.x + m.face * m.length * 0.45, y: m.y });
    g.beasts.view = { x: g.diver.x - 300, y: g.diver.y - 200, width: 600, height: 400 }; // it hunts what you see
    const b = g.beasts.team[0]!;
    const xp = b.xp;
    stepGame(g, emptyInput(), DT);
    expect(fish.alive).toBe(false);
    expect(b.xp).toBeGreaterThan(xp);
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    expect(m.state).toBe('leaving');
  });

  it('a worn-out beast does not come', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    g.beasts.team[0]!.ko = true;
    const ev = run(g, 0.1, { ...emptyInput(), summon: 0 });
    expect(ev.some((e) => e.type === 'cannotRide')).toBe(true);
    expect(g.beasts.mount).toBeNull();
  });

  it('a starter carries you from its second stage, slower than a true mount', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, { speciesId: 'saetta', variant: 'comune' }, 16);
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    expect(g.beasts.riding).toBe(true);
    const slow = mountSpeed(g)!;
    const b = g.beasts.team[0]!;
    b.form = { ...b.form, speciesId: 'folgore' };
    expect(mountSpeed(g)!).toBeGreaterThan(slow);
  });

  it('each mount as fast as it really swims, softened: sailfish > orca > white shark > humpback (owner, 15 ottobre)', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 20);
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    expect(g.beasts.riding).toBe(true);
    const b = g.beasts.team[0]!;
    const at = (speciesId: string): number => {
      b.form = { ...b.form, speciesId };
      return mountSpeed(g)!;
    };
    const shark = at('squalo_bianco');
    expect(at('pesce_vela')).toBeGreaterThan(at('orca'));
    expect(at('orca')).toBeGreaterThan(shark);
    expect(shark).toBeGreaterThan(at('megattera'));
    expect(at('archelon')).toBeGreaterThan(DIVER.maxSpeed); // never slower than swimming yourself
    expect(at('pesce_vela')).toBeLessThan(shark * 2); // softened: it does not fly off the screen
  });

  it('the white shark breaks the ancient bones ("Sfonda")', () => {
    const g = bay();
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    // next to the bone wall of the twilight caves
    let bone = -1;
    for (let i = 0; i < map.data.length && bone < 0; i++) if (map.data[i] === TILE.bone) bone = i;
    const bx = (bone % map.cols) * 8 + 4;
    const by = Math.floor(bone / map.cols) * 8 + 4;
    Object.assign(g.diver, { x: bx - 25, y: by - 14, face: 1 });
    Object.assign(g.beasts.mount!, { x: bx - 25, y: by - 14, face: 1, pitch: 0 });
    expect(canBreakBones(g)).toBe(true);
    const ev = stepGame(g, { ...emptyInput(), action: true }, DT);
    expect(ev.some((e) => e.type === 'bonesBroken')).toBe(true);
  });

  it('the beast you ride eats the fish it swims through', () => {
    const g = bay();
    run(g, 0.1, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.3);
    const m = g.beasts.mount!;
    for (const f of g.fish.fish) Object.assign(f, { alive: false, respawn: 999 });
    const f = g.fish.fish.find((x) => x.kind === 'sardina')!;
    Object.assign(f, { alive: true, x: m.x + m.face * m.length * 0.45, y: m.y });
    g.diver.hp = g.diver.maxHp;
    stepGame(g, emptyInput(), DT);
    expect(g.gear.bag.sardina).toBe(1);
  });
});

describe('no sanctuaries (4 ottobre 2026)', () => {
  it('in the sea nothing heals: the team stays worn out until the port or the ship', () => {
    const g = bay();
    const b = g.beasts.team[0]!;
    b.hp = 0;
    b.ko = true;
    for (let t = 0; t < 6; t += DT) stepGame(g, emptyInput(), DT);
    expect(b.ko).toBe(true);
  });
});

describe('old saves', () => {
  it('a v1 save (tappa 1) loads without losing anything', () => {
    const v1 = {
      game: 'leviatano',
      version: 1,
      savedAt: '2026-09-30T10:00:00.000Z',
      playTime: 120,
      diver: { x: 400, y: 100 },
      fishCaught: { sardina: 4 },
      seen: ['sardina'],
    };
    const s = validate(migrate(v1));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.fishCaught.sardina).toBe(4);
    expect(s.team).toEqual([]);
  });

  it('rejects unknown beasts in the team', () => {
    const bad = {
      ...toSave(createGame(map, null, 1), new Date()),
      team: [
        {
          uid: 'b1',
          form: { speciesId: 'drago', variant: 'comune' },
          level: 5,
          xp: 0,
          food: 0,
          hp: 1,
          ko: false,
          inTeam: true,
        },
      ],
    };
    expect(() => parseSave(JSON.stringify(bad))).toThrow(/bestia/);
  });
});
