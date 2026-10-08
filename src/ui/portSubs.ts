// Port tab "Mute": the submarines (tappa 16) under the suits. Buy a better one, or take out one you own; fill
// the ship and the submarine with fuel (4 ottobre 2026).
import { FUEL, SHIP_UPGRADES } from '../data/ship';
import { SUB_MODELS } from '../data/submarine';
import { buyFuel, canRefuel } from '../systems/fuel';
import { buyShipUpgrade, shipTank } from '../systems/ship/ship';
import { buySub, subModel } from '../systems/submarine';
import { el } from './dom';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';

/** Fuel: fill the ship (alongside the pier) and the submarine (in its hold, or moored by the pier). */
export function renderFuel(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.ship.owned && !g.sub.owned) return;
  el('h3', '', b, 'Carburante');
  const grid = el('div', 'pcard-grid', b);
  const card = (which: 'ship' | 'sub', name: string, now: number, tank: number): void => {
    const here = canRefuel(g, which);
    const missing = Math.max(0, tank - now);
    portCard(grid, {
      icon: 'bolt',
      title: `${name}: ${Math.round(now)} / ${tank} L`,
      text: here ? 'Il benzinaio del porto riempie il serbatoio.' : `${name} non è qui al porto.`,
      price: here && missing > 0 ? Math.ceil(missing * FUEL.pricePerLitre) : undefined,
      state: here ? '' : 'locked',
      button: {
        label: 'Riempi',
        disabled: !here || missing <= 0,
        onClick: () => {
          const r = buyFuel(g, which);
          ctx.say(r.ok ? `${Math.round(r.litres)} L per ${r.cost} denti.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  };
  if (g.ship.owned) card('ship', 'La nave', g.ship.fuel, shipTank(g.ship));
  if (g.sub.owned) card('sub', 'Il sottomarino', g.sub.fuel, subModel(g.sub.model).tank);
}

export function renderSubs(b: HTMLElement, ctx: TabContext): void {
  const s = ctx.g.sub;
  el('h3', '', b, 'Sottomarini');
  if (!s.owned) {
    el('p', 'port-hint', b, 'Il primo sottomarino te lo darà Aurelio a Porto Fango, insieme alla nave.');
    return;
  }
  const grid = el('div', 'pcard-grid', b);
  for (const m of SUB_MODELS) {
    const own = s.models.includes(m.id);
    const used = s.model === m.id;
    const hull = used ? ` Scafo ${Math.round(s.hull)}/${m.hull}.` : '';
    portCard(grid, {
      icon: 'suit',
      title: m.name,
      badge: used ? 'in uso' : own ? 'tuo' : undefined,
      text: `${m.note}. Fino a ${m.maxDepthM} m, velocità ${Math.round((m.speed / 42) * 10) / 10}× il nuoto, scafo ${m.hull}.${hull}`,
      price: own ? undefined : m.price,
      state: used ? 'active' : own ? 'owned' : '',
      button: {
        label: used ? 'In uso' : own ? 'Usa' : 'Compra',
        disabled: used || (!own && ctx.g.gear.teeth < m.price),
        onClick: () => {
          const r = buySub(ctx.g, m.id);
          ctx.say(r.ok ? `${subModel(m.id).name}: è il tuo sottomarino.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  }
}

/** Parts for the ship (4 ottobre 2026): a bigger tank, a deeper sonar, stronger engines. */
export function renderShipParts(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.ship.owned) return;
  el('h3', '', b, 'La nave');
  const grid = el('div', 'pcard-grid', b);
  for (const u of SHIP_UPGRADES) {
    const own = g.ship.upgrades.includes(u.id);
    portCard(grid, {
      icon: 'bolt',
      title: u.name,
      badge: own ? 'montato' : undefined,
      text: u.text,
      price: own ? undefined : u.price,
      state: own ? 'owned' : '',
      button: {
        label: own ? 'Montato' : 'Compra',
        disabled: own || g.gear.teeth < u.price,
        onClick: () => {
          const r = buyShipUpgrade(g, u.id);
          ctx.say(r.ok ? `${u.name} montato sulla nave.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  }
}
