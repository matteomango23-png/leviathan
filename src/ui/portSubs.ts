// Port tab "Mute": the submarines (tappa 16) under the suits. Buy a better one, or take out one you own; fill
// the ship and the submarine with fuel (4 ottobre 2026).
import { FUEL } from '../data/ship';
import { buyFuel, canRefuel, fuelLevel, type FuelTarget } from '../systems/fuel';
import { boatName } from '../systems/ship/boatBay';
import { PORTO_FANGO } from '../data/economy';
import { hullMax } from '../systems/ship/shipHull';
import {
  loadParts,
  partsOffer,
  repairAtYard,
  yardRepair,
  type PartsCarrier,
} from '../systems/ship/spareParts';
import { el } from './dom';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';

/** Fuel: fill the ship (alongside the pier), the submarine (in its hold, or moored by the pier), the speedboat and
 *  its drums (block 4b: poured into the ship when it docks). */
export function renderFuel(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.ship.owned && !g.sub.owned) return;
  el('h3', '', b, 'Carburante');
  const grid = el('div', 'pcard-grid', b);
  const card = (which: FuelTarget, name: string, text: string): void => {
    const here = canRefuel(g, which);
    const [now, tank] = fuelLevel(g, which);
    const missing = Math.max(0, tank - now);
    portCard(grid, {
      icon: 'bolt',
      title: `${name}: ${Math.round(now)} / ${tank} L`,
      text: here ? text : `${name} non è qui al porto.`,
      price: here && missing > 0 ? Math.ceil(missing * FUEL.pricePerLitre) : undefined,
      state: here ? '' : 'locked',
      button: {
        label: which === 'drums' ? 'Carica i fusti' : 'Riempi',
        disabled: !here || missing <= 0,
        onClick: () => {
          const r = buyFuel(g, which);
          ctx.say(r.ok ? `${Math.round(r.litres)} L per ${r.cost} denti.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  };
  const pump = 'Il benzinaio del porto riempie il serbatoio.';
  if (g.ship.owned) card('ship', 'La nave', pump);
  if (g.sub.owned) card('sub', 'Il sottomarino', pump);
  if (g.boat.owned) {
    const name = boatName(g.ship);
    card('boat', name, pump);
    card(
      'drums',
      `${name}: fusti`,
      'Carburante per la nave: lo travasi quando il mezzo rientra nella stiva.',
    );
  }
}

/** Porto Fango, the ships' harbour (block 5c): the ship mended at the yard, and spare parts for the speedboat or the
 *  submarine to carry back to a ship broken down at sea. */
export function renderShipRepair(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.ship.owned || g.port?.id !== PORTO_FANGO.id) return;
  el('h3', '', b, 'Cantiere: scafo della nave');
  const grid = el('div', 'pcard-grid', b);
  const done = (r: { ok: boolean; reason?: string; points?: number; cost?: number }, what: string): void => {
    ctx.say(
      r.ok ? `${what}: ${Math.round(r.points ?? 0)} punti per ${r.cost} denti.` : (r.reason ?? ''),
      !r.ok,
    );
    ctx.redraw();
  };
  const y = yardRepair(g);
  portCard(grid, {
    icon: 'bolt',
    title: `La nave: scafo ${Math.round(g.ship.hull)} / ${hullMax(g.ship)}`,
    text: y.here
      ? 'Il cantiere ripara lo scafo.'
      : 'La nave non è ormeggiata qui: portale i ricambi col motoscafo o col sottomarino.',
    price: y.here && y.points > 0 ? y.cost : undefined,
    state: y.here ? '' : 'locked',
    button: {
      label: 'Ripara',
      disabled: !y.here || y.points <= 0,
      onClick: () => done(repairAtYard(g, g.story.pending), 'Nave riparata'),
    },
  });
  const parts = (which: PartsCarrier, name: string, now: number): void => {
    const o = partsOffer(g, which);
    portCard(grid, {
      icon: 'bolt',
      title: `${name}: ricambi ${Math.round(now)}`,
      text: o.here
        ? 'Ricambi per la nave: riparano lo scafo quando il mezzo rientra nella stiva.'
        : `${name} non è qui al porto.`,
      price: o.here && o.points > 0 ? o.cost : undefined,
      state: o.here ? '' : 'locked',
      button: {
        label: 'Carica ricambi',
        disabled: !o.here || o.points <= 0,
        onClick: () => done(loadParts(g, which), 'Ricambi caricati'),
      },
    });
  };
  if (g.boat.owned) parts('boat', boatName(g.ship), g.boat.parts);
  if (g.sub.owned) parts('sub', 'Il sottomarino', g.sub.parts);
}
