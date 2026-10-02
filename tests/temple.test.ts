// The first sunken temple (tappa 14): where it lies, its stone and gates, the three puzzles, the relic, the save.
import { beforeAll, describe, expect, it } from 'vitest';
import { RELICS, TEMPLES } from '../src/data/temples';
import { TILE } from '../src/data/worldLayout';
import { diverModifiers } from '../src/systems/economy/gear';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { gateOpen, hitLever, stepTemples } from '../src/systems/temple';
import { biomeAt, endlessFloor, kmFromCoast, ventAt } from '../src/systems/world/endless';
import { templeCells, templeSites, type TempleSite } from '../src/systems/world/templeSite';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { zoneAt } from '../src/systems/world/zones';

let map: TileMap;
let t: TempleSite;
beforeAll(() => {
  map = generateWorld();
  t = templeSites()[0]!;
});
const cell = (ch: string): { x: number; y: number } => templeCells(t, ch)[0]!;
const fresh = (): GameState => {
  const g = createGame(generateWorld(), null, 3);
  t = templeSites()[0]!;
  return g;
};
/** The diver swims next to a mark of the temple. */
const visit = (g: GameState, ch: string, ev: GameEvent[] = []): GameEvent[] => {
  const c = cell(ch);
  Object.assign(g.diver, { x: c.x, y: c.y });
  stepTemples(g, ev);
  Object.assign(g.diver, { x: t.x0 + 40, y: t.y0 + 40 }); // and swims away
  stepTemples(g, ev);
  return ev;
};
/** Can you swim from one point to another through the tiles (4-neighbour flood)? */
function reachable(m: TileMap, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const T = m.tileSize;
  const tx0 = Math.floor(t.x0 / T) - 2;
  const tx1 = Math.floor(t.x1 / T) + 2;
  const ty0 = Math.floor(t.y0 / T) - 4;
  const ty1 = Math.floor(t.y1 / T) + 1;
  const goal = `${Math.floor(b.x / T)},${Math.floor(b.y / T)}`;
  const seen = new Set<string>();
  const q: [number, number][] = [[Math.floor(a.x / T), Math.floor(a.y / T)]];
  while (q.length) {
    const [x, y] = q.pop()!;
    const k = `${x},${y}`;
    if (seen.has(k) || x < tx0 || x > tx1 || y < ty0 || y > ty1 || m.get(x, y) !== TILE.water) continue;
    if (k === goal) return true;
    seen.add(k);
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return false;
}

describe('the sunken temple', () => {
  it('lies half buried in the open sea, at least 3 km from the coast', () => {
    const def = TEMPLES[0]!;
    for (const row of def.layout) expect(row.length).toBe(def.layout[0]!.length);
    expect(biomeAt((t.x0 + t.x1) / 2)?.id).toBe(def.where.biome);
    expect(kmFromCoast(t.x0)).toBeGreaterThanOrEqual(def.where.minKm);
    // the floor meets its sides, and over it the floor is its roof
    expect(Math.abs(endlessFloor(t.x0 - 1) - t.ground)).toBeLessThan(2);
    expect(endlessFloor((t.x0 + t.x1) / 2)).toBe(t.y0);
    expect(zoneAt(cell('M').x, cell('M').y)).toBe(def.name);
  });

  it('is carved stone with gates; the gates are solid until opened', () => {
    const T = map.tileSize;
    const at = (p: { x: number; y: number }): number => map.get(Math.floor(p.x / T), Math.floor(p.y / T));
    expect(at({ x: t.x0 + 2, y: t.y0 + 40 })).toBe(TILE.temple);
    expect(at(cell('1'))).toBe(TILE.gate);
    expect(map.hitCircle(cell('1').x, cell('1').y, 4)).toBe(true);
    expect(at({ x: t.x0 + 4, y: t.y1 + 30 })).toBe(TILE.rock); // buried
    expect(at({ x: cell('L').x, y: t.y0 - 30 })).toBe(TILE.water); // open water over its roof
  });

  it('the way in reaches the relic only with every gate open', () => {
    const g = fresh();
    const door = { x: t.x0 + 7.5 * t.def.cell, y: t.y0 - 20 }; // over the gap in the roof
    expect(reachable(g.map, door, cell('L'))).toBe(true);
    expect(reachable(g.map, door, cell('C'))).toBe(false);
    const ev: GameEvent[] = [];
    hitLever(g, cell('L').x, cell('L').y, ev);
    g.time = 100;
    hitLever(g, cell('a').x, cell('a').y, ev);
    g.time = 103;
    hitLever(g, cell('b').x, cell('b').y, ev);
    for (const r of t.def.runeOrder) visit(g, r, ev);
    for (const gate of '123') expect(gateOpen(g.map, t, gate)).toBe(true);
    expect(reachable(g.map, door, cell('C'))).toBe(true);
  });

  it('the lever opens the first gate, and it stays open in the save', () => {
    const g = fresh();
    const ev: GameEvent[] = [];
    expect(hitLever(g, cell('L').x + 3, cell('L').y, ev)).toBe(true);
    expect(gateOpen(g.map, t, '1')).toBe(true);
    expect(gateOpen(g.map, t, '2')).toBe(false);
    const opened = ev.find((e) => e.type === 'gateOpened');
    expect(opened && opened.type === 'gateOpened' && opened.tiles.length).toBeGreaterThan(0);
    // the game keeps the tiles with the broken ones (stepGame does this for every gateOpened)
    if (opened?.type === 'gateOpened') g.brokenTiles.push(...opened.tiles);
    const back = createGame(generateWorld(), parseSave(JSON.stringify(toSave(g, new Date()))), 3);
    expect(gateOpen(back.map, t, '1')).toBe(true);
    expect(gateOpen(back.map, t, '2')).toBe(false);
  });

  it('the twin levers open the second gate only if hit one soon after the other', () => {
    const g = fresh();
    const ev: GameEvent[] = [];
    g.time = 10;
    hitLever(g, cell('a').x, cell('a').y, ev);
    g.time = 10 + t.def.twinWindow + 1; // too late
    hitLever(g, cell('b').x, cell('b').y, ev);
    expect(gateOpen(g.map, t, '2')).toBe(false);
    g.time += t.def.twinWindow - 1; // a again, in time after b
    hitLever(g, cell('a').x, cell('a').y, ev);
    expect(gateOpen(g.map, t, '2')).toBe(true);
  });

  it('the runes open the third gate in the order of the mosaic; a wrong one puts them all out', () => {
    const g = fresh();
    const [r1, r2, r3, r4] = t.def.runeOrder as [string, string, string, string];
    visit(g, r1);
    visit(g, r3); // wrong
    expect(g.temples.runes[t.def.id]).toEqual([]);
    for (const r of [r1, r2, r3]) visit(g, r);
    expect(gateOpen(g.map, t, '3')).toBe(false);
    visit(g, r4);
    expect(gateOpen(g.map, t, '3')).toBe(true);
    // the mosaic shows the order
    const ev = visit(g, 'M');
    expect(ev.some((e) => e.type === 'storyNote')).toBe(true);
  });

  it('the relic is yours for ever: your air lasts longer', () => {
    const g = fresh();
    const before = diverModifiers(g.gear).o2DrainMult;
    const ev = visit(g, 'C');
    expect(ev).toContainEqual(expect.objectContaining({ type: 'relicFound', name: RELICS[0]!.name }));
    expect(g.gear.relics).toEqual([t.def.relic]);
    expect(diverModifiers(g.gear).o2DrainMult).toBeCloseTo(before * RELICS[0]!.o2DrainMult!);
    expect(visit(g, 'C').some((e) => e.type === 'relicFound')).toBe(false); // only once
    const back = createGame(generateWorld(), parseSave(JSON.stringify(toSave(g, new Date()))), 3);
    expect(back.gear.relics).toEqual([t.def.relic]);
  });

  it('has air vents along its corridor', () => {
    const vents = templeCells(t, 'V');
    expect(vents.length).toBeGreaterThanOrEqual(3);
    for (const v of vents) expect(ventAt(v.x, v.y)).not.toBeNull();
  });
});
