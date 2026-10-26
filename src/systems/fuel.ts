// Fuel of the ship and the submarine (owner, 4 ottobre 2026: an expedition is planned). They burn it only while the
// engine runs, more at full throttle; dry, they stop. It is bought at the harbours, moved between the two in the
// cockpit (the submarine in the hold), and far away the rescue flare tows you home for a share of your teeth.
// Numbers in data/ship.ts (SHIP.fuel, FUEL, RESCUE) and data/submarine.ts (tank, perKm of each model).
import { PORTO_FANGO, PORTS, type PortDef } from '../data/economy';
import { FUEL, RESCUE } from '../data/ship';
import { SUBMARINE } from '../data/submarine';
import type { TileMap } from './world/tileMap';
import type { GameEvent } from './events';
import { harbourShip, vehiclesStuck } from './ship/unstuck';
import { hullBlocked, submerged } from './ship/uboat';
export { autonomyKm, litresFor, perKmAt } from './fuelBurn';
import { helmPoint } from './ship/geometry';
import { shipAlongside } from './economy/places';
import { SHIP_WEST_X } from './ship/surface';
import { shipTank, type ShipState } from './ship/ship';
import { restAboard, subModel, type SubState } from './submarine';
import { subTopY } from './subState';
import { boatModel, type BoatState } from './boat';
import type { TeamBeast } from './beasts/team';

export interface FuelWorld {
  ship: ShipState;
  sub: SubState;
  boat: BoatState;
  port: PortDef | null;
  gear: { teeth: number };
  diver: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    face: 1 | -1;
    hp: number;
    maxHp: number;
    o2: number;
    maxO2: number;
    dead: boolean;
    invulnerable: number;
    deadTime: number;
  };
  beasts: { team: TeamBeast[] };
  homePort: PortDef['id'];
}

/** In the cockpit, the submarine in the hold: moves up to one step of fuel to it (or from it). Returns litres. */
export function transferFuel(g: FuelWorld, toSub: boolean): number {
  if (!g.ship.owned || !g.sub.owned || g.ship.bay !== 'docked') return 0;
  const subTank = subModel(g.sub.model).tank;
  const room = toSub ? subTank - g.sub.fuel : shipTank(g.ship) - g.ship.fuel;
  const have = toSub ? g.ship.fuel : g.sub.fuel;
  const l = Math.max(0, Math.min(FUEL.transferStep, room, have));
  if (toSub) {
    g.ship.fuel -= l;
    g.sub.fuel += l;
  } else {
    g.sub.fuel -= l;
    g.ship.fuel += l;
  }
  return l;
}

/** What the harbour's pump fills: a tank, or the speedboat's drums (for the ship, block 4b). */
export type FuelTarget = 'ship' | 'sub' | 'boat' | 'drums';

/** Can this vehicle fill up at the harbour you are in? The ship alongside its pier; the submarine in its hold
 *  there, or moored by the pier; the speedboat at its pier, or in the hold of the ship there. */
export function canRefuel(g: FuelWorld, which: FuelTarget): boolean {
  const p = g.port;
  if (!p) return false;
  const shipHere = g.ship.owned && shipAlongside(g.ship.x, p);
  if (which === 'ship') return shipHere;
  if (which === 'boat' || which === 'drums') {
    const b = g.boat;
    if (!b.owned) return false;
    return (b.bay === 'docked' && shipHere) || (b.bay === 'out' && shipAlongside(b.x, p));
  }
  if (!g.sub.owned) return false;
  return (g.ship.bay === 'docked' && shipHere) || Math.abs(g.sub.x - p.x) < FUEL.portReach;
}

interface FuelBuy {
  ok: boolean;
  litres: number;
  cost: number;
  reason?: string;
}

/** Fills the tank as far as your teeth go. */
/** Litres now and the most it holds, for each target. */
export function fuelLevel(g: FuelWorld, which: FuelTarget): [number, number] {
  if (which === 'ship') return [g.ship.fuel, shipTank(g.ship)];
  if (which === 'sub') return [g.sub.fuel, subModel(g.sub.model).tank];
  const m = boatModel(g.boat.model);
  return which === 'boat' ? [g.boat.fuel, m.tank] : [g.boat.drums, m.drums];
}

const NOT_HERE: Record<FuelTarget, string> = {
  ship: 'La nave non è attraccata qui.',
  sub: 'Il sottomarino non è qui.',
  boat: 'Il motoscafo non è qui.',
  drums: 'Il motoscafo non è qui.',
};

export function buyFuel(g: FuelWorld, which: FuelTarget): FuelBuy {
  if (!canRefuel(g, which)) return { ok: false, litres: 0, cost: 0, reason: NOT_HERE[which] };
  const [now, tank] = fuelLevel(g, which);
  const litres = Math.min(tank - now, Math.floor(g.gear.teeth / FUEL.pricePerLitre));
  if (litres <= 0)
    return {
      ok: false,
      litres: 0,
      cost: 0,
      reason:
        now >= tank
          ? which === 'drums'
            ? 'I fusti sono pieni.'
            : 'Il serbatoio è pieno.'
          : 'Non hai denti.',
    };
  const cost = Math.ceil(litres * FUEL.pricePerLitre);
  g.gear.teeth -= cost;
  if (which === 'ship') g.ship.fuel += litres;
  else if (which === 'sub') g.sub.fuel += litres;
  else if (which === 'boat') g.boat.fuel += litres;
  else g.boat.drums += litres;
  return { ok: true, litres, cost };
}

const ALL: FuelTarget[] = ['ship', 'sub', 'boat', 'drums'];

/** Filling everything that is here (owner, 16 ottobre: one button): the litres missing and their price. */
export function fillAllQuote(g: FuelWorld): { litres: number; cost: number } {
  let litres = 0;
  for (const w of ALL) {
    if (!canRefuel(g, w)) continue;
    const [now, tank] = fuelLevel(g, w);
    litres += Math.max(0, tank - now);
  }
  return { litres, cost: Math.ceil(litres * FUEL.pricePerLitre) };
}

/** Fills everything that is here, the ship first, as far as your teeth go. */
export function buyFuelAll(g: FuelWorld): FuelBuy {
  let litres = 0;
  let cost = 0;
  for (const w of ALL) {
    if (!canRefuel(g, w)) continue;
    const r = buyFuel(g, w);
    litres += r.litres;
    cost += r.cost;
  }
  return litres > 0
    ? { ok: true, litres, cost }
    : { ok: false, litres: 0, cost: 0, reason: 'Tutti i serbatoi sono pieni, o non hai denti.' };
}

/** The rescue flare works from the helm or inside the submarine. */
export const canRescue = (g: FuelWorld): boolean =>
  g.ship.aboard || (g.sub.aboard && g.ship.bay !== 'launching' && g.ship.bay !== 'docking');

/**
 * The rescue flare: at the helm, a tug tows the ship to the nearest harbour; in the submarine, it is towed to the
 * hold of your ship (you at the helm), or to Portofosco without one. It costs a share of your teeth.
 */
export function rescue(g: FuelWorld & { map: TileMap }, events: GameEvent[]): void {
  if (!canRescue(g)) return;
  const teeth = Math.min(
    g.gear.teeth,
    Math.max(RESCUE.minTeeth, Math.floor(g.gear.teeth * RESCUE.teethShare)),
  );
  g.gear.teeth -= teeth;
  const s = g.ship;
  let where: string;
  if (s.aboard || (g.sub.aboard && s.owned)) {
    if (s.aboard) {
      // the nearest harbour the ship can reach (none west of Porto Fango: ship/surface.ts); broken down, to Porto
      // Fango, the only yard that mends it (block 5c)
      const port =
        s.hull <= 0
          ? PORTO_FANGO
          : PORTS.filter((p) => p.shipDock >= SHIP_WEST_X).reduce((a, b) =>
              Math.abs(b.shipDock - s.x) < Math.abs(a.shipDock - s.x) ? b : a,
            );
      // at the pier afloat, its vehicles in the hold (owner, 26 ottobre: a dived U-Boat came in inside the rock)
      harbourShip(g, port);
      g.homePort = port.id;
      where = `a ${port.name}`;
    } else if (vehiclesStuck(g) || (submerged(s) && hullBlocked(g.map, s, s.x, s.dive))) {
      harbourShip(g);
      where = `a ${PORTO_FANGO.name}`;
    } else {
      g.sub.aboard = false;
      s.bay = 'docked';
      s.aboard = true;
      restAboard(g);
      where = 'alla tua nave';
    }
    Object.assign(g.diver, helmPoint(s), { vx: 0, vy: 0 });
  } else {
    Object.assign(g.sub, { x: SUBMARINE.mooredX, y: subTopY(g.sub), vx: 0, vy: 0 });
    Object.assign(g.diver, { x: g.sub.x, y: g.sub.y, vx: 0, vy: 0 });
    where = 'a Portofosco';
  }
  events.push({ type: 'rescued', where, teeth });
}
