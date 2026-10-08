// The shipyard of Porto Fango (owner, 8 ottobre 2026, block 4): a card for each ship of the fleet with its
// painting, the cards of the vehicles in its hatches and its numbers; buy it (your ship is traded in) or see it is
// still being built. Logic in systems/ship/shipyard.ts, numbers in data/fleet.ts.
import { SHIP_MODELS, type ShipModelDef } from '../data/fleet';
import { assetUrl } from '../data/assets';
import { ART_KEYS } from '../data/sprites.generated';
import { autonomyKm } from '../systems/fuelBurn';
import { buyShip, shipCost, tradeIn } from '../systems/ship/shipyard';
import { subModel } from '../systems/submarine';
import { el } from './dom';
import { icon } from './icons';
import type { TabContext } from './portTabs';
import './shipyard.css';

const picture = (parent: HTMLElement, card: string, cls: string): void => {
  if (!ART_KEYS.includes(card)) return;
  const img = el('img', cls, parent);
  img.src = assetUrl(`art/${card}.webp`);
  img.alt = '';
};

/** The numbers of a ship, as rows of the card. */
function stats(m: ShipModelDef): [string, string][] {
  const rows: [string, string][] = [
    ['Lunghezza', `${Math.round(m.lengthM * 0.95)} m`], // the hull, a little shorter than the picture
    ['Velocità', `${m.knots} nodi`],
    ['Serbatoio', `${m.tank} L · ${Math.round(autonomyKm(m.tank, m.perKm))} km a tutto gas`],
    ['Sonar', `${m.sonar.name} · sente fino a ${m.sonar.maxKnots} nodi`],
    ['Vasca', m.pool ? `${m.pool} posti per la squadra` : 'nessuna'],
  ];
  for (const b of m.bays) {
    const sub = b.kind === 'sub' ? subModel(b.model) : null;
    const more = sub && sub.id === b.model ? ` · ${sub.maxDepthM} m${sub.sonar ? ', sonar' : ''}` : '';
    rows.push(['A bordo', `${b.name}${more}`]);
  }
  if (m.special) rows.push(['Speciale', m.special]);
  return rows;
}

export function renderShipyard(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  el('h3', '', b, 'Cantiere navale');
  el(
    'p',
    'port-hint',
    b,
    g.ship.owned
      ? `Una nave alla volta: la tua vale ${tradeIn(g.ship)} denti di permuta. Il carburante passa nella nuova.`
      : 'La tua prima nave te la dà Aurelio.',
  );
  const grid = el('div', 'yard-grid', b);
  for (const m of SHIP_MODELS) {
    const mine = g.ship.owned && g.ship.model === m.id;
    const card = el('div', `yard-card${mine ? ' mine' : ''}${m.ready ? '' : ' building'}`, grid);
    const pics = el('div', 'yard-pics', card);
    picture(pics, m.card, 'yard-ship');
    const crew = el('div', 'yard-bays', pics);
    for (const bay of m.bays) picture(crew, bay.card, 'yard-bay');
    const body = el('div', 'yard-body', card);
    const top = el('div', 'yard-top', body);
    el('span', 'yard-name', top, m.name);
    if (mine) el('span', 'pcard-badge', top, 'la tua');
    else if (!m.ready) el('span', 'pcard-badge', top, 'in cantiere');
    el('div', 'yard-note', body, m.note);
    const list = el('div', 'yard-stats', body);
    for (const [k, v] of stats(m)) {
      const r = el('div', 'yard-row', list);
      el('span', 'yard-k', r, k);
      el('span', 'yard-v', r, v);
    }
    const foot = el('div', 'yard-foot', body);
    if (!mine && g.ship.owned) {
      const cost = shipCost(g, m.id);
      const p = el('span', 'price', foot);
      p.append(icon('tooth'), document.createTextNode(cost < 0 ? ` +${-cost}` : ` ${cost}`)); // + : the yard pays you
      if (cost < m.price) el('span', 'yard-was', foot, `(${m.price})`);
    }
    const btn = el('button', 'pbtn', foot, mine ? 'La tua' : m.ready ? 'Compra' : 'In cantiere');
    btn.disabled = mine || !m.ready || !g.ship.owned || g.gear.teeth < shipCost(g, m.id);
    btn.addEventListener('click', () => {
      const r = buyShip(g, m.id);
      ctx.say(r.ok ? `${m.name}: è la tua nave. Ti aspetta al molo.` : (r.reason ?? ''), !r.ok);
      ctx.redraw();
    });
  }
}
