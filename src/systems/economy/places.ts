// Places you interact with: the piers of Portofosco and Porto Fango, and the wrecks/chests on the sea floor.
import { OUTPOSTS, PORTS, WRECKS, WRECK_REACH, type PortDef, type WreckDef } from '../../data/economy';
import type { GameEvent } from '../events';
import type { TileMap } from '../world/tileMap';
import type { GearState } from './gear';

export interface Wreck {
  def: WreckDef;
  x: number;
  y: number; // resting on the floor
}

export function placeWrecks(map: TileMap): Wreck[] {
  return WRECKS.map((def) => ({ def, x: def.x, y: map.floorBelow(def.x, def.y) - 4 }));
}

/** The harbour whose pier you float at, or null. */
export function portAt(d: { x: number; y: number; dead: boolean }, map: TileMap): PortDef | null {
  if (d.dead) return null;
  return PORTS.find((p) => Math.abs(d.x - p.x) < p.reach && d.y < map.surfaceY + p.surfaceBand) ?? null;
}

export function atPort(d: { x: number; y: number; dead: boolean }, map: TileMap): boolean {
  return portAt(d, map) !== null;
}

/** Where you wake up at a harbour (in the water, by its pier). */
export function portStart(p: PortDef): { x: number; y: number } {
  return { x: p.x + 25, y: 38 };
}

export function nearWreck(
  wrecks: Wreck[],
  gear: GearState,
  x: number,
  y: number,
  reach = WRECK_REACH,
): Wreck | undefined {
  return wrecks.find((w) => !gear.wrecks.includes(w.def.id) && Math.hypot(w.x - x, w.y - 6 - y) < reach);
}

export interface WreckLoot {
  weapon?: string;
  teeth: number;
  item?: string;
}

/** Opens a wreck or chest once and puts the loot in the gear. */
export function openWreck(w: Wreck, gear: GearState): WreckLoot | null {
  if (gear.wrecks.includes(w.def.id)) return null;
  gear.wrecks.push(w.def.id);
  const r = w.def.reward;
  const loot: WreckLoot = { teeth: r.teeth ?? 0 };
  gear.teeth += loot.teeth;
  if (r.weapon && !gear.weapons.includes(r.weapon)) {
    gear.weapons.push(r.weapon);
    loot.weapon = r.weapon;
  }
  if (r.item) {
    gear.inventory[r.item] = (gear.inventory[r.item] ?? 0) + 1;
    loot.item = r.item;
  }
  return loot;
}

/** Key of a found outpost in the bestiary's "seen" list (no change to the save file). */
export const outpostKey = (id: string): string => `avamposto:${id}`;

/** How near (units) an outpost has to be to be found: you see its lantern from afar. */
const OUTPOST_SIGHT = 600;

/** Sailing or swimming near an outpost finds it: it shows on the map from then on. */
export function discoverOutposts(
  g: { seen: Set<string>; diver: { x: number } },
  events: GameEvent[],
): void {
  for (const p of OUTPOSTS) {
    if (g.seen.has(outpostKey(p.id)) || Math.abs(g.diver.x - p.x) > OUTPOST_SIGHT) continue;
    g.seen.add(outpostKey(p.id));
    events.push({ type: 'outpostFound', name: p.name });
  }
}
