// Lot BE (22 ottobre 2026): the hunt that frightens. A hunter roused by your harpoon or your mount's bite stalks you:
// off into the dark, a wait, a warning, a charge faster than you swim (a dash sideways dodges it), its bite, and again.
// Riding, it bites your mount; your mount's dash bites the wild beasts without a battle. No alpha just out of the coast.
import { beforeAll, describe, expect, it } from 'vitest';
import { STALK } from '../src/data/battle';
import { DIVER } from '../src/data/diver';
import { ENDLESS } from '../src/data/endless';
import { bay as bayX } from '../src/data/worldLayout';
import { residentForm, residentsOf } from '../src/systems/beasts/residents';
import { maxHpOf } from '../src/systems/beasts/team';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { mountBite, stalkBite, weaponHitsBeast } from '../src/systems/swimFight';
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

function step(g: GameState, input: InputState = emptyInput(), hold = true): GameEvent[] {
  g.diver.o2 = g.diver.maxO2;
  if (hold) Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
  g.beasts.view = { x: g.diver.x - 200, y: g.diver.y - 110, width: 400, height: 220 };
  const ev = stepGame(g, input, DT);
  consumePresses(input);
  return ev;
}

describe('lo squalo colpito ti dà la caccia (proprietario: "deve fare paura")', () => {
  it('se ne va fuori dallo schermo, aspetta, avvisa, carica più veloce del tuo nuoto e ti morde', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    const phases = new Set<string>();
    let warned = false;
    let bitten = false;
    let fastest = 0;
    for (let i = 0; i < 30 * 12 && !bitten; i++) {
      const ev = step(g);
      if (w.stalk) phases.add(w.stalk.phase);
      if (w.stalk?.phase === 'charge') fastest = Math.max(fastest, Math.hypot(w.vx, w.vy));
      warned ||= ev.some((e) => e.type === 'chargeWarn');
      bitten ||= ev.some((e) => e.type === 'bitten');
      expect(w.motion).toBe('roam'); // never taken out of the sea while it stalks
    }
    expect([...phases]).toEqual(expect.arrayContaining(['away', 'wait', 'warn', 'charge']));
    expect(warned).toBe(true);
    expect(fastest).toBeGreaterThan(DIVER.maxSpeed);
    expect(bitten).toBe(true);
  });

  it("uno scatto di lato all'ultimo momento lo schiva", () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    let dodged = false;
    let bitten = false;
    let y = 200;
    for (let i = 0; i < 30 * 12 && !dodged; i++) {
      const s = w.stalk;
      // it is close on its charge: a dash sideways (the diver ends up a dash away, out of its line)
      if (s?.phase === 'charge' && Math.abs(w.x - g.diver.x) < w.length * 0.9 && y === 200)
        y = 200 + DIVER.dash.speed * 0.6;
      g.diver.o2 = g.diver.maxO2;
      Object.assign(g.diver, { x: X, y, vx: 0, vy: 0 });
      g.beasts.view = { x: X - 200, y: y - 110, width: 400, height: 220 };
      const ev = stepGame(g, emptyInput(), DT);
      bitten ||= ev.some((e) => e.type === 'bitten');
      if (y !== 200 && s?.phase === 'pass') dodged = true;
    }
    expect(dodged).toBe(true);
    expect(bitten).toBe(false);
  });

  it('la sua carica ti morde e parte la battaglia: cominci tu, perché l’hai colpito per primo (24 ottobre)', () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    let bites = 0;
    for (let i = 0; i < 30 * 30 && !g.beasts.battle; i++)
      bites += step(g).filter((e) => e.type === 'bitten').length;
    expect(bites).toBe(1);
    expect(g.beasts.battle).toMatchObject({ wildId: w.id, first: 'you' });
  });

  it("dopo un po' senza essere colpito si stanca e ti lascia", () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 60);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    for (let i = 0; i < 30 * (STALK.seconds + 15) && w.stalk; i++) step(g);
    expect(w.stalk).toBeUndefined();
  });
});

describe('in groppa (proprietario: "la mia creatura deve essere morsa anche lei")', () => {
  it('la carica morde la cavalcatura, non te', () => {
    const g = game(true);
    step(g, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 300 && !g.beasts.riding; i++) step(g);
    expect(g.beasts.riding).toBe(true);
    const mount = g.beasts.team[0]!;
    const w = place(g, 'squalo_tigre', 60, 40);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    const hearts = g.diver.hp;
    const ev: GameEvent[] = [];
    stalkBite(g, w, ev);
    expect(g.diver.hp).toBe(hearts);
    expect(mount.hp).toBeLessThan(maxHpOf(mount));
    expect(ev.some((e) => e.type === 'mountBitten')).toBe(true);
  });

  it('lo scatto della cavalcatura addosso a una bestia la morde e la sfianca senza battaglia', () => {
    const g = game(true);
    step(g, { ...emptyInput(), summon: 0 });
    for (let i = 0; i < 300 && !g.beasts.riding; i++) step(g);
    const w = place(g, 'barracuda', 40, 10);
    mountBite(g, w, []);
    expect(w.wounds).toBeGreaterThan(0.1);
    expect(g.beasts.battle).toBeNull();
  });
});

describe('niente alfa appena fuori dalla costa', () => {
  it('i residenti dei primi tratti sono comuni', () => {
    for (let k = 0; k < ENDLESS.residents.plainFirstStretches; k++)
      for (const r of residentsOf(k)) expect(residentForm(r).form.variant).toBe('comune');
  });
});
