// Places you interact with: the pier of Portofosco and the wrecks/chests on the sea floor.
import { PORT, WRECKS, WRECK_REACH, type WreckDef } from '../../data/economy';
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

export function atPort(d: { x: number; y: number; dead: boolean }, map: TileMap): boolean {
  return !d.dead && Math.abs(d.x - PORT.x) < PORT.reach && d.y < map.surfaceY + PORT.surfaceBand;
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
