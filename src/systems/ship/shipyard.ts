// The shipyard of Porto Fango (owner, 8 ottobre 2026, block 4): you may own several ships. The one in use sails;
// the others wait moored at Porto Fango, each with its own fuel and its own vehicles as you left them. A new ship
// comes with a full tank and new vehicles and goes into use; any ship you own but do not use can be sold for half
// its price, except Aurelio's gift.
import { PORTO_FANGO } from '../../data/economy';
import { KEEP_FOREVER, SELL_SHARE, SHIP_MODELS, type ShipModelDef } from '../../data/fleet';
import { SUBMARINE } from '../../data/submarine';
import { boatFromYard, boatModel, type BoatState } from '../boat';
import { subModel, type SubState } from '../submarine';
import { shipModel, shipTank } from './model';
import { freshHatches, type ShipState } from './ship';
import { fullAir, submerged } from './uboat';

/** A ship you own and do not use: moored at Porto Fango with its fuel and its vehicles' state. */
export interface MooredShip {
  model: string;
  fuel: number;
  sub?: { hull: number; fuel: number };
  boat?: { fuel: number; drums: number };
}

export interface ShipyardWorld {
  ship: ShipState;
  sub: SubState;
  boat: BoatState;
  /** Your other ships (saved). */
  fleet: MooredShip[];
  gear: { teeth: number };
  port: { id: string } | null;
}

type Result = { ok: boolean; reason?: string };

/** You own this model: in use, or moored. */
export const ownsShip = (g: ShipyardWorld, id: string): boolean =>
  (g.ship.owned && g.ship.model === id) || g.fleet.some((m) => m.model === id);

/** The teeth to pay for this model. */
export const shipCost = (_g: ShipyardWorld, id: string): number =>
  SHIP_MODELS.find((x) => x.id === id)?.price ?? Infinity;

/** What the yard pays for it (0: it is not for sale, like Aurelio's gift). */
export const sellPrice = (id: string): number =>
  id === KEEP_FOREVER ? 0 : Math.round((SHIP_MODELS.find((x) => x.id === id)?.price ?? 0) * SELL_SHARE);

/** Can the ship in use change now? At Porto Fango, you on board, its vehicles in their holds. */
function yardReady(g: ShipyardWorld): Result {
  if (g.port?.id !== PORTO_FANGO.id)
    return { ok: false, reason: 'Le navi si comprano al cantiere di Porto Fango.' };
  if (!g.ship.owned) return { ok: false, reason: 'Prima Aurelio ti deve dare la tua prima nave.' };
  if (g.sub.aboard || g.boat.aboard) return { ok: false, reason: 'Torna a bordo della nave, prima.' };
  if (submerged(g.ship)) return { ok: false, reason: 'Riemergi, prima.' };
  if (g.sub.owned && g.ship.bay !== 'docked')
    return { ok: false, reason: 'Riporta il sottomarino nella stiva, prima.' };
  if (g.boat.owned && g.boat.bay !== 'docked')
    return { ok: false, reason: 'Riporta il motoscafo nella stiva, prima.' };
  return { ok: true };
}

/** The ship in use, as it waits moored. */
function moor(g: ShipyardWorld): MooredShip {
  return {
    model: g.ship.model,
    fuel: g.ship.fuel,
    ...(g.sub.owned ? { sub: { hull: g.sub.hull, fuel: g.sub.fuel } } : {}),
    ...(g.boat.owned ? { boat: { fuel: g.boat.fuel, drums: g.boat.drums } } : {}),
  };
}

/** This model goes into use at the pier: its vehicles as they were (`from`), or new from the yard. */
function bringIn(g: ShipyardWorld, m: ShipModelDef, from: MooredShip | null): void {
  const s = g.ship;
  Object.assign(s, {
    model: m.id,
    x: PORTO_FANGO.shipDock,
    speed: 0,
    hatches: freshHatches({ model: m.id }),
    dockFrom: null,
    engineOn: false,
    prop: 0,
    broken: [],
    dive: 0,
    air: fullAir({ model: m.id }),
  });
  s.fuel = Math.min(shipTank(s), from ? from.fuel : shipTank(s));
  const subBay = m.bays.find((b) => b.kind === 'sub');
  if (subBay) {
    const sm = subModel(subBay.model);
    Object.assign(g.sub, {
      owned: true,
      model: sm.id,
      models: [sm.id],
      hull: Math.min(sm.hull, from?.sub?.hull ?? sm.hull),
      fuel: Math.min(sm.tank, from?.sub?.fuel ?? sm.tank),
      x: PORTO_FANGO.shipDock,
      y: SUBMARINE.restY,
      vx: 0,
      vy: 0,
      aboard: false,
    });
    s.bay = 'docked';
    s.bayT = 0;
  } else {
    s.bay = 'none';
    g.sub.owned = false;
  }
  const boatBay = m.bays.find((b) => b.kind === 'boat' || b.kind === 'jetski');
  boatFromYard(g.boat, boatBay?.model ?? null);
  if (boatBay && from?.boat) {
    const bm = boatModel(boatBay.model);
    g.boat.fuel = Math.min(bm.tank, from.boat.fuel);
    g.boat.drums = Math.min(bm.drums, from.boat.drums);
  }
}

export function buyShip(g: ShipyardWorld, id: string): Result {
  const m = SHIP_MODELS.find((x) => x.id === id);
  if (!m) return { ok: false, reason: 'Questa nave non esiste.' };
  if (!m.ready) return { ok: false, reason: 'In cantiere: arriverà presto.' };
  const ready = yardReady(g);
  if (!ready.ok) return ready;
  if (ownsShip(g, id)) return { ok: false, reason: 'Questa nave è già tua.' };
  const cost = shipCost(g, id);
  if (g.gear.teeth < cost) return { ok: false, reason: `Servono ${cost} denti (ne hai ${g.gear.teeth}).` };
  g.gear.teeth -= cost;
  g.fleet.push(moor(g)); // the old one stays yours, moored here
  bringIn(g, m, null); // the new one: full tank, new vehicles
  return { ok: true };
}

/** "Usa questa nave": a ship you own comes to the pier, the one in use is moored. */
export function switchShip(g: ShipyardWorld, id: string): Result {
  const i = g.fleet.findIndex((x) => x.model === id);
  const m = SHIP_MODELS.find((x) => x.id === id);
  if (i < 0 || !m) return { ok: false, reason: 'Questa nave non è tua.' };
  const ready = yardReady(g);
  if (!ready.ok) return ready;
  const [chosen] = g.fleet.splice(i, 1);
  g.fleet.push(moor(g));
  bringIn(g, m, chosen!);
  return { ok: true };
}

/** Sells a ship you own and do not use, for half its price (never Aurelio's gift). */
export function sellShip(g: ShipyardWorld, id: string): Result & { teeth?: number } {
  if (g.port?.id !== PORTO_FANGO.id)
    return { ok: false, reason: 'Le navi si vendono al cantiere di Porto Fango.' };
  if (id === KEEP_FOREVER) return { ok: false, reason: 'L’Aurelia è il regalo del nonno: non si vende.' };
  if (g.ship.model === id) return { ok: false, reason: 'È la nave in uso: prima passa a un’altra.' };
  const i = g.fleet.findIndex((x) => x.model === id);
  if (i < 0) return { ok: false, reason: 'Questa nave non è tua.' };
  g.fleet.splice(i, 1);
  const teeth = sellPrice(id);
  g.gear.teeth += teeth;
  return { ok: true, teeth };
}

/** Moored ships as saved, checked: only real models, none twice, not the one in use. */
export function checkedFleet(raw: unknown, inUse: string | null): MooredShip[] {
  if (!Array.isArray(raw)) return [];
  const out: MooredShip[] = [];
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue;
    const o = r as Record<string, unknown>;
    const model = String(o.model);
    if (!SHIP_MODELS.some((m) => m.id === model) || model === inUse || out.some((x) => x.model === model))
      continue;
    const sub = o.sub as Record<string, unknown> | undefined;
    const boat = o.boat as Record<string, unknown> | undefined;
    out.push({
      model,
      fuel: Math.min(shipModel({ model }).tank, num(o.fuel)),
      ...(sub && typeof sub === 'object' ? { sub: { hull: num(sub.hull), fuel: num(sub.fuel) } } : {}),
      ...(boat && typeof boat === 'object' ? { boat: { fuel: num(boat.fuel), drums: num(boat.drums) } } : {}),
    });
  }
  return out;
}
