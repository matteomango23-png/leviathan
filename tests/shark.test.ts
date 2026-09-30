// The white shark in the real world: movement rules, fighting, taming, riding, sanctuaries.
import { beforeAll, describe, expect, it } from 'vitest';
import { BIG_BEAST_MOTION } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { TILE } from '../src/data/worldLayout';
import { contextAction } from '../src/systems/beastPlay';
import { spawnWild, isInWater, type Rect, type WildBeast } from '../src/systems/beasts/wild';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput, consumePresses, type InputState } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import { migrate, parseSave, validate } from '../src/systems/save/saveData';
import { generateWorld } from '../src/systems/world/worldGen';
import type { TileMap } from '../src/systems/world/tileMap';
import type { GameEvent } from '../src/systems/events';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 60;
const viewAround = (g: GameState): Rect => ({ x: g.diver.x - 173, y: g.diver.y - 80, w: 346, h: 160 });

/** Diver floating still in the open water of the bay, where the shark lives. */
function bayGame(seed = 7): GameState {
  const g = createGame(generateWorld(), null, seed);
  g.diver.x = 900;
  g.diver.y = 200;
  return g;
}

function run(g: GameState, seconds: number, input: InputState = emptyInput(), each?: (g: GameState) => void) {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2; // keep breathing: these tests are about the shark
    if (!input.fireHeld && !g.beasts.riding) {
      g.diver.x = 900;
      g.diver.y = 200;
      g.diver.vx = 0;
      g.diver.vy = 0;
    }
    all.push(...stepGame(g, input, DT, viewAround(g)));
    consumePresses(input);
    each?.(g);
  }
  return all;
}

const shark = (g: GameState): WildBeast => g.beasts.wilds[0]!;

describe('white shark movement rules', () => {
  it('appears in the bay after a short while', () => {
    const g = bayGame();
    run(g, 20);
    expect(isInWater(shark(g)) || shark(g).motion === 'hidden').toBe(true);
    expect(g.seen.has('squalo_bianco')).toBe(true);
  });

  it('never turns around while on screen (away from walls)', () => {
    const g = bayGame(11);
    let turnsInView = 0;
    let last = shark(g).face;
    run(g, 90, emptyInput(), (gg) => {
      const w = shark(gg);
      const v = viewAround(gg);
      const onScreen = w.x > v.x - 10 && w.x < v.x + v.w + 10;
      if (w.face !== last && onScreen && isInWater(w)) {
        const nearWall = gg.map.hitCircle(w.x + w.face * w.length * 0.6, w.y, w.length * 0.1);
        if (!nearWall) turnsInView++;
      }
      last = w.face;
    });
    expect(turnsInView).toBe(0);
  });

  it('bolts away when followed', () => {
    const g = bayGame(5);
    const w = shark(g);
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 5, makeRng(1), 0);
    run(g, 0.2);
    // put it on screen, swimming right, and follow it
    w.motion = 'cruise';
    w.face = 1;
    w.x = g.diver.x + 40;
    w.y = g.diver.y;
    w.attackPlanned = false;
    let bolted = false;
    for (let t = 0; t < BIG_BEAST_MOTION.followSeconds + 1; t += DT) {
      g.diver.vx = DIVER.lengthUnits * 3;
      stepGame(g, emptyInput(), DT, viewAround(g));
      if ((w.motion as string) === 'bolt') bolted = true;
    }
    expect(bolted).toBe(true);
  });
});

describe('white shark attacks', () => {
  it('opens its jaws first (the cue), then lunges and bites the diver', () => {
    const g = bayGame(21);
    const w = shark(g);
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 5, makeRng(4), 0);
    run(g, 0.1);
    w.motion = 'enter';
    w.face = 1;
    w.x = g.diver.x - w.length * 0.9;
    w.y = g.diver.y;
    w.attackPlanned = true;
    w.biteCooldown = 0;
    let telegraphed = false;
    const events = run(g, 3, emptyInput(), (gg) => {
      const s = shark(gg);
      if (s.motion === 'attack' && s.telegraph > 0 && s.jaw > 0) telegraphed = true;
    });
    expect(telegraphed).toBe(true);
    expect(events.some((e) => e.type === 'wildBite')).toBe(true);
    expect(g.diver.hp).toBeLessThan(g.diver.maxHp);
  });
});

describe('fighting and taming the white shark', () => {
  function exhaust(g: GameState): WildBeast {
    const w = shark(g);
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 5, makeRng(2), 0);
    run(g, 0.1);
    w.motion = 'cruise';
    w.x = g.diver.x + 40;
    w.y = g.diver.y;
    w.face = 1;
    w.hp = w.maxHp * 0.3;
    w.attackPlanned = false;
    // one harpoon hit brings it under the exhaustion notch
    const input = { ...emptyInput(), fireHeld: true, aim: 0 };
    for (let t = 0; t < 1 && w.mood !== 'tired'; t += DT) {
      w.x = g.diver.x + 40;
      w.y = g.diver.y;
      stepGame(g, input, DT, viewAround(g));
    }
    return w;
  }

  it('gets exhausted by the harpoon', () => {
    const g = bayGame();
    const w = exhaust(g);
    expect(w.mood).toBe('tired');
  });

  it('can be tamed: it joins the team and you ride it', () => {
    const g = bayGame();
    const w = exhaust(g);
    g.diver.x = w.x;
    g.diver.y = w.y - 4;
    expect(contextAction(g)).toBe('doma');
    const input = emptyInput();
    input.action = true;
    stepGame(g, input, DT, viewAround(g));
    expect(g.beasts.taming).not.toBeNull();
    let result: GameEvent | undefined;
    for (let i = 0; i < 3; i++) {
      const t = g.beasts.taming!;
      t.t = t.centre / t.speed;
      input.tameTap = true;
      const ev = stepGame(g, input, 0, viewAround(g));
      input.tameTap = false;
      result = ev.find((e) => e.type === 'tamed') ?? result;
    }
    expect(result).toBeDefined();
    expect(g.beasts.team).toHaveLength(1);
    expect(g.beasts.riding).toBe(true);
    expect(contextAction(g)).toBe('scendi');
    expect(w.motion).toBe('gone');
  });

  it('a common duplicate flees instead of getting tired', () => {
    const g = bayGame();
    exhaust(g);
    g.beasts.team.push(
      ...createGame(map, {
        ...toSave(g, new Date()),
        team: [
          {
            uid: 'b1',
            form: { speciesId: 'squalo_bianco', variant: 'comune' },
            level: 5,
            hp: 10,
            ko: false,
            inTeam: true,
          },
        ],
      }).beasts.team,
    );
    const g2 = bayGame(9);
    g2.beasts.team = g.beasts.team;
    const w2 = exhaust(g2);
    expect(w2.mood === 'fleeing' || w2.motion === 'gone').toBe(true);
  });
});

describe('riding, moves and the bone wall', () => {
  it('the charge of the white shark breaks ancient bones', () => {
    const g = createGame(generateWorld(), null, 3);
    // a level 15 shark in the team, ridden next to the bone wall
    const save = toSave(g, new Date());
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'squalo_bianco', variant: 'comune' },
        level: 15,
        hp: 30,
        ko: false,
        inTeam: true,
      },
    ];
    const g2 = createGame(generateWorld(), save, 3);
    let bone: { x: number; y: number } | null = null;
    for (let i = 0; i < g2.map.data.length && !bone; i++)
      if (g2.map.data[i] === TILE.bone) {
        const tx = i % g2.map.cols;
        const ty = Math.floor(i / g2.map.cols);
        if (g2.map.get(tx, ty - 3) === TILE.water) bone = { x: tx * 8 + 4, y: (ty - 3) * 8 + 4 };
      }
    expect(bone).not.toBeNull();
    const input = emptyInput();
    input.summon = 0;
    stepGame(g2, input, DT);
    consumePresses(input);
    g2.beasts.riding = true;
    g2.diver.x = bone!.x;
    g2.diver.y = bone!.y;
    g2.beasts.companion!.x = bone!.x;
    g2.beasts.companion!.y = bone!.y;
    g2.beasts.companion!.face = 1;
    g2.beasts.companion!.pitch = Math.PI / 2 - 0.01; // head pointing down into the wall
    input.move = 2;
    const events: GameEvent[] = [];
    for (let t = 0; t < 0.4; t += DT) {
      events.push(...stepGame(g2, input, DT));
      consumePresses(input);
      g2.beasts.companion!.pitch = 1.2;
    }
    expect(events.some((e) => e.type === 'bonesBroken')).toBe(true);
    expect(g2.brokenTiles.length).toBeGreaterThan(0);
    // and it stays broken after saving and loading
    const again = createGame(generateWorld(), toSave(g2, new Date()), 4);
    const i = g2.brokenTiles[0]!;
    expect(again.map.data[i]).toBe(TILE.water);
  });
});

describe('sanctuaries', () => {
  it('heal the diver and a KO beast gradually, and become the respawn point', () => {
    const g = createGame(generateWorld(), null, 1);
    const s = g.sanctuaries.list[1]!;
    const save = toSave(g, new Date());
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'squalo_bianco', variant: 'comune' },
        level: 5,
        hp: 0,
        ko: true,
        inTeam: true,
      },
    ];
    const g2 = createGame(generateWorld(), save, 1);
    g2.diver.hp = 1;
    const events: GameEvent[] = [];
    for (let t = 0; t < 6; t += DT) {
      g2.diver.x = s.x;
      g2.diver.y = s.y;
      g2.diver.vx = 0;
      g2.diver.vy = 0;
      events.push(...stepGame(g2, emptyInput(), DT));
    }
    expect(events.some((e) => e.type === 'sanctuaryReached')).toBe(true);
    expect(g2.sanctuaries.current).toBe(1);
    expect(g2.diver.hp).toBe(g2.diver.maxHp);
    expect(g2.beasts.team[0]!.ko).toBe(false);
  });
});

describe('save v2', () => {
  it('upgrades a v1 save (tappa 1) without losing anything', () => {
    const v1 = {
      game: 'leviatano',
      version: 1,
      savedAt: '2026-09-30T10:00:00.000Z',
      playTime: 120,
      diver: { x: 2400, y: 100 },
      fishCaught: { sardina: 4 },
      seen: ['sardina'],
    };
    const s = validate(migrate(v1));
    expect(s.version).toBe(2);
    expect(s.fishCaught.sardina).toBe(4);
    expect(s.team).toEqual([]);
    expect(s.sanctuary).toBeNull();
  });

  it('rejects unknown beasts in the team', () => {
    const bad = {
      ...toSave(createGame(generateWorld(), null, 1), new Date()),
      team: [
        {
          uid: 'b1',
          form: { speciesId: 'drago', variant: 'comune' },
          level: 5,
          hp: 1,
          ko: false,
          inTeam: true,
        },
      ],
    };
    expect(() => parseSave(JSON.stringify(bad))).toThrow(/bestia/);
  });
});
