// The harbour's shops (owner, 16 ottobre 2026: "tab monotematiche e con diverse categorie"): Conchiglie, Cure, Esche
// and Sub, each a few shelves of cards (data/economy.ts SHOP); Sub also has the suits and their upgrades.
import { MARKET, SHOP, type ShopTab } from '../data/economy';
import { ITEMS, SUITS, SUIT_UPGRADES } from '../data/world';
import { buyItem, buySuit, buyUpgrade, stockLeft, type BuyResult } from '../systems/economy/gear';
import { el } from './dom';
import { iconFor } from './icons';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';

const HINTS: Record<ShopTab, string> = {
  conchiglie:
    'In battaglia ne lanci una a ogni tentativo di domare. Più è pregiata, più tiene: la Conchiglia del Re non sbaglia mai.',
  cure: 'Si usano dallo zaino o in battaglia, su una bestia della squadra.',
  esche:
    'Mettila nello zaino e usala in acqua: per un minuto e mezzo arrivano le bestie del suo gruppo. Le pregiate a volte portano un alfa o un albino.',
  sub: 'Una muta migliore ti porta più in fondo; i potenziamenti restano tuoi per sempre.',
};

function done(ctx: TabContext, r: BuyResult, okText: string): void {
  ctx.say(r.ok ? okText : r.reason, !r.ok);
  ctx.redraw();
}

function itemCard(grid: HTMLElement, ctx: TabContext, id: string): void {
  const gear = ctx.g.gear;
  const it = ITEMS.find((i) => i.id === id)!;
  const left = stockLeft(gear, id);
  const have = gear.inventory[id] ?? 0;
  const out = left <= 0;
  portCard(grid, {
    icon: iconFor(id),
    title: it.name,
    badge: have ? `hai ${have}` : undefined,
    text: `${it.text}${Number.isFinite(left) && !out ? ` · disponibili ${left}` : ''}`,
    price: it.price,
    state: out ? 'locked' : '',
    button: {
      label: out ? (it.maxOwned ? 'Ne hai già una' : 'Esaurito') : 'Compra',
      disabled: out || gear.teeth < it.price,
      onClick: () => done(ctx, buyItem(gear, id), `${it.name} comprato.`),
    },
  });
}

export function renderShop(b: HTMLElement, ctx: TabContext, tab: ShopTab): void {
  el('p', 'port-hint', b, HINTS[tab]);
  if (tab === 'sub') renderSuits(b, ctx);
  for (const shelf of SHOP[tab]) {
    el('h3', '', b, shelf.title);
    const grid = el('div', 'pcard-grid', b);
    for (const id of shelf.items) itemCard(grid, ctx, id);
  }
}

function renderSuits(b: HTMLElement, ctx: TabContext): void {
  const gear = ctx.g.gear;
  el('h3', '', b, 'Mute');
  const grid = el('div', 'pcard-grid', b);
  for (const s of SUITS) {
    const own = gear.suits.includes(s.id);
    const worn = gear.suit === s.id;
    portCard(grid, {
      icon: 'suit',
      title: s.name,
      badge: worn ? 'indossata' : own ? 'tua' : undefined,
      text: `${s.note}. Fino a ${s.maxDepth} m${s.hpBonus ? `, +${s.hpBonus} cuori` : ''}.`,
      price: own ? undefined : s.price,
      state: worn ? 'active' : own ? 'owned' : '',
      button: {
        label: worn ? 'Indossata' : own ? 'Indossa' : 'Compra',
        disabled: worn || (!own && gear.teeth < s.price),
        onClick: () => done(ctx, buySuit(gear, s.id), `${s.name} indossata.`),
      },
    });
  }
  el('h3', '', b, 'Potenziamenti e lampade');
  const up = el('div', 'pcard-grid', b);
  for (const u of SUIT_UPGRADES) {
    const ready = MARKET.upgradesReady.includes(u.id);
    const own = gear.upgrades.includes(u.id);
    portCard(up, {
      icon: iconFor(u.id),
      title: u.name,
      badge: own ? 'tuo' : ready ? undefined : 'in arrivo',
      text: u.effect,
      price: own ? undefined : u.price,
      state: own ? 'owned' : ready ? '' : 'locked',
      button: {
        label: own ? 'Montato' : 'Compra',
        disabled: own || !ready || gear.teeth < u.price,
        onClick: () => done(ctx, buyUpgrade(gear, u.id), `${u.name} montato.`),
      },
    });
  }
}
