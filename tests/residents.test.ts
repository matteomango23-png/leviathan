// The beasts living in the endless sea (owner, 5 ottobre 2026: "under the ship there was nothing"): each stretch
// has its residents, always the same, at their depth; the sonar hears them from the ship; near you they come out
// for real; caught or beaten, the place stays empty for a while; left behind, they go back to their lap.
import { beforeAll, describe, expect, it } from 'vitest';
import { SPECIES_DEPTH } from '../src/data/beasts';
import { ENDLESS } from '../src/data/endless';
import { WORLD } from '../src/data/worldLayout';
import { residentAt, residentGone, residentsNear, residentsOf } from '../src/systems/beasts/residents';
import { isInWater } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { sonarReadout } from '../src/systems/hunts';
import { consumePresses, emptyInput } from '../src/systems/input';
import { giveTestBeast } from '../src/systems/testTools';
import { biomeOf } from '../src/systems/world/endless';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;
const S = ENDLESS.startX;
const km = WORLD.unitsPerMetre * 1000;

function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  const input = emptyInput();
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

function game(): GameState {
  const g = createGame(map, null, 4);
  g.story.step = 'chapter4Done';
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 30);
  run(g, DT);
  return g;
}

describe('abitanti del mare aperto', () => {
  it('ogni tratto ha i suoi, sempre gli stessi, del suo mare e alla loro profondità', () => {
    for (const k of [0, 5, 40, 90]) {
      const list = residentsOf(k);
      expect(list.length).toBeGreaterThan(ENDLESS.residents.perStretch / 2);
      expect(residentsOf(k)).toBe(list); // the same every time
      for (const r of list) {
        expect(Object.keys(biomeOf(k).beasts)).toContain(r.speciesId);
        const z = SPECIES_DEPTH[r.speciesId];
        const depthM = (r.homeY - WORLD.surfaceY) / WORLD.unitsPerMetre;
        if (z?.minM !== undefined) expect(depthM).toBeGreaterThanOrEqual(z.minM - 0.01);
        if (z?.maxM !== undefined) expect(depthM).toBeLessThanOrEqual(z.maxM + 0.01);
        const p = residentAt(r, 123);
        expect(p.y).toBeGreaterThanOrEqual(r.top);
        expect(p.y).toBeLessThanOrEqual(r.bottom);
      }
    }
    // farther out, stronger
    const band = (k: number): number =>
      residentsOf(k).reduce((a, r) => a + r.band, 0) / residentsOf(k).length;
    expect(band(90)).toBeGreaterThan(band(3));
  });

  it('dalla nave, piano e col sonar acceso, si sentono i puntini degli animali sotto', () => {
    const g = game();
    Object.assign(g.ship, { aboard: true, sonarOn: true, x: S + 3 * km, speed: 0 });
    run(g, DT);
    const r = sonarReadout(g);
    expect(r.status).toBe('on');
    expect(r.echoes.filter((e) => e.label !== 'eco anomala').length).toBeGreaterThan(3);
    for (const e of r.echoes) expect(Math.abs(e.dx)).toBeLessThanOrEqual(r.rangeM);
  });

  it('vicino a te escono davvero; lontano tornano al loro giro', () => {
    const g = game();
    const x = S + 5 * km;
    const near = residentsNear(g.beasts.residents, x, 2000);
    const c = near[0]!;
    g.beasts.decoy = { id: 'test', t: 999 }; // hidden in a swarm: nobody starts a battle
    Object.assign(g.diver, { x: c.x, y: c.y, vx: 0, vy: 0 });
    run(g, 4);
    const out = g.beasts.wilds.filter((w) => isInWater(w) && w.spawn.resident);
    expect(out.length).toBeGreaterThan(0);
    for (const w of out) expect(g.beasts.residents.awake[w.spawn.resident!]).toBe(w.id);
    const ids = out.map((w) => w.spawn.resident!);
    // you go far away: they go back into the dark, still living there
    Object.assign(g.diver, { x: x + 4 * km, y: c.y, vx: 0, vy: 0 });
    run(g, 1);
    for (const id of ids) expect(g.beasts.residents.awake[id]).toBeUndefined();
    const home = residentsNear(g.beasts.residents, c.r.homeX, ENDLESS.residents.roamX + 10);
    expect(home.some((n) => n.r.id === c.r.id)).toBe(true);
  });

  it('catturato o sconfitto, il suo posto resta vuoto per un po’', () => {
    const g = game();
    const s = g.beasts.residents;
    const c = residentsNear(s, S + 8 * km, 600)[0]!;
    residentGone(s, c.r.id, () => 0);
    expect(residentsNear(s, c.x, 600).some((n) => n.r.id === c.r.id)).toBe(false);
    s.clock += ENDLESS.residents.returnSeconds[0] + 1;
    expect(residentsNear(s, residentAt(c.r, s.clock).x, 600).some((n) => n.r.id === c.r.id)).toBe(true);
  });
});
