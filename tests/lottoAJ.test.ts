// Lot AJ (22 ottobre 2026): who carries you is set by size; climbing on and off has no jump; your beasts come in
// from off the screen and swim off it; aboard, your pack follows the ship slowly and leaves when it speeds up.
import { beforeAll, describe, expect, it } from 'vitest';
import { MOUNT_RULE, PACK, TEAM_RULES } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { bay as bayX } from '../src/data/worldLayout';
import { dismount } from '../src/systems/beastState';
import { ridesForm } from '../src/systems/beasts/mountTraits';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { packAboard } from '../src/systems/pack';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const DT = 1 / 60;
const X = bayX(900);
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const F = (speciesId: string) => ({ speciesId, variant: 'comune' as const });

describe('chi ti porta, per misura (proprietario: "uno squalo tigre… uno o l\'altro?")', () => {
  it('le grandi con un dorso ti portano, le piccole e quelle senza dorso nuotano con te', () => {
    for (const id of [
      'squalo_tigre',
      'squalo_volpe',
      'beluga',
      'dunkleosteus',
      'serpente_di_mare',
      'squalo_bianco',
    ])
      expect(ridesForm(F(id)), id).toBe(true);
    for (const id of ['squalo_leuca', 'barracuda', 'delfino', 'polpo_gigante', 'medusa_gigante'])
      expect(ridesForm(F(id)), id).toBe(false);
    for (const id of MOUNT_RULE.onHead) expect(ridesForm(F(id)), id).toBe(true); // on the head, like the Piovra
    expect(ridesForm(F('squarcio'))).toBe(true); // a starter's second stage, as decided before
  });
});

/** A game in open water with this beast in the team, a view round the diver like the camera's. */
function gameWith(id: string): GameState {
  const g = createGame(map, null, 3);
  g.beasts.team = [];
  giveTestBeast(g, F(id), 30);
  Object.assign(g.diver, { x: X, y: 220, vx: 0, vy: 0, face: 1 });
  return g;
}

function step(g: GameState, input: InputState = emptyInput()): void {
  g.diver.o2 = g.diver.maxO2;
  g.beasts.view = { x: g.diver.x - 200, y: g.diver.y - 110, width: 400, height: 220 };
  stepGame(g, input, DT);
  consumePresses(input);
}

describe('salire e scendere senza salti (proprietario: "deve essere molto più fluido")', () => {
  it('arriva da fuori dello schermo, rallenta, e salendo il sub non salta', () => {
    const g = gameWith('squalo_bianco');
    step(g, { ...emptyInput(), summon: 0 });
    const m = g.beasts.mount!;
    const v = g.beasts.view!;
    expect(m.x < v.x || m.x > v.x + v.width).toBe(true); // it was not there out of nothing
    let mountedAt = -1;
    for (let i = 0; i < 60 * TEAM_RULES.arriveSeconds && mountedAt < 0; i++) {
      step(g);
      if (g.beasts.riding) mountedAt = i;
    }
    expect(mountedAt).toBeGreaterThan(0);
    // where you are drawn moves smoothly into the seat: at the moment you climb on you are still where you were
    expect(m.seatFrom).toBeDefined();
    expect(m.seatT).toBeGreaterThan(0);
    expect(Math.hypot(m.vx, m.vy)).toBeLessThan(DIVER.lengthUnits * TEAM_RULES.arrive.reachSpeed + 5);
  });

  it('scendendo parti dalla sella con una spinta, e lei prosegue e se ne va fuori dallo schermo', () => {
    const g = gameWith('squalo_bianco');
    step(g, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 300 && !g.beasts.riding; i++) step(g);
    for (let i = 0; i < 60; i++) step(g, { ...emptyInput(), moveX: 1 });
    const m = g.beasts.mount!;
    const before = { x: g.diver.x, y: g.diver.y };
    dismount(g, []);
    expect(Math.hypot(g.diver.x - before.x, g.diver.y - before.y)).toBeLessThan(m.length * 0.5); // its seat
    expect(g.diver.vy).toBeLessThan(0); // a little push up
    expect(m.state).toBe('leaving');
    let minAlpha = 1;
    for (let i = 0; i < 600 && g.beasts.mount; i++) {
      step(g);
      if (g.beasts.mount) minAlpha = Math.min(minAlpha, g.beasts.mount.alpha);
    }
    expect(g.beasts.mount).toBeNull(); // gone off the screen…
    expect(minAlpha).toBe(1); // …swimming, not fading
  });
});

describe('a bordo (proprietario: "segue la nave, poi va")', () => {
  it("la nave piano: il branco resta; veloce o sott'acqua: se ne va", () => {
    const g = gameWith('barracuda');
    step(g, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 120; i++) step(g);
    expect(g.beasts.pack[0]?.state).toBe('follow');
    packAboard(g, { speed: PACK.followShipBelow * 0.5, under: false });
    expect(g.beasts.pack[0]?.state).toBe('follow');
    packAboard(g, { speed: PACK.followShipBelow * 2, under: false });
    expect(g.beasts.pack[0]?.state).toBe('leaving');
    const h = gameWith('barracuda');
    step(h, { ...emptyInput(), summon: 0 });
    packAboard(h, { speed: 0, under: true });
    expect(h.beasts.pack[0]?.state).toBe('leaving');
  });
});
