// Mending each vehicle at any harbour (owner, 16 ottobre 2026: "in ogni porto una tab per le navi e i mezzi, per
// riparare tutti i mezzi singolarmente"): the ship moored alongside, the speedboat and the submarine by the pier.
// Each hull point costs what it always did (the ship by its price, the small boats by data). Pure logic.
import { SEA_STATE } from '../../data/sea';
import { SUBMARINE } from '../../data/submarine';
import { boatModel } from '../boat';
import type { GameEvent } from '../events';
import { canRefuel, type FuelWorld } from '../fuel';
import { hullMax, mendShip } from '../ship/shipHull';
import { repairPerPoint } from '../ship/spareParts';
import { subModel } from '../subState';

export type Vehicle = 'ship' | 'boat' | 'sub';

interface RepairQuote {
  owned: boolean;
  /** It is here, at this harbour. */
  here: boolean;
  hull: number;
  max: number;
  /** Hull points it lacks, and what mending all of them costs. */
  points: number;
  cost: number;
}

export function repairQuote(g: FuelWorld, which: Vehicle): RepairQuote {
  const [owned, hull, max, perPoint] =
    which === 'ship'
      ? [g.ship.owned, g.ship.hull, hullMax(g.ship), repairPerPoint(g.ship)]
      : which === 'boat'
        ? [g.boat.owned, g.boat.hull, boatModel(g.boat.model).hull, SEA_STATE.boatRepairPerPoint]
        : [g.sub.owned, g.sub.hull, subModel(g.sub.model).hull, SUBMARINE.repairPerPoint];
  const points = owned ? Math.max(0, max - hull) : 0;
  return { owned, here: owned && canRefuel(g, which), hull, max, points, cost: Math.ceil(points * perPoint) };
}

/** Mends it whole, if it is here and you have the teeth. */
export function repairVehicle(
  g: FuelWorld,
  which: Vehicle,
  events: GameEvent[],
): { ok: boolean; reason?: string; cost?: number } {
  const q = repairQuote(g, which);
  if (!q.owned) return { ok: false, reason: 'Non ce l’hai.' };
  if (!q.here) return { ok: false, reason: 'Non è qui al porto.' };
  if (q.points <= 0) return { ok: false, reason: 'È già intero.' };
  if (g.gear.teeth < q.cost)
    return { ok: false, reason: `Servono ${q.cost} denti (ne hai ${g.gear.teeth}).` };
  g.gear.teeth -= q.cost;
  if (which === 'ship') events.push({ type: 'shipMended', points: mendShip(g.ship, q.points), by: 'yard' });
  else if (which === 'boat') {
    g.boat.hull = q.max;
    events.push({ type: 'boatRepaired', cost: q.cost });
  } else {
    g.sub.hull = q.max;
    events.push({ type: 'subRepaired', cost: q.cost });
  }
  return { ok: true, cost: q.cost };
}
