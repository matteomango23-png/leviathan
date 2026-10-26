// The market's requests for beasts, in the harbour's market (owner, 26 ottobre 2026: "una sezione più esplicita del
// mercato, dove puoi vendere alcuni dei tuoi animali in base alla richiesta"): the beasts this harbour buys now, at
// double price, and for each a button to sell one of yours waiting in the pen. Logic: economy/beastRequests.ts.
import { BEAST_REQUESTS, BOUNTY_TEXT } from '../data/bounties';
import { formKey, formName } from '../systems/beasts/forms';
import { cannotSell } from '../systems/economy/beastSale';
import { priceAt, requestsAt, sellAtPort } from '../systems/economy/beastRequests';
import { setArt } from './art';
import { el } from './dom';
import { icon } from './icons';
import type { TabContext } from './portTabs';

export function renderBeastRequests(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.port) return;
  el('h3', '', b, BOUNTY_TEXT.requests);
  el('p', 'port-hint', b, BOUNTY_TEXT.requestsHint);
  const row = el('div', 'bounty-row', b);
  for (const r of requestsAt(g, g.port.id)) {
    // a request names its beast plainly (owner: "scritte chiare"), seen or not
    const c = el('div', 'bounty-card', row);
    const img = el('img', 'bounty-art', c);
    img.alt = '';
    img.loading = 'lazy';
    setArt(img, r.form);
    const body = el('div', 'bounty-body', c);
    el('div', 'bounty-title', body, `Il porto compra: ${r.name}`);
    el('div', 'bounty-text', body, `Paga il doppio · ${r.where}`);
    const foot = el('div', 'bounty-foot', body);
    // one of yours waiting in the pen, ready to sell
    const mine = g.beasts.team.find(
      (x) => formKey(x.form) === r.id && !x.form.final && !cannotSell(g.beasts.team, x),
    );
    const p = el('span', 'price bounty-reward', foot);
    p.append(
      icon('tooth'),
      document.createTextNode(mine ? ` ${priceAt(g, mine)}` : ` ×${BEAST_REQUESTS.priceMult}`),
    );
    const btn = el('button', `pbtn${mine ? ' primary' : ''}`, foot, mine ? 'Vendi' : 'Non ne hai');
    btn.disabled = !mine;
    btn.addEventListener('click', () => {
      if (!mine) return;
      if (!window.confirm(`Vendere ${formName(mine.form)} per ${priceAt(g, mine)} denti? Non torna più.`))
        return;
      const teeth = sellAtPort(g, mine.uid);
      if (teeth > 0) ctx.say(`Venduta: +${teeth} denti.`);
      ctx.redraw();
    });
  }
}
