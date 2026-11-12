// A harbour (full screen): tabs with icons on the left, cards on the right. One subject per tab (owner, 16 ottobre
// 2026): the Board first (the Wanted, bounties, jobs), the fish market, then the shops (portShop.ts), the vehicles
// (portVehicles.ts), the backpack and the pen.
import { renderBeastRequests } from './beastRequests';
import { renderBarter } from './barter';
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
import { runCoach } from './coach';

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
  /** Sell the fish bag, always in sight while it has fish (owner, 12 novembre 2026: "vendi sardine ricevi soldi"). */
  private readonly sellBtn: HTMLButtonElement;
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
      aurelio.dataset.coach = 'port-aurelio';
      aurelio.append(icon('lamp'), document.createTextNode(' Aurelio'));
      aurelio.addEventListener('click', () => askAurelio(this.g, this.g.story.pending));
    }
    // resting is what entering the port already did: the button says it out loud and can be pressed again
    const rest = el('button', 'pbtn', top);
    rest.dataset.coach = 'port-rest';
    rest.append(icon('heart'), document.createTextNode(' Riposa'));
    rest.addEventListener('click', () => {
      restAtPort(this.g);
      this.session.emit('saveNow');
      this.say(
        `Tu e la squadra siete in forze. Se perdi i sensi ti risvegli qui, a ${this.g.port?.name ?? 'Portofosco'}.`,
      );
    });
    this.sellBtn = el('button', 'pbtn sell', top);
    this.sellBtn.dataset.coach = 'port-sell';
    this.sellBtn.addEventListener('click', () => this.sellFish());
    const dive = el('button', 'pbtn primary', top);
    dive.dataset.coach = 'port-dive';
    dive.append(icon('dive'), document.createTextNode(' Tuffati'));
    dive.addEventListener('click', () => {
      this.session.emit('saveNow');
      // arrived on the ship or the boat: into the water from it (owner, 12 novembre 2026: at Porto Fango the button
      // only closed the menu and left you at the helm, as if it did not work)
      if (this.g.ship.aboard || this.g.boat.aboard) this.session.input.helmCmd = 'dive';
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
      b.dataset.coach = `port-${id}`;
      this.tabs.push(b);
    }
    this.body = el('div', 'port-body', this.root);
    this.msg = el('div', 'port-msg', this.root);
    this.render();
    runCoach(g.story, 'porto'); // the step-by-step tutorial, the first time (data/coach.ts)
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
    const n = bagCount(gear);
    this.sellBtn.hidden = n === 0;
    this.sellBtn.replaceChildren(
      icon('fish'),
      document.createTextNode(` Vendi ${n} pesci (+${bagWorth(gear.market, gear.bag, Date.now())}) `),
      icon('tooth'),
    );
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
    else renderTeamPanel(b, this.g, 'port');
    this.body.scrollTop = keep;
  }

  private sellFish(): void {
    const r = sellAtPort(this.g);
    this.say(`Venduti ${r.count} pesci: +${r.teeth} denti.`);
    this.render();
  }

  /** The fish market: sell the bag first (the first thing to learn), the beasts this harbour buys, the barter, the
   *  price list (a kind sold in heaps is cheaper for a while, market.ts). */
  private renderMarket(b: HTMLElement): void {
    const gear = this.g.gear;
    const ctx: TabContext = { g: this.g, say: (t, e) => this.say(t, e), redraw: () => this.render() };
    el('h3', '', b, 'Pesci');
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
        onClick: () => this.sellFish(),
      },
    });
    // the beasts this harbour buys at double price (owner, 26 ottobre 2026), several common ones for an albino or
    // an alpha
    renderBeastRequests(b, ctx);
    renderBarter(b, ctx);
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
