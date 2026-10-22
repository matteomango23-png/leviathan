// Lot BD (22 ottobre 2026): the harpoon wears a beast down by its level (a few hits at level 1-3, almost never a
// high one), and the beast reacts: an aggressive one bolts off and comes back charging, a calm one flees faster than
// you swim. Up on your ship, your companion swims alongside at a calm pace, never hitting the surface.
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON_WEAKEN } from '../src/data/battle';
import { PACK, TEAM_RULES } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { bay as bayX, WORLD } from '../src/data/worldLayout';
import { spawnWild, type WildBeast } from '../src/systems/beasts/wildState';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { weaponHitsBeast, woundPerHit } from '../src/systems/swimFight';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const X = bayX(900);
const DT = 1 / 30;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const hitsToHalf = (level: number): number => Math.ceil(HARPOON_WEAKEN.max / woundPerHit(level) - 1e-9);

function game(): GameState {
  const g = createGame(map, null, 3);
  Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
  g.beasts.team = [];
  giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 8);
  return g;
}

function place(g: GameState, speciesId: string, dx: number, level = 5): WildBeast {
  const w = g.beasts.wilds.find((b) => b.spawn.speciesId === speciesId) ?? g.beasts.wilds[0]!;
  spawnWild(w, { speciesId, variant: 'comune' }, level, X + dx, 200, -1);
  return w;
}

function run(g: GameState, seconds: number, input: InputState = emptyInput(), still = true): void {
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2;
    if (still) Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
    g.beasts.view = { x: g.diver.x - 200, y: g.diver.y - 110, width: 400, height: 220 };
    stepGame(g, input, DT);
    consumePresses(input);
  }
}

describe('l\'arpione sfianca secondo il livello (proprietario: "da 1 a 3, 5-10 arpionate… al 50 assolutamente no")', () => {
  it('pochi colpi a livello basso, tantissimi a livello alto', () => {
    expect(hitsToHalf(1)).toBeGreaterThanOrEqual(5);
    expect(hitsToHalf(3)).toBeLessThanOrEqual(10);
    expect(hitsToHalf(50)).toBeGreaterThan(60);
    expect(hitsToHalf(100)).toBeGreaterThan(hitsToHalf(50) * 1.8);
  });
});

describe('la bestia colpita reagisce (proprietario: "deve iniziare a muoversi più veloce… uscire e arrivare caricando")', () => {
  it("l'aggressiva scappa fuori dall'inquadratura e poi torna caricando", () => {
    const g = game();
    const w = place(g, 'squalo_tigre', 80);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    expect(w.patrol?.st).toBe('bolt');
    expect(w.provoked).toBeGreaterThan(0);
    let wentOff = false;
    let charged = false;
    for (let i = 0; i < 300 && !charged; i++) {
      run(g, DT);
      const v = g.beasts.view!;
      if (w.x < v.x - w.length * 0.5 || w.x > v.x + v.width + w.length * 0.5) wentOff = true;
      if (wentOff && w.charging) charged = true;
    }
    expect(wentOff).toBe(true);
    expect(charged).toBe(true);
  });

  it('la calma colpita scappa più veloce di quanto nuoti tu', () => {
    const g = game();
    const w = place(g, 'tartaruga_marina', 60);
    weaponHitsBeast(g, w.x, w.y, [], 1);
    run(g, 0.3);
    expect(w.mood).toBe('flee');
    let top = 0;
    for (let i = 0; i < 60; i++) {
      run(g, DT);
      top = Math.max(top, Math.hypot(w.vx, w.vy));
    }
    expect(top).toBeGreaterThan(DIVER.maxSpeed);
  });
});

describe('il compagno quando sali a bordo (proprietario: "sbatte sulla superficie come se fosse un muro")', () => {
  it("con te fuori dall'acqua resta sotto la superficie e ci arriva con calma", () => {
    const g = game();
    run(g, DT, { ...emptyInput(), summon: 0 });
    run(g, TEAM_RULES.arriveSeconds + 0.5);
    const m = g.beasts.pack[0]!;
    expect(m.state).toBe('follow');
    let top = Infinity;
    let fastest = 0;
    for (let i = 0; i < 120; i++) {
      Object.assign(g.diver, { x: X, y: WORLD.surfaceY - 8, vx: 0, vy: 0 }); // up on the deck
      g.diver.o2 = g.diver.maxO2;
      stepGame(g, emptyInput(), DT);
      top = Math.min(top, m.y);
      fastest = Math.max(fastest, Math.hypot(m.vx, m.vy));
    }
    expect(top).toBeGreaterThan(WORLD.surfaceY + PACK.alongsideMin * 0.5);
    expect(fastest).toBeLessThanOrEqual(DIVER.lengthUnits * PACK.alongsideSpeed + 1);
  });
});
