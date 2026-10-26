// The barter in the harbour's market (owner, 26 ottobre 2026): each trade with the beasts you give and the one you get,
// how many of them you have in the pen, and the button to trade. Logic: economy/barter.ts.
import { BOUNTY_TEXT } from '../data/bounties';
import { barter, barterOffers, barterStock } from '../systems/economy/barter';
import { setArt } from './art';
import { el } from './dom';
import type { TabContext } from './portTabs';

export function renderBarter(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.port) return;
  const offers = barterOffers(g, g.port.id);
  if (!offers.length) return;
  el('h3', '', b, BOUNTY_TEXT.barter);
  el('p', 'port-hint', b, BOUNTY_TEXT.barterHint);
  const row = el('div', 'bounty-row', b);
  for (const o of offers) {
    const have = barterStock(g, o).length;
    const c = el('div', 'bounty-card barter-card', row);
    const arts = el('div', 'barter-arts', c);
    for (const form of [o.from, o.to]) {
      const img = el('img', 'bounty-art', arts);
      img.alt = '';
      img.loading = 'lazy';
      setArt(img, form);
    }
    const body = el('div', 'bounty-body', c);
    el('div', 'bounty-title', body, `${o.give} × ${o.fromName} → 1 ${o.toName}`);
    el('div', 'bounty-text', body, `Hai ${Math.min(have, o.give)} / ${o.give} in riserva (non in squadra).`);
    const foot = el('div', 'bounty-foot', body);
    const btn = el('button', `pbtn${have >= o.give ? ' primary' : ''}`, foot, 'Scambia');
    btn.disabled = have < o.give;
    btn.addEventListener('click', () => {
      if (!window.confirm(`Dare ${o.give} ${o.fromName} per 1 ${o.toName}? Non tornano più.`)) return;
      const got = barter(g, g.port!.id, o.id);
      if (got) ctx.say(BOUNTY_TEXT.barterDone(o.toName));
      ctx.redraw();
    });
  }
}
