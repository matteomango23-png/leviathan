// Lot C4 (25 ottobre 2026, the owner: the fight in the water before the turn battle "ha poco senso logico… il
// pulsante Affronta ti impedisce di salire sulla nave… una bestia al rosso continua a caricarti… il tuo morso non
// arriva"): the touch starts the battle and whoever struck first goes first; a beast worn down to red no longer
// attacks and limps away; your mount's bite always lands.
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON_WEAKEN } from '../src/data/battle';
import { DIVER } from '../src/data/diver';
import { bay as bayX } from '../src/data/worldLayout';
import { isWorn, spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { touchOutcome, weaponHitsBeast } from '../src/systems/swimFight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const X = bayX(900);
const DT = 1 / 30;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function game(mount = false): GameState {
  const g = createGame(map, null, 3);
  Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
  g.beasts.team = [];
  giveTestBeast(g, { speciesId: mount ? 'squalo_bianco' : 'barracuda', variant: 'comune' }, 30);
  return g;
}

function place(g: GameState, speciesId: string, dx: number, level = 20): WildBeast {
  const w = g.beasts.wilds.find((b) => b.spawn.speciesId === speciesId) ?? g.beasts.wilds[0]!;
  spawnWild(w, { speciesId, variant: 'comune' }, level, X + dx, 200, -1);
  return w;
}

function step(g: GameState, input: InputState = emptyInput()): GameEvent[] {
  g.diver.o2 = g.diver.maxO2;
  g.beasts.view = { x: g.diver.x - 200, y: g.diver.y - 110, width: 400, height: 220 };
  const ev = stepGame(g, input, DT);
  consumePresses(input);
  return ev;
}

/** Hits it with the gun until it is worn down to the limit. */
function wear(g: GameState, w: WildBeast): void {
  for (let i = 0; i < 100 && !isWorn(w); i++) weaponHitsBeast(g, w.x, w.y, [], 1);
}

describe('lo scontro in acqua', () => {
  it('una bestia sfiancata al rosso non carica più: scappa piano, più piano di te', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    wear(g, w);
    expect(isWorn(w)).toBe(true);
    expect(w.stalk).toBeUndefined();
    let fastest = 0;
    let bitten = false;
    for (let i = 0; i < 30 * 6; i++) {
      Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
      bitten ||= step(g).some((e) => e.type === 'bitten');
      fastest = Math.max(fastest, Math.hypot(w.vx, w.vy));
      expect(w.stalk).toBeUndefined();
    }
    expect(bitten).toBe(false);
    expect(fastest).toBeLessThanOrEqual(DIVER.maxSpeed * HARPOON_WEAKEN.wornSpeed + 1);
  });

  it('raggiunta, la battaglia parte e cominci tu', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 20);
    wear(g, w);
    expect(touchOutcome(g, w, [])).toBe('you');
  });

  it('se ti morde per prima comincia lei; se l’hai colpita tu, cominci tu', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 20);
    const ev: GameEvent[] = [];
    expect(touchOutcome(g, w, ev)).toBe('foe');
    expect(ev.some((e) => e.type === 'bitten')).toBe(true);
    const g2 = game();
    const w2 = place(g2, 'squalo_tigre', 20);
    weaponHitsBeast(g2, w2.x, w2.y, [], 1);
    expect(touchOutcome(g2, w2, [])).toBe('you');
  });

  it('senza bestie pronte niente battaglia: morde e ti spinge via', () => {
    const g = game();
    for (const b of g.beasts.team) Object.assign(b, { hp: 0, ko: true });
    const w = place(g, 'squalo_tigre', 20);
    const ev: GameEvent[] = [];
    expect(touchOutcome(g, w, ev)).toBeNull();
    expect(ev.some((e) => e.type === 'bitten')).toBe(true);
  });

  it('in groppa, lo scatto addosso: la cavalcatura morde (si vede) e cominci tu', () => {
    const g = game(true);
    step(g, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 300 && !g.beasts.riding; i++) step(g);
    expect(g.beasts.riding).toBe(true);
    const w = place(g, 'barracuda', 30, 10);
    g.diver.rideDashT = 0.1;
    const ev: GameEvent[] = [];
    expect(touchOutcome(g, w, ev)).toBe('you');
    expect(ev.some((e) => e.type === 'beastWounded')).toBe(true);
    expect(w.wounds).toBeGreaterThan(0);
    expect(g.beasts.mount!.jaw).toBeGreaterThan(0); // its jaws open: the bite is seen
  });
});
