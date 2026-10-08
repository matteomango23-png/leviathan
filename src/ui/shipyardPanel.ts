// The shipyard of Porto Fango (owner, 8 ottobre 2026, block 4): a big card for each ship, framed in the colour of
// how premium it is (like the rarity of the beasts); tap one for its page (ui/shipPage.ts). Logic in
// systems/ship/shipyard.ts, numbers in data/fleet.ts.
import { RARITY } from '../data/cards';
import { assetUrl } from '../data/assets';
import { SHIP_MODELS } from '../data/fleet';
import { ART_KEYS } from '../data/sprites.generated';
import { shipCost, tradeIn } from '../systems/ship/shipyard';
import { el } from './dom';
import { icon } from './icons';
import type { TabContext } from './portTabs';
import { openShipPage } from './shipPage';
import './shipyard.css';

export function renderShipyard(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  el('h3', '', b, 'Cantiere navale');
  el(
    'p',
    'port-hint',
    b,
    g.ship.owned
      ? `Una nave alla volta: la tua vale ${tradeIn(g.ship)} denti di permuta, e il carburante passa nella nuova. Tocca una nave per vederla.`
      : 'La tua prima nave te la dà Aurelio.',
  );
  const grid = el('div', 'yard-grid', b);
  for (const m of SHIP_MODELS) {
    const mine = g.ship.owned && g.ship.model === m.id;
    const card = el('button', `yard-card${mine ? ' mine' : ''}${m.ready ? '' : ' building'}`, grid);
    card.style.setProperty('--rarity', RARITY[m.tier].color);
    if (ART_KEYS.includes(m.card)) {
      const img = el('img', 'yard-ship', card);
      img.src = assetUrl(`art/${m.card}.webp`);
      img.alt = '';
    }
    const label = el('div', 'yard-label', card);
    el('span', 'yard-name', label, m.name);
    const sub = el('span', 'yard-sub', label);
    if (mine) sub.textContent = 'la tua';
    else if (!m.ready) sub.textContent = 'in cantiere';
    else if (g.ship.owned) {
      const cost = shipCost(g, m.id);
      sub.append(icon('tooth'), document.createTextNode(cost < 0 ? ` +${-cost}` : ` ${cost}`));
    }
    card.addEventListener('click', () => openShipPage(document.body, g, m, ctx.say, ctx.redraw));
  }
}
