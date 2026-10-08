// A ship's page in the shipyard (owner, 8 ottobre 2026): a gallery to swipe through (the ship, then each vehicle in
// its hatches) with dots under it, and all its numbers and those of its vehicles; buy it from here.
import { RARITY } from '../data/cards';
import { assetUrl } from '../data/assets';
import type { ShipModelDef } from '../data/fleet';
import { ART_KEYS } from '../data/sprites.generated';
import { autonomyKm } from '../systems/fuelBurn';
import type { GameState } from '../systems/game';
import { buyShip, shipCost } from '../systems/ship/shipyard';
import { subModel } from '../systems/submarine';
import { el } from './dom';
import { ICONS, icon } from './icons';

/** The pictures of the gallery: the ship first, then its vehicles. */
function slides(m: ShipModelDef): { card: string; title: string }[] {
  return [{ card: m.card, title: m.name }, ...m.bays.map((b) => ({ card: b.card, title: b.name }))].filter(
    (s) => ART_KEYS.includes(s.card),
  );
}

/** Every number of the ship, then those of what it carries. */
function rows(m: ShipModelDef): [string, string][] {
  const out: [string, string][] = [
    ['Rarità', RARITY[m.tier].name],
    ['Lunghezza', `${Math.round(m.lengthM * 0.95)} m`],
    ['Velocità', `${m.knots} nodi`],
    ['Serbatoio', `${m.tank} L`],
    ['Consumo', `${m.perKm} L/km a tutto gas`],
    ['Autonomia', `${Math.round(autonomyKm(m.tank, m.perKm))} km a tutto gas`],
    ['Sonar', `${m.sonar.name}, sente fino a ${m.sonar.maxKnots} nodi`],
    ['Vasca', m.pool ? `${m.pool} posti per la squadra` : 'nessuna'],
  ];
  if (m.special) out.push(['Speciale', m.special]);
  for (const b of m.bays) {
    const s = b.kind === 'sub' ? subModel(b.model) : null;
    if (!s || s.id !== b.model) {
      out.push([b.name, 'arriverà con le prossime versioni']); // not in the game yet
      continue;
    }
    out.push([
      b.name,
      `${s.lengthM} m · fino a ${s.maxDepthM} m · scafo ${s.hull} · ${s.tank} L · ${s.sonar ? 'con sonar' : 'senza sonar'}`,
    ]);
  }
  return out;
}

/** Opens the page; `changed` runs after a purchase (the shipyard redraws). */
export function openShipPage(
  parent: HTMLElement,
  g: GameState,
  m: ShipModelDef,
  say: (text: string, error?: boolean) => void,
  changed: () => void,
): void {
  const root = el('div', 'ship-page', parent);
  root.style.setProperty('--rarity', RARITY[m.tier].color);
  const card = el('div', 'ship-page-card', root);
  const close = el('button', 'sheet-close', card);
  close.innerHTML = ICONS.close;
  close.addEventListener('click', () => root.remove());

  // the gallery: swipe (or the arrows) between the pictures, dots under them
  const gallery = el('div', 'ship-gallery', card);
  const list = slides(m);
  const view = el('div', 'ship-gallery-view', gallery);
  const img = el('img', 'ship-gallery-img', view);
  img.alt = '';
  const caption = el('div', 'ship-gallery-caption', gallery);
  const dots = el('div', 'ship-gallery-dots', gallery);
  let at = 0;
  const show = (i: number): void => {
    at = (i + list.length) % list.length;
    const s = list[at];
    if (!s) return;
    img.src = assetUrl(`art/${s.card}.webp`);
    caption.textContent = s.title;
    for (const [k, d] of [...dots.children].entries()) d.classList.toggle('on', k === at);
  };
  list.forEach((_, i) => el('button', 'ship-dot', dots).addEventListener('click', () => show(i)));
  if (list.length > 1) {
    el('button', 'ship-arrow left', view, '‹').addEventListener('click', () => show(at - 1));
    el('button', 'ship-arrow right', view, '›').addEventListener('click', () => show(at + 1));
  }
  let downX: number | null = null;
  view.addEventListener('pointerdown', (e) => (downX = e.clientX));
  view.addEventListener('pointerup', (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) > 30) show(at + (dx < 0 ? 1 : -1));
  });
  show(0);

  // the numbers
  const info = el('div', 'ship-info', card);
  const head = el('div', 'ship-info-head', info);
  el('h2', 'ship-info-name', head, m.name);
  const mine = g.ship.owned && g.ship.model === m.id;
  if (mine) el('span', 'pcard-badge', head, 'la tua');
  else if (!m.ready) el('span', 'pcard-badge', head, 'in cantiere');
  el('p', 'ship-info-note', info, m.note);
  const table = el('div', 'ship-info-rows', info);
  for (const [k, v] of rows(m)) {
    const r = el('div', 'yard-row', table);
    el('span', 'yard-k', r, k);
    el('span', 'yard-v', r, v);
  }
  const foot = el('div', 'yard-foot', info);
  if (!mine && g.ship.owned) {
    const cost = shipCost(g, m.id);
    const p = el('span', 'price', foot);
    p.append(icon('tooth'), document.createTextNode(cost < 0 ? ` +${-cost}` : ` ${cost}`));
  }
  const buy = el('button', 'pbtn primary', foot, mine ? 'La tua' : m.ready ? 'Compra' : 'In cantiere');
  buy.disabled = mine || !m.ready || !g.ship.owned || g.gear.teeth < shipCost(g, m.id);
  buy.addEventListener('click', () => {
    const r = buyShip(g, m.id);
    say(r.ok ? `${m.name}: è la tua nave. Ti aspetta al molo.` : (r.reason ?? ''), !r.ok);
    if (r.ok) root.remove();
    changed();
  });
}
