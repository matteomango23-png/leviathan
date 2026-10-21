// Lot AD-3 (21 ottobre 2026): the pack. Besides the beast you ride, up to two companions swim with you; they hunt
// the fish you can see, the small wild beasts go round them, and each has its type's power (docs/PROPOSTA-RUOLI.md).
import { beforeAll, describe, expect, it } from 'vitest';
import { PACK, TEAM_RULES } from '../src/data/beasts';
import { bay as bayX } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import {
  huntWithPack,
  lanternRadius,
  noSurprise,
  scaredOfPack,
  shellDepthM,
  stepPackEcho,
} from '../src/systems/pack';
import { spawnWild } from '../src/systems/beasts/wildState';
import { teamMembers } from '../src/systems/beasts/team';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const X = bayX(900);
const DT = 1 / 30;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2;
    Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

/** A game with these beasts in the team (level 20), all called into the water, in this order. */
function withPack(ids: string[], level = 20): GameState {
  const g = createGame(map, null, 3);
  g.beasts.team = [];
  for (const id of ids) giveTestBeast(g, { speciesId: id, variant: 'comune' }, level);
  for (let i = 0; i < ids.length; i++) run(g, DT, { ...emptyInput(), summon: i });
  run(g, TEAM_RULES.arriveSeconds + 0.5);
  return g;
}

const slotOf = (g: GameState, id: string): number =>
  teamMembers(g.beasts.team).findIndex((b) => b.form.speciesId === id);

describe('the pack (owner: "max 2 compagni oltre alla cavalcatura")', () => {
  it('a mount and two companions swim together; the companions are not the mount', () => {
    const g = withPack(['squalo_bianco', 'barracuda', 'tricheco']);
    expect(g.beasts.riding).toBe(true);
    expect(g.beasts.pack.map((m) => m.state)).toEqual(['follow', 'follow']);
    expect(new Set(g.beasts.pack.map((m) => m.slot))).toEqual(new Set([0, 1]));
  });

  it('a third companion sends the oldest away; a second tap sends one away', () => {
    const g = withPack(['barracuda', 'tricheco', 'pesce_palla']);
    const staying = g.beasts.pack.filter((m) => m.state !== 'leaving').map((m) => m.uid);
    expect(staying).toHaveLength(PACK.size);
    const first = g.beasts.team.find((b) => b.form.speciesId === 'barracuda')!;
    expect(staying).not.toContain(first.uid);
    run(g, DT, { ...emptyInput(), summon: slotOf(g, 'tricheco') });
    const walrus = g.beasts.team.find((b) => b.form.speciesId === 'tricheco')!;
    expect(g.beasts.pack.find((m) => m.uid === walrus.uid)?.state ?? 'leaving').toBe('leaving');
  });
});

describe('the pack hunts the fish you can see (owner: "non vanno a destra e sinistra a caso tipo drone")', () => {
  it('a companion goes for a fish on screen and eats it; a fish off screen is left alone', () => {
    const g = withPack(['barracuda']);
    const m = g.beasts.pack[0]!;
    for (const f of g.fish.fish) Object.assign(f, { alive: false, respawn: 999 });
    const [near, far] = g.fish.fish.filter((x) => x.kind === 'sardina');
    Object.assign(near!, { alive: true, x: m.x + m.face * m.length * 0.45, y: m.y });
    Object.assign(far!, { alive: true, x: g.diver.x + 60, y: g.diver.y + 400 });
    g.beasts.view = { x: g.diver.x - 200, y: g.diver.y - 150, width: 400, height: 300 };
    const meals = huntWithPack(g, g.fish, DT, []);
    expect(meals[0]?.eaten).toContain(near);
    expect(far!.alive).toBe(true);
    near!.alive = false; // gone into the bag (game.ts does it after the hunt)
    huntWithPack(g, g.fish, DT, []);
    expect(m.target).toBeNull(); // the only fish left is off screen
  });

  it('a Predatore hunts farther than a companion of another type', () => {
    const fishAt = (g: GameState, dx: number) => {
      for (const f of g.fish.fish) Object.assign(f, { alive: false, respawn: 999 });
      const f = g.fish.fish.find((x) => x.kind === 'sardina')!;
      Object.assign(f, { alive: true, x: g.diver.x + dx, y: g.diver.y });
      g.beasts.view = { x: g.diver.x - 400, y: g.diver.y - 200, width: 800, height: 400 };
      huntWithPack(g, g.fish, DT, []);
      return g.beasts.pack[0]!.target;
    };
    const dx = PACK.huntReach * 1.3;
    expect(fishAt(withPack(['barracuda']), dx)).not.toBeNull();
    expect(fishAt(withPack(['tricheco']), dx)).toBeNull();
  });
});

describe('the small wild beasts go round the pack (owner: "in base al livello… vanno in un\'altra direzione")', () => {
  it('a small wild beast of a lower level is scared; a big one and a boss are not', () => {
    const g = withPack(['tricheco'], 30);
    const w = g.beasts.wilds[0]!;
    spawnWild(w, { speciesId: 'barracuda', variant: 'comune' }, 5, X + 100, 200, 1);
    expect(scaredOfPack(g, w)).toBe(true);
    w.level = 40;
    expect(scaredOfPack(g, w)).toBe(false); // higher level than the pack
    w.level = 5;
    w.boss = 'Il Guardiano';
    expect(scaredOfPack(g, w)).toBe(false);
  });
});

describe('the powers by type', () => {
  it('Corazzato: the pressure starts deeper; Tempesta: nobody takes you by surprise; Abissale: a light round you', () => {
    expect(shellDepthM(withPack(['pesce_palla']))).toBeGreaterThan(PACK.shellDepthM);
    expect(shellDepthM(withPack(['barracuda']))).toBe(0);
    expect(noSurprise(withPack(['pastinaca']))).toBe(true);
    expect(noSurprise(withPack(['barracuda']))).toBe(false);
    expect(lanternRadius(withPack(['rana_pescatrice']))).toBeGreaterThan(PACK.lanternRadius);
  });

  it('Glaciale: its echo shows the wild beasts near you, every few seconds', () => {
    const g = withPack(['tricheco']);
    const w = g.beasts.wilds[0]!;
    spawnWild(w, { speciesId: 'barracuda', variant: 'comune' }, 5, g.diver.x + 120, g.diver.y, 1);
    const ev: GameEvent[] = [];
    g.timers.packEcho = 0; // its echo is due now
    stepPackEcho(g, DT, ev);
    const echo = ev.find((e) => e.type === 'packEcho');
    expect(echo && echo.type === 'packEcho' && echo.found.length).toBeGreaterThan(0);
    const again: GameEvent[] = [];
    stepPackEcho(g, DT, again);
    expect(again.some((e) => e.type === 'packEcho')).toBe(false); // not every frame
  });
});
