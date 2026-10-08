// A ship's page in the shipyard (owner, 8 ottobre 2026): a gallery to swipe through (the ship, then each vehicle in
// its hatches) with dots under it, and all its numbers and those of its vehicles; buy it from here.
import { RARITY } from '../data/cards';
import { assetUrl } from '../data/assets';
import type { ShipModelDef } from '../data/fleet';
import { ART_KEYS } from '../data/sprites.generated';
import type { GameState } from '../systems/game';
import { buyShip, ownsShip, sellPrice, sellShip, shipCost, switchShip } from '../systems/ship/shipyard';
import { shipModel } from '../systems/ship/model';
import { renderShipStats } from './shipStats';
import { el } from './dom';
import { ICONS, icon } from './icons';

/** The pictures of the gallery: the ship first, then its vehicles. */
function slides(m: ShipModelDef): { card: string; title: string }[] {
  return [{ card: m.card, title: m.name }, ...m.bays.map((b) => ({ card: b.card, title: b.name }))].filter(
    (s) => ART_KEYS.includes(s.card),
  );
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
  const inUse = g.ship.owned && g.ship.model === m.id;
  const owned = ownsShip(g, m.id);
  el(
    'span',
    'pcard-badge',
    head,
    `${RARITY[m.tier].name}${inUse ? ' · in uso' : owned ? ' · posseduta' : !m.ready ? ' · in cantiere' : ''}`,
  );
  el('p', 'ship-info-note', info, m.special ? `${m.note}. ${m.special}.` : m.note);
  const table = el('div', 'ship-info-rows', info);
  renderShipStats(table, m, g.ship.owned ? shipModel(g.ship) : null);

  const foot = el('div', 'yard-foot', info);
  const act = (
    label: string,
    primary: boolean,
    disabled: boolean,
    run: () => { ok: boolean; reason?: string },
    done: string,
  ): void => {
    const btn = el('button', `pbtn${primary ? ' primary' : ''}`, foot, label);
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      const r = run();
      say(r.ok ? done : (r.reason ?? ''), !r.ok);
      if (r.ok) root.remove();
      changed();
    });
  };
  if (inUse) el('button', 'pbtn primary', foot, 'In uso').toggleAttribute('disabled', true);
  else if (owned) {
    act(
      'Usa questa nave',
      true,
      false,
      () => switchShip(g, m.id),
      `${m.name}: ti aspetta al molo, con i suoi mezzi.`,
    );
    const price = sellPrice(m.id);
    if (price > 0)
      act(`Vendi (+${price})`, false, false, () => sellShip(g, m.id), `${m.name} venduta: +${price} denti.`);
  } else {
    const cost = shipCost(g, m.id);
    if (m.ready && g.ship.owned)
      el('span', 'price', foot).append(icon('tooth'), document.createTextNode(` ${cost}`));
    act(
      m.ready ? 'Compra' : 'In cantiere',
      true,
      !m.ready || !g.ship.owned || g.gear.teeth < cost,
      () => buyShip(g, m.id),
      `${m.name}: è tua, col pieno. Ti aspetta al molo; la vecchia resta ormeggiata qui.`,
    );
  }
}
