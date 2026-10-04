// A harbour (Portofosco or Porto Fango, full screen): tabs with icons on the left, cards on the right.
// Market (sell the bag, buy items), Suits (suits and upgrades), Backpack, Board (missions), Pen (team).
import { MARKET } from '../data/economy';
import { renderFuel, renderSubs } from './portSubs';
import { FISH, ITEMS, SUITS, SUIT_UPGRADES } from '../data/world';
import { bagCount, buyItem, buySuit, buyUpgrade, stockLeft, type BuyResult } from '../systems/economy/gear';
import { restAtPort, sellAtPort, type GameState } from '../systems/game';
import type { Session } from '../scenes/session';
import { el } from './dom';
import { icon, iconFor, type IconName } from './icons';
import { portCard } from './portCard';
import { renderBackpack, renderBoard, type TabContext } from './portTabs';
import { renderTeamPanel } from './teamPanel';
import { askAurelio } from '../systems/story';

export { slotName } from './portTabs';

type Tab = 'mercato' | 'mute' | 'zaino' | 'bacheca' | 'recinto';
const TABS: [Tab, string, IconName][] = [
  ['mercato', 'Mercato', 'coins'],
  ['mute', 'Mute', 'suit'], // suits, then the submarines (portSubs.ts)
  ['zaino', 'Zaino', 'backpack'],
  ['bacheca', 'Bacheca', 'scroll'],
  ['recinto', 'Recinto', 'pen'],
];

export class PortMenu {
  private readonly root: HTMLDivElement;
  private readonly teeth: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private readonly msg: HTMLDivElement;
  private readonly tabs: HTMLButtonElement[] = [];
  private tab: Tab = 'mercato';
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
    if (!g.port || g.port.id === 'portofosco') {
      // Aurelio lives in Portofosco
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

  private result(r: BuyResult, okText: string): void {
    if (r.ok) this.say(okText);
    else this.say(r.reason, true);
    this.render();
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
    if (this.tab === 'mercato') this.renderMarket(b);
    else if (this.tab === 'mute') {
      renderFuel(b, ctx); // first: an expedition starts with full tanks
      el('h3', '', b, 'Mute');
      this.renderSuits(b);
      renderSubs(b, ctx);
    } else if (this.tab === 'zaino') renderBackpack(b, ctx);
    else if (this.tab === 'bacheca') renderBoard(b, ctx);
    else renderTeamPanel(b, this.g, true);
    this.body.scrollTop = keep;
  }

  private renderMarket(b: HTMLElement): void {
    const gear = this.g.gear;
    const n = bagCount(gear);
    const worth = Object.entries(gear.bag).reduce(
      (a, [id, c]) => a + c * (FISH.find((f) => f.id === id)?.sellPrice ?? 0),
      0,
    );
    const sell = el('div', 'pcard-grid', b);
    portCard(sell, {
      icon: 'fish',
      title: `Sacca: ${n} pesci`,
      text: n
        ? 'Il mercante compra tutto il pescato.'
        : 'Pesca con arpione, fiocine o rete: i pesci finiscono qui.',
      price: n ? worth : undefined,
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
    el('h3', '', b, 'Oggetti');
    const grid = el('div', 'pcard-grid', b);
    for (const id of MARKET.items) {
      const it = ITEMS.find((i) => i.id === id)!;
      const left = stockLeft(gear, id);
      const have = gear.inventory[id] ?? 0;
      portCard(grid, {
        icon: iconFor(id),
        title: it.name,
        badge: have ? `hai ${have}` : undefined,
        text: `${it.text}${Number.isFinite(left) ? ` · disponibili ${left}` : ''}`,
        price: it.price,
        state: left <= 0 ? 'locked' : '',
        button: {
          label: left <= 0 ? 'Esaurito' : 'Compra',
          disabled: left <= 0 || gear.teeth < it.price,
          onClick: () => this.result(buyItem(gear, id), `${it.name} comprato.`),
        },
      });
    }
  }

  private renderSuits(b: HTMLElement): void {
    const gear = this.g.gear;
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
          onClick: () => this.result(buySuit(gear, s.id), `${s.name} indossata.`),
        },
      });
    }
    el('h3', '', b, 'Potenziamenti');
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
          onClick: () => this.result(buyUpgrade(gear, u.id), `${u.name} montato.`),
        },
      });
    }
  }

  destroy(): void {
    window.clearTimeout(this.msgTimer);
    this.root.parentElement?.classList.remove('in-port');
    this.root.remove();
  }
}
