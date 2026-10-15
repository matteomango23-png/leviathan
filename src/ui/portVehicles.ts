// Port tab "Mezzi" (owner, 16 ottobre 2026: "una tab per solamente le navi e i mezzi"): fuel for each vehicle and
// all at once, the hull of each mended here, the spare parts and the shipyard at Porto Fango.
import { PORTO_FANGO } from '../data/economy';
import { FUEL } from '../data/ship';
import { repairQuote, repairVehicle, type Vehicle } from '../systems/economy/repair';
import { buyFuel, buyFuelAll, canRefuel, fillAllQuote, fuelLevel, type FuelTarget } from '../systems/fuel';
import { boatName } from '../systems/ship/boatBay';
import { loadParts, partsOffer, type PartsCarrier } from '../systems/ship/spareParts';
import { el } from './dom';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';
import { renderShipyard } from './shipyardPanel';

export function renderVehicles(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  const any = g.ship.owned || g.sub.owned || g.boat.owned;
  if (!any)
    el('p', 'port-hint', b, 'Non hai ancora mezzi: la prima nave si compra al cantiere di Porto Fango.');
  else {
    renderFuel(b, ctx);
    renderRepairs(b, ctx);
  }
  if (g.port?.id === PORTO_FANGO.id) {
    if (g.ship.owned) renderParts(b, ctx);
    el('h3', '', b, 'Cantiere');
    renderShipyard(b, ctx);
  }
}

const names = (ctx: TabContext): Record<Vehicle, string> => ({
  ship: 'La nave',
  sub: 'Il sottomarino',
  boat: boatName(ctx.g.ship),
});

function renderFuel(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  el('h3', '', b, 'Carburante');
  const grid = el('div', 'pcard-grid', b);
  const all = fillAllQuote(g);
  portCard(grid, {
    icon: 'bolt',
    title: 'Fai il pieno a tutti',
    text:
      all.litres > 0
        ? `${Math.round(all.litres)} L per i mezzi che sono qui.`
        : 'I mezzi che sono qui hanno il pieno.',
    price: all.litres > 0 ? all.cost : undefined,
    state: all.litres > 0 ? 'active' : '',
    button: {
      label: 'Pieno',
      disabled: all.litres <= 0,
      onClick: () => {
        const r = buyFuelAll(g);
        ctx.say(r.ok ? `${Math.round(r.litres)} L per ${r.cost} denti.` : (r.reason ?? ''), !r.ok);
        ctx.redraw();
      },
    },
  });
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
  const n = names(ctx);
  const pump = 'Il benzinaio del porto riempie il serbatoio.';
  if (g.ship.owned) card('ship', n.ship, pump);
  if (g.sub.owned) card('sub', n.sub, pump);
  if (g.boat.owned) {
    card('boat', n.boat, pump);
    card(
      'drums',
      `${n.boat}: fusti`,
      'Carburante per la nave: lo travasi quando il mezzo rientra nella stiva.',
    );
  }
}

function renderRepairs(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  el('h3', '', b, 'Riparazioni');
  const grid = el('div', 'pcard-grid', b);
  const n = names(ctx);
  for (const which of ['ship', 'boat', 'sub'] as Vehicle[]) {
    const q = repairQuote(g, which);
    if (!q.owned) continue;
    portCard(grid, {
      icon: 'bolt',
      title: `${n[which]}: scafo ${Math.round(q.hull)} / ${q.max}`,
      text: !q.here
        ? `${n[which]} non è qui al porto.`
        : q.points > 0
          ? 'I meccanici del porto lo rimettono a nuovo.'
          : 'Intero.',
      price: q.here && q.points > 0 ? q.cost : undefined,
      state: !q.here ? 'locked' : q.points > 0 ? '' : 'owned',
      button: {
        label: 'Ripara',
        disabled: !q.here || q.points <= 0 || g.gear.teeth < q.cost,
        onClick: () => {
          const r = repairVehicle(g, which, g.story.pending);
          ctx.say(r.ok ? `${n[which]} riparato per ${r.cost} denti.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  }
}

/** Spare parts for the speedboat or the submarine to carry to a ship broken down at sea (block 5c). */
function renderParts(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  const n = names(ctx);
  const carriers = (['boat', 'sub'] as PartsCarrier[]).filter((w) => g[w].owned);
  if (!carriers.length) return;
  el('h3', '', b, 'Ricambi per la nave');
  const grid = el('div', 'pcard-grid', b);
  for (const which of carriers) {
    const o = partsOffer(g, which);
    portCard(grid, {
      icon: 'bolt',
      title: `${n[which]}: ricambi ${Math.round(g[which].parts)}`,
      text: o.here
        ? 'Riparano lo scafo della nave quando il mezzo rientra nella sua stiva: per una nave rotta in mare.'
        : `${n[which]} non è qui al porto.`,
      price: o.here && o.points > 0 ? o.cost : undefined,
      state: o.here ? '' : 'locked',
      button: {
        label: 'Carica ricambi',
        disabled: !o.here || o.points <= 0,
        onClick: () => {
          const r = loadParts(g, which);
          ctx.say(
            r.ok
              ? `Ricambi caricati: ${Math.round(r.points ?? 0)} punti per ${r.cost} denti.`
              : (r.reason ?? ''),
            !r.ok,
          );
          ctx.redraw();
        },
      },
    });
  }
}
