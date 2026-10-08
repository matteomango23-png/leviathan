// The shipyard of Porto Fango (owner, 8 ottobre 2026, block 4): a new ship comes with its own vehicles; the old one
// is taken back for a share of its price, its fuel poured into the new tank. One ship at a time.
import { PORTO_FANGO } from '../../data/economy';
import { SHIP_MODELS, TRADE_IN_SHARE } from '../../data/fleet';
import { SUBMARINE } from '../../data/submarine';
import { subModel, type SubState } from '../submarine';
import { shipModel, shipTank } from './model';
import type { ShipState } from './ship';

export interface ShipyardWorld {
  ship: ShipState;
  sub: SubState;
  gear: { teeth: number };
  port: { id: string } | null;
}

/** What your ship is worth to the yard. */
export const tradeIn = (s: ShipState): number =>
  s.owned ? Math.round(shipModel(s).price * TRADE_IN_SHARE) : 0;

/** The teeth to pay for this model now: its price less your ship's trade-in (below zero, the yard pays you). */
export function shipCost(g: ShipyardWorld, id: string): number {
  const m = SHIP_MODELS.find((x) => x.id === id);
  return m ? m.price - tradeIn(g.ship) : Infinity;
}

export function buyShip(g: ShipyardWorld, id: string): { ok: boolean; reason?: string } {
  const m = SHIP_MODELS.find((x) => x.id === id);
  if (!m) return { ok: false, reason: 'Questa nave non esiste.' };
  if (!m.ready) return { ok: false, reason: 'In cantiere: arriverà presto.' };
  if (g.port?.id !== PORTO_FANGO.id)
    return { ok: false, reason: 'Le navi si comprano al cantiere di Porto Fango.' };
  if (!g.ship.owned) return { ok: false, reason: 'Prima Aurelio ti deve dare la tua prima nave.' };
  if (g.ship.model === id) return { ok: false, reason: 'È già la tua nave.' };
  if (g.sub.aboard) return { ok: false, reason: 'Esci dal sottomarino, prima.' };
  const cost = shipCost(g, id);
  if (g.gear.teeth < cost) return { ok: false, reason: `Servono ${cost} denti (ne hai ${g.gear.teeth}).` };
  g.gear.teeth -= cost;
  const s = g.ship;
  const fuel = s.fuel;
  // the new ship at the pier, still, hatch closed; your fuel goes into its tank
  Object.assign(s, {
    model: id,
    x: PORTO_FANGO.shipDock,
    speed: 0,
    hatch: 0,
    hatchOpen: false,
    dockFrom: null,
    engineOn: false,
    broken: [],
  });
  s.fuel = Math.min(shipTank(s), fuel);
  // its submarine, new from the yard, in the hold
  const bay = m.bays.find((b) => b.kind === 'sub');
  if (bay) {
    const sm = subModel(bay.model);
    Object.assign(g.sub, {
      owned: true,
      model: sm.id,
      models: [sm.id],
      hull: sm.hull,
      fuel: sm.tank,
      x: PORTO_FANGO.shipDock,
      y: SUBMARINE.restY,
      vx: 0,
      vy: 0,
    });
    s.bay = 'docked';
    s.bayT = 0;
  } else s.bay = 'none';
  return { ok: true };
}
