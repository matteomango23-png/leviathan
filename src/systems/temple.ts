// The puzzles of the sunken temples (tappa 14): a lever opens the first gate; two levers hit one soon after the
// other open the second; four runes touched in the order of the mosaic open the third; the relic waits at the
// end of the air corridor. Opened gates are saved as broken tiles; the relic in the equipment.
import { RELICS, TEMPLE_TEXT } from '../data/temples';
import { TILE } from '../data/worldLayout';
import type { GearState } from './economy/gear';
import type { GameEvent } from './events';
import type { TileMap } from './world/tileMap';
import { templeAt, templeCells, type TempleSite } from './world/templeSite';

/** What the temples remember while you play (not saved: a half-done puzzle starts again). */
export interface TempleState {
  /** When each twin lever was last hit (game time), by temple id + lever. */
  twinHit: Record<string, number>;
  /** Runes lit so far, in order, by temple id. */
  runes: Record<string, string[]>;
  /** Marks you are next to now (a message shows once each time you come near). */
  near: Set<string>;
}

export interface TempleWorld {
  map: TileMap;
  time: number;
  diver: { x: number; y: number; dead: boolean };
  gear: GearState;
  temples: TempleState;
}

/** Which gate each puzzle opens. */
const GATE_OF: Record<string, string> = { L: '1', a: '2', b: '2', rune: '3' };

export const createTemples = (): TempleState => ({ twinHit: {}, runes: {}, near: new Set() });

/** Is this gate of the temple open (its tiles are water)? */
export function gateOpen(map: TileMap, t: TempleSite, gate: string): boolean {
  const cell = templeCells(t, gate)[0];
  if (!cell) return true;
  return map.get(Math.floor(cell.x / map.tileSize), Math.floor(cell.y / map.tileSize)) !== TILE.gate;
}

/** Opens a gate: its stone slides away (tiles become water, saved with the broken tiles). */
function openGate(g: TempleWorld, t: TempleSite, gate: string, text: string, events: GameEvent[]): void {
  if (gateOpen(g.map, t, gate)) return;
  const T = g.map.tileSize;
  const tiles: number[] = [];
  for (let x = t.x0 + T / 2; x < t.x1; x += T)
    for (let y = t.y0 + T / 2; y < t.y1; y += T) {
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      if (g.map.get(tx, ty) !== TILE.gate) continue;
      // only this gate's tiles
      const ch = t.def.layout[Math.floor((y - t.y0) / t.def.cell)]?.[Math.floor((x - t.x0) / t.def.cell)];
      if (ch !== gate) continue;
      g.map.set(tx, ty, TILE.water);
      tiles.push(g.map.tileIndex(tx, ty));
    }
  events.push({ type: 'gateOpened', tiles }, { type: 'storyNote', text });
}

/** A weapon tip on a lever. Returns true if it hit one (the shot stops there). */
export function hitLever(g: TempleWorld, x: number, y: number, events: GameEvent[]): boolean {
  const t = templeAt(x, y);
  if (!t) return false;
  const lever = templeCells(t, 'Lab').find((c) => Math.hypot(c.x - x, c.y - y) < t.def.cell);
  if (!lever) return false;
  events.push({ type: 'harpoonHitRock', x, y });
  const gate = GATE_OF[lever.ch]!;
  if (gateOpen(g.map, t, gate)) return true;
  if (lever.ch === 'L') {
    openGate(g, t, gate, TEMPLE_TEXT.lever, events);
    return true;
  }
  // the twin levers: both within the window
  const other = lever.ch === 'a' ? 'b' : 'a';
  const otherAt = g.temples.twinHit[`${t.def.id}:${other}`];
  g.temples.twinHit[`${t.def.id}:${lever.ch}`] = g.time;
  if (otherAt !== undefined && g.time - otherAt <= t.def.twinWindow)
    openGate(g, t, gate, TEMPLE_TEXT.twinDone, events);
  else events.push({ type: 'storyNote', text: TEMPLE_TEXT.twinFirst });
  return true;
}

/** Is this twin lever still down (hit a moment ago)? For the picture. */
export function leverDown(g: TempleWorld, t: TempleSite, ch: string): boolean {
  if (gateOpen(g.map, t, GATE_OF[ch]!)) return true;
  const at = g.temples.twinHit[`${t.def.id}:${ch}`];
  return at !== undefined && g.time - at <= t.def.twinWindow;
}

/** The runes lit in a temple (all of them once its gate is open). */
export function runesLit(g: TempleWorld, t: TempleSite): string[] {
  return gateOpen(g.map, t, GATE_OF.rune!) ? [...t.def.runeOrder] : (g.temples.runes[t.def.id] ?? []);
}

/** Swimming in the temple: runes, the mosaic, the broken chains, the relic. */
export function stepTemples(g: TempleWorld, events: GameEvent[]): void {
  const d = g.diver;
  const t = d.dead ? null : templeAt(d.x, d.y);
  const now = new Set<string>();
  if (t) {
    const reach = t.def.cell * 1.2;
    for (const c of templeCells(t, 'wxyzMNC')) {
      if (Math.hypot(c.x - d.x, c.y - d.y) > reach) continue;
      const key = `${t.def.id}:${c.ch}`;
      now.add(key);
      if (g.temples.near.has(key)) continue; // only when you come near
      if (c.ch === 'M') events.push({ type: 'storyNote', text: TEMPLE_TEXT.mosaic(t.def.runeOrder) });
      else if (c.ch === 'N') events.push({ type: 'storyNote', text: TEMPLE_TEXT.chains });
      else if (c.ch === 'C') takeRelic(g, t.def.relic, events);
      else touchRune(g, t, c.ch, events);
    }
  }
  g.temples.near = now;
}

function touchRune(g: TempleWorld, t: TempleSite, rune: string, events: GameEvent[]): void {
  if (gateOpen(g.map, t, GATE_OF.rune!)) return;
  const lit = (g.temples.runes[t.def.id] ??= []);
  if (lit.includes(rune)) return;
  if (t.def.runeOrder[lit.length] !== rune) {
    // wrong: they all go dark (nothing to say if none was lit)
    if (lit.length) events.push({ type: 'storyNote', text: TEMPLE_TEXT.runeWrong });
    lit.length = 0;
    return;
  }
  lit.push(rune);
  if (lit.length === t.def.runeOrder.length) openGate(g, t, GATE_OF.rune!, TEMPLE_TEXT.runesDone, events);
  else events.push({ type: 'storyNote', text: TEMPLE_TEXT.runeLit });
}

function takeRelic(g: TempleWorld, id: string, events: GameEvent[]): void {
  if (g.gear.relics.includes(id)) return;
  const r = RELICS.find((x) => x.id === id);
  if (!r) return;
  g.gear.relics.push(id);
  events.push({ type: 'relicFound', name: r.name, text: r.text });
}
