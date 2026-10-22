// Lot BA (22 ottobre 2026, block 6): your weapons wear a wild beast down before the battle, up to half its health
// (the calm ones slip away, the aggressive ones turn on you); swimming on your own a hunter bites first, then you face
// it (Affronta, or a tap on one of your beasts, which goes first); riding, the battle starts at its touch as before.
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON_WEAKEN } from '../src/data/battle';
import { SWIM_BITE } from '../src/data/beasts';
import { bay as bayX } from '../src/data/worldLayout';
import { battleSetup } from '../src/systems/battleResult';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { hunterAfterYou, swimBite, weaponHitsBeast } from '../src/systems/swimFight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const X = bayX(900);
const DT = 1 / 30;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function game(): GameState {
  const g = createGame(map, null, 3);
  Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
  g.beasts.team = [];
  giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 8);
  giveTestBeast(g, { speciesId: 'delfino', variant: 'comune' }, 8);
  return g;
}

function place(g: GameState, speciesId: string, dx: number): WildBeast {
  const w = g.beasts.wilds.find((b) => b.spawn.speciesId === speciesId) ?? g.beasts.wilds[0]!;
  spawnWild(w, { speciesId, variant: 'comune' }, 5, X + dx, 200, -1);
  return w;
}

function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2;
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

describe('l\'arpione sfianca (proprietario: "fino a metà vita… si arrabbia o scappa")', () => {
  it('ogni colpo toglie vita, mai oltre la metà, e in battaglia entra con quella vita', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 300);
    for (let i = 0; i < 20; i++) weaponHitsBeast(g, w.x, w.y, [], 1);
    expect(w.wounds).toBeCloseTo(HARPOON_WEAKEN.max);
    expect(g.beasts.battle).toBeNull();
    g.beasts.battle = { wildId: w.id, first: 'normal' };
    const s = battleSetup(g)!;
    expect(Math.abs(s.state.foe.hp - s.state.foe.maxHp * (1 - HARPOON_WEAKEN.max))).toBeLessThanOrEqual(1);
  });

  it("un'arma più forte sfianca prima; l'aggressiva ti viene addosso", () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 300);
    weaponHitsBeast(g, w.x, w.y, [], 3);
    expect(w.wounds).toBeCloseTo(HARPOON_WEAKEN.perDamage * 3);
    expect(w.mood).toBe('chase');
  });
});

describe('a nuoto da solo (proprietario: "come proposto")', () => {
  it('il morso: un cuore, una spinta e una tregua', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 20);
    const hp = g.diver.hp;
    const ev: GameEvent[] = [];
    swimBite(g, w, ev);
    expect(g.diver.hp).toBe(hp - 1);
    expect(Math.hypot(g.diver.vx, g.diver.vy)).toBeGreaterThan(SWIM_BITE.push * 0.9);
    expect(w.calm).toBeGreaterThan(0);
  });

  it('toccando una tua bestia mentre ti insegue, la battaglia parte con quella in testa', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    w.mood = 'chase';
    expect(hunterAfterYou(g)).toBe(w);
    run(g, DT, { ...emptyInput(), summon: 1 }); // the dolphin
    expect(g.beasts.battle?.wildId).toBe(w.id);
    const s = battleSetup(g)!;
    expect(s.state.team[0]!.uid).toBe(g.beasts.team[1]!.uid);
  });

  it('in groppa la battaglia parte al contatto, come prima', () => {
    const g = createGame(map, null, 3);
    Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
    g.beasts.team = [];
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 30);
    run(g, DT, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 200 && !g.beasts.riding; i++) run(g, DT);
    expect(g.beasts.riding).toBe(true);
    const w = place(g, 'squalo_tigre', 40);
    w.level = 30;
    const ev = run(g, 4);
    expect(ev.some((e) => e.type === 'battleStart')).toBe(true);
    expect(ev.some((e) => e.type === 'bitten')).toBe(false);
  });
});
