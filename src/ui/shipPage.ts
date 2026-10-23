// A ship's page in the shipyard (owner, 8 ottobre 2026): a gallery to swipe through (the ship, then each vehicle in
// its hatches) with dots under it and tabs over the numbers; each picture shows only its own numbers, compared with
// the ship in use or its vehicle of the same kind (owner, 23 ottobre: systems/ship/pageTabs.ts); buy it from here.
import { RARITY } from '../data/cards';
import { assetUrl } from '../data/assets';
import type { ShipModelDef } from '../data/fleet';
import { ART_KEYS } from '../data/sprites.generated';
import type { GameState } from '../systems/game';
import { buyShip, ownsShip, sellPrice, sellShip, shipCost, switchShip } from '../systems/ship/shipyard';
import { shipModel } from '../systems/ship/model';
import { pageTabs } from '../systems/ship/pageTabs';
import { renderShipStats } from './shipStats';
import { el } from './dom';
import { ICONS, icon } from './icons';

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
  const list = pageTabs(m, g.ship.owned ? shipModel(g.ship) : null);
  const view = el('div', 'ship-gallery-view', gallery);
  const img = el('img', 'ship-gallery-img', view);
  img.alt = '';
  const caption = el('div', 'ship-gallery-caption', gallery);
  const dots = el('div', 'ship-gallery-dots', gallery);
  let at = 0;
  // filled once the numbers' box exists, below
  let tabs: HTMLElement | null = null;
  let table: HTMLElement | null = null;
  const show = (i: number): void => {
    at = (i + list.length) % list.length;
    const s = list[at];
    if (!s) return;
    // a vehicle not painted yet: its name only
    const painted = ART_KEYS.includes(s.card);
    img.style.visibility = painted ? 'visible' : 'hidden';
    if (painted) img.src = assetUrl(`art/${s.card}.webp`);
    caption.textContent = s.title;
    for (const [k, d] of [...dots.children].entries()) d.classList.toggle('on', k === at);
    if (tabs) for (const [k, t] of [...tabs.children].entries()) t.classList.toggle('on', k === at);
    if (table) renderShipStats(table, s);
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
  // a tab for each picture, over its numbers
  tabs = el('div', 'yard-tabs ship-tabs', info);
  list.forEach((t, i) => el('button', 'yard-tab', tabs!, t.title).addEventListener('click', () => show(i)));
  table = el('div', 'ship-info-rows', info);
  show(0);

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
