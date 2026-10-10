// Mending the ship (block 5c, owner 10 ottobre 2026): only at Porto Fango, the ships' harbour. The ship moored there
// is mended for teeth; out at sea, broken down or worn, you take the speedboat (or jet ski) or the submarine to
// Porto Fango, load spare parts and bring them back: docked in its hold, the parts mend the ship. Pure logic.
import { PORTO_FANGO } from '../../data/economy';
import { SHIP } from '../../data/ship';
import type { BoatState } from '../boat';
import type { GameEvent } from '../events';
import { canRefuel, type FuelWorld } from '../fuel';
import { hullMax, mendShip } from './shipHull';
import { shipModel } from './model';

const H = SHIP.hull;

export type PartsCarrier = 'boat' | 'sub';

export interface Result {
  ok: boolean;
  reason?: string;
  points?: number;
  cost?: number;
}

const atYard = (g: FuelWorld): boolean => g.port?.id === PORTO_FANGO.id;

/** Teeth per hull point at the yard: whole from nothing costs SHIP.hull.fullRepairShare of the ship's price. */
export const repairPerPoint = (s: { model: string }): number =>
  (Math.max(H.giftValue, shipModel(s).price) * H.fullRepairShare) / hullMax(s);

/** What the ship still lacks, less the parts already on their way to it. */
const missing = (g: FuelWorld): number =>
  Math.max(0, hullMax(g.ship) - g.ship.hull - g.boat.parts - g.sub.parts);

const capacity = (which: PartsCarrier): number => (which === 'boat' ? H.partsBoat : H.partsSub);
const carrier = (g: FuelWorld, which: PartsCarrier): { parts: number } => (which === 'boat' ? g.boat : g.sub);

/** The ship moored at Porto Fango, to be mended: how much it lacks and what it costs. */
export function yardRepair(g: FuelWorld): { here: boolean; points: number; cost: number } {
  const here = atYard(g) && canRefuel(g, 'ship');
  const points = Math.max(0, hullMax(g.ship) - g.ship.hull);
  return { here, points, cost: Math.ceil(points * repairPerPoint(g.ship)) };
}

export function repairAtYard(g: FuelWorld, events: GameEvent[]): Result {
  const r = yardRepair(g);
  if (!r.here) return { ok: false, reason: 'La nave si ripara solo ormeggiata a Porto Fango.' };
  if (r.points <= 0) return { ok: false, reason: 'Lo scafo è già intero.' };
  if (g.gear.teeth < r.cost)
    return { ok: false, reason: `Servono ${r.cost} denti (ne hai ${g.gear.teeth}).` };
  g.gear.teeth -= r.cost;
  const points = mendShip(g.ship, r.points);
  events.push({ type: 'shipMended', points, by: 'yard' });
  return { ok: true, points, cost: r.cost };
}

/** Spare parts the speedboat or the submarine can still load here, and their price. */
export function partsOffer(
  g: FuelWorld,
  which: PartsCarrier,
): { here: boolean; points: number; cost: number } {
  const owned = which === 'boat' ? g.boat.owned : g.sub.owned;
  const here = owned && atYard(g) && canRefuel(g, which) && g.ship.owned;
  const room = capacity(which) - carrier(g, which).parts;
  const points = Math.max(0, Math.min(room, missing(g)));
  return { here, points, cost: Math.ceil(points * repairPerPoint(g.ship) * H.partsMult) };
}

export function loadParts(g: FuelWorld, which: PartsCarrier): Result {
  const o = partsOffer(g, which);
  if (!o.here) return { ok: false, reason: 'I ricambi della nave si comprano a Porto Fango.' };
  if (o.points <= 0)
    return { ok: false, reason: 'Nessun ricambio da caricare: la nave è intera o è già pieno.' };
  if (g.gear.teeth < o.cost)
    return { ok: false, reason: `Servono ${o.cost} denti (ne hai ${g.gear.teeth}).` };
  g.gear.teeth -= o.cost;
  carrier(g, which).parts += o.points;
  return { ok: true, points: o.points, cost: o.cost };
}

/** Back in the ship's hold: the parts they carry mend it (what is left stays aboard them). */
export function unloadParts(
  g: { ship: FuelWorld['ship']; boat: BoatState; sub: FuelWorld['sub'] },
  events: GameEvent[],
): void {
  let points = 0;
  if (g.boat.owned && g.boat.bay === 'docked' && g.boat.parts > 0) {
    const used = mendShip(g.ship, g.boat.parts);
    g.boat.parts -= used;
    points += used;
  }
  if (g.sub.owned && !g.sub.aboard && g.ship.bay === 'docked' && g.sub.parts > 0) {
    const used = mendShip(g.ship, g.sub.parts);
    g.sub.parts -= used;
    points += used;
  }
  if (points > 0) events.push({ type: 'shipMended', points, by: 'parts' });
}
