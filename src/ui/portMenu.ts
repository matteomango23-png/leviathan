// A harbour (full screen): tabs with icons on the left, cards on the right. One subject per tab (owner, 16 ottobre
// 2026): the Board first (the Wanted, bounties, jobs), the fish market, then the shops (portShop.ts), the vehicles
// (portVehicles.ts), the backpack and the pen.
import { FISH } from '../data/world';
import { bagWorth, recover, unitPrice } from '../systems/economy/market';
import { bagCount } from '../systems/economy/gear';
import { restAtPort, sellAtPort, type GameState } from '../systems/game';
import type { Session } from '../scenes/session';
import { el } from './dom';
import { icon, type IconName } from './icons';
import { portCard } from './portCard';
import { renderBoard } from './portBoard';
import { renderShop } from './portShop';
import { renderBackpack, type TabContext } from './portTabs';
import { renderVehicles } from './portVehicles';
import { renderTeamPanel } from './teamPanel';
import { askAurelio } from '../systems/story';

export { slotName } from './portTabs';

type Tab = 'bacheca' | 'mercato' | 'conchiglie' | 'cure' | 'esche' | 'sub' | 'mezzi' | 'zaino' | 'recinto';
const TABS: [Tab, string, IconName][] = [
  ['bacheca', 'Bacheca', 'scroll'],
  ['mercato', 'Mercato', 'fish'],
  ['conchiglie', 'Conchiglie', 'star'],
  ['cure', 'Cure', 'leaf'],
  ['esche', 'Esche', 'hook'],
  ['sub', 'Sub', 'suit'],
  ['mezzi', 'Mezzi', 'trident'],
  ['zaino', 'Zaino', 'backpack'],
  ['recinto', 'Recinto', 'pen'],
];

export class PortMenu {
  private readonly root: HTMLDivElement;
  private readonly teeth: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private readonly msg: HTMLDivElement;
  private readonly tabs: HTMLButtonElement[] = [];
  private tab: Tab = 'bacheca';
  private msgTimer = 0;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly g: GameState,
    onDive: () => void,
  ) {
    this.root = el('div', 'port', parent);
    parent.classList.add('in-port'); // the diving HUD hides while the port is open
    const top = el('div', 'port-top', this.root);
    const title = el('div', 'port-title', top);
    el('span', '', title, g.port?.name ?? 'Portofosco');
    this.teeth = el('span', 'port-teeth', top);
    if (!g.port || g.port.id === 'portofosco' || g.port.id === 'fango') {
      // Aurelio is at Portofosco, and at Porto Fango with your ship
      const aurelio = el('button', 'pbtn', top);
      aurelio.append(icon('lamp'), document.createTextNode(' Aurelio'));
      aurelio.addEventListener('click', () => askAurelio(this.g, this.g.story.pending));
    }
    // resting is what entering the port already did: the button says it out loud and can be pressed again
    const rest = el('button', 'pbtn', top);
    rest.append(icon('heart'), document.createTextNode(' Riposa'));
    rest.addEventListener('click', () => {
      restAtPort(this.g);
      this.session.emit('saveNow');
      this.say(
        `Tu e la squadra siete in forze. Se perdi i sensi ti risvegli qui, a ${this.g.port?.name ?? 'Portofosco'}.`,
      );
    });
    const dive = el('button', 'pbtn primary', top);
    dive.append(icon('dive'), document.createTextNode(' Tuffati'));
    dive.addEventListener('click', () => {
      this.session.emit('saveNow');
      onDive();
    });
    const rail = el('div', 'port-rail', this.root);
    for (const [id, label, ic] of TABS) {
      const b = el('button', 'port-tab', rail);
      b.append(icon(ic), el('span', '', undefined, label));
      b.addEventListener('click', () => {
        this.tab = id;
        this.render(true);
      });
      b.dataset.tab = id;
      this.tabs.push(b);
    }
    this.body = el('div', 'port-body', this.root);
    this.msg = el('div', 'port-msg', this.root);
    this.render();
  }

  private say(text: string, error = false): void {
    this.msg.textContent = text;
    this.msg.classList.toggle('error', error);
    this.msg.classList.add('show');
    window.clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => this.msg.classList.remove('show'), 2600);
  }

  /** Redraws the open tab; the list keeps its scroll unless a new tab opens (buying used to jump to the top). */
  private render(newTab = false): void {
    const gear = this.g.gear;
    const keep = newTab ? 0 : this.body.scrollTop;
    this.teeth.replaceChildren(icon('tooth'), document.createTextNode(` ${gear.teeth}`));
    for (const t of this.tabs) t.classList.toggle('on', t.dataset.tab === this.tab);
    this.body.replaceChildren();
    const b = this.body;
    const ctx: TabContext = { g: this.g, say: (t, e) => this.say(t, e), redraw: () => this.render() };
    const t = this.tab;
    if (t === 'bacheca') renderBoard(b, ctx);
    else if (t === 'mercato') this.renderMarket(b);
    else if (t === 'conchiglie' || t === 'cure' || t === 'esche' || t === 'sub') renderShop(b, ctx, t);
    else if (t === 'mezzi') renderVehicles(b, ctx);
    else if (t === 'zaino') renderBackpack(b, ctx);
    else renderTeamPanel(b, this.g, true, true);
    this.body.scrollTop = keep;
  }

  /** The fish market: sell the bag, and the price list (a kind sold in heaps is cheaper for a while, market.ts). */
  private renderMarket(b: HTMLElement): void {
    const gear = this.g.gear;
    const n = bagCount(gear);
    const now = Date.now();
    const sell = el('div', 'pcard-grid', b);
    portCard(sell, {
      icon: 'fish',
      title: `Sacca: ${n} pesci`,
      text: n
        ? 'Il mercante compra tutto il pescato. Paga meno un pesce che gli hai appena venduto in gran quantità: il prezzo torna su col tempo.'
        : 'Pesca con arpione, fiocine o rete: i pesci finiscono qui.',
      price: n ? bagWorth(gear.market, gear.bag, now) : undefined,
      button: {
        label: 'Vendi tutto',
        disabled: n === 0,
        onClick: () => {
          const r = sellAtPort(this.g);
          this.say(`Venduti ${r.count} pesci: +${r.teeth} denti.`);
          this.render();
        },
      },
    });
    el('h3', '', b, 'Listino di oggi');
    const today = { sold: { ...gear.market.sold }, at: gear.market.at };
    recover(today, now);
    const list = el('div', 'price-list', b);
    for (const f of FISH) {
      const have = gear.bag[f.id] ?? 0;
      const row = el('div', `price-row${have ? ' have' : ''}`, list);
      el('span', 'price-name', row, f.name);
      el('span', 'price-have', row, have ? `×${have}` : '');
      const p = unitPrice(today, f.id);
      const low = p < f.sellPrice - 0.01;
      const v = el('span', `price${low ? ' low' : ''}`, row);
      const shown = Number.isInteger(p) ? `${p}` : p.toFixed(1).replace('.', ',');
      v.append(
        icon('tooth'),
        document.createTextNode(` ${shown}${low ? ` (di solito ${f.sellPrice})` : ''}`),
      );
    }
  }

  destroy(): void {
    window.clearTimeout(this.msgTimer);
    this.root.parentElement?.classList.remove('in-port');
    this.root.remove();
  }
}
