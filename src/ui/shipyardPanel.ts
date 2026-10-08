// The shipyard of Porto Fango (owner, 8 ottobre 2026, block 4): tabs by kind of ship ("Possedute" first), a big
// card for each ship framed in the colour of how premium it is, with its key numbers and whether it is yours (in
// use, or owned and moored); tap one for its page (ui/shipPage.ts). Logic in systems/ship/shipyard.ts, numbers in
// data/fleet.ts.
import { RARITY } from '../data/cards';
import { assetUrl } from '../data/assets';
import { SHIP_CATEGORIES, SHIP_MODELS, type ShipCategory, type ShipModelDef } from '../data/fleet';
import { ART_KEYS } from '../data/sprites.generated';
import { autonomyKm } from '../systems/fuelBurn';
import { ownsShip, shipCost } from '../systems/ship/shipyard';
import { sonarMetres } from '../systems/ship/stats';
import { el } from './dom';
import { icon } from './icons';
import type { TabContext } from './portTabs';
import { openShipPage } from './shipPage';
import './shipyard.css';

/** The open tab (kept while the port is open and between visits). */
let tab: 'owned' | ShipCategory = 'owned';

export function renderShipyard(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  el('h3', '', b, 'Cantiere navale');
  el(
    'p',
    'port-hint',
    b,
    g.ship.owned
      ? 'Puoi avere più navi: quelle che non usi restano ormeggiate qui, ognuna col suo carburante e i suoi mezzi. Tocca una nave per vederla, usarla o venderla.'
      : 'La tua prima nave te la dà Aurelio.',
  );
  const tabs = el('div', 'yard-tabs', b);
  const all: { id: typeof tab; name: string }[] = [{ id: 'owned', name: 'Possedute' }, ...SHIP_CATEGORIES];
  for (const t of all) {
    const btn = el('button', `yard-tab${t.id === tab ? ' on' : ''}`, tabs, t.name);
    btn.addEventListener('click', () => {
      tab = t.id;
      ctx.redraw();
    });
  }
  const shown = SHIP_MODELS.filter((m) => (tab === 'owned' ? ownsShip(g, m.id) : m.category === tab));
  const grid = el('div', 'yard-grid', b);
  for (const m of shown) card(grid, m, ctx);
}

function card(grid: HTMLElement, m: ShipModelDef, ctx: TabContext): void {
  const g = ctx.g;
  const inUse = g.ship.owned && g.ship.model === m.id;
  const owned = ownsShip(g, m.id);
  const c = el('button', `yard-card${inUse ? ' mine' : ''}${m.ready ? '' : ' building'}`, grid);
  c.style.setProperty('--rarity', RARITY[m.tier].color);
  if (ART_KEYS.includes(m.card)) {
    const img = el('img', 'yard-ship', c);
    img.src = assetUrl(`art/${m.card}.webp`);
    img.alt = '';
  }
  const label = el('div', 'yard-label', c);
  el('span', 'yard-name', label, m.name);
  // the key numbers, to compare at a glance
  el(
    'span',
    'yard-keys',
    label,
    `${m.knots} nodi · ${Math.round(autonomyKm(m.tank, m.perKm))} km · sonar ${sonarMetres(m).big} m`,
  );
  const sub = el('span', 'yard-sub', label);
  if (inUse) sub.textContent = 'in uso';
  else if (owned) sub.textContent = 'posseduta';
  else if (!m.ready) sub.textContent = 'in cantiere';
  else if (g.ship.owned) sub.append(icon('tooth'), document.createTextNode(` ${shipCost(g, m.id)}`));
  c.addEventListener('click', () => openShipPage(document.body, g, m, ctx.say, ctx.redraw));
}
