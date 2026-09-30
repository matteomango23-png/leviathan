// Portofosco: market, suits, backpack, harbour board and the pen (team / reserve).
import { MARKET } from '../data/economy';
import { FISH, ITEMS, SUITS, SUIT_UPGRADES, SWARMS, WEAPONS } from '../data/world';
import {
  bagCount,
  buyItem,
  buySuit,
  buyUpgrade,
  canEquip,
  setSlot,
  stockLeft,
  type BuyResult,
} from '../systems/economy/gear';
import {
  acceptMission,
  boardMissions,
  claimMission,
  goalCount,
  isComplete,
  missionById,
} from '../systems/economy/missions';
import { sellAtPort, type GameState } from '../systems/game';
import type { Session } from '../scenes/session';
import { el } from './dom';
import { renderTeamPanel } from './teamPanel';

type Tab = 'mercato' | 'mute' | 'zaino' | 'bacheca' | 'recinto';
const TABS: [Tab, string][] = [
  ['mercato', 'Mercato'],
  ['mute', 'Mute'],
  ['zaino', 'Zaino'],
  ['bacheca', 'Bacheca'],
  ['recinto', 'Recinto'],
];

export const slotName = (id: string): string =>
  WEAPONS.find((w) => w.id === id)?.name ??
  ITEMS.find((i) => i.id === id)?.name ??
  SWARMS.find((s) => s.id === id)?.name ??
  id;

export class PortMenu {
  private readonly root: HTMLDivElement;
  private readonly teeth: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly msg: HTMLParagraphElement;
  private tab: Tab = 'mercato';

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly g: GameState,
    onDive: () => void,
  ) {
    this.root = el('div', 'menu port', parent);
    const panel = el('div', 'menu-panel wide', this.root);
    const head = el('div', 'port-head', panel);
    el('h2', '', head, 'Portofosco');
    this.teeth = el('div', 'teeth', head);
    const tabs = el('div', 'tabs', panel);
    for (const [id, label] of TABS) {
      const b = el('button', 'tab', tabs, label);
      b.dataset.tab = id;
      b.addEventListener('click', () => {
        this.tab = id;
        this.render();
      });
    }
    this.msg = el('p', 'menu-msg', panel);
    this.body = el('div', 'port-body', panel);
    const dive = el('button', 'menu-btn primary', panel, 'Tuffati');
    dive.addEventListener('click', () => {
      this.session.emit('saveNow');
      onDive();
    });
    this.render();
  }

  private say(text: string, error = false): void {
    this.msg.textContent = text;
    this.msg.classList.toggle('error', error);
  }

  private result(r: BuyResult, okText: string): void {
    if (r.ok) this.say(okText);
    else this.say(r.reason, true);
    this.render();
  }

  private row(
    parent: HTMLElement,
    title: string,
    sub: string,
    button?: { label: string; disabled?: boolean; onClick: () => void },
  ): void {
    const r = el('div', 'shop-row', parent);
    const info = el('div', 'shop-info', r);
    el('div', 'shop-title', info, title);
    if (sub) el('div', 'shop-sub', info, sub);
    if (button) {
      const b = el('button', 'menu-btn small', r, button.label);
      b.disabled = !!button.disabled;
      b.addEventListener('click', button.onClick);
    }
  }

  private render(): void {
    const gear = this.g.gear;
    this.teeth.textContent = `🦷 ${gear.teeth} denti`;
    this.root
      .querySelectorAll<HTMLButtonElement>('.tab')
      .forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab));
    this.body.innerHTML = '';
    const b = this.body;
    if (this.tab === 'mercato') {
      const n = bagCount(gear);
      const worth = Object.entries(gear.bag).reduce(
        (a, [id, c]) => a + c * (FISH.find((f) => f.id === id)?.sellPrice ?? 0),
        0,
      );
      this.row(
        b,
        `Pesci nella sacca: ${n}`,
        n ? `Valgono ${worth} denti` : 'Pesca con arpione, fiocine o rete',
        {
          label: 'Vendi tutto',
          disabled: n === 0,
          onClick: () => {
            const r = sellAtPort(this.g);
            this.say(`Venduti ${r.count} pesci per ${r.teeth} denti.`);
            this.render();
          },
        },
      );
      el('h3', '', b, 'Oggetti');
      for (const id of MARKET.items) {
        const it = ITEMS.find((i) => i.id === id)!;
        const left = stockLeft(gear, id);
        const have = gear.inventory[id] ?? 0;
        this.row(
          b,
          `${it.name} · ${it.price} denti`,
          `${it.text}${have ? ` · ne hai ${have}` : ''}${Number.isFinite(left) ? ` · disponibili ${left}` : ''}`,
          {
            label: 'Compra',
            disabled: left <= 0,
            onClick: () => this.result(buyItem(gear, id), `${it.name} comprato.`),
          },
        );
      }
    } else if (this.tab === 'mute') {
      for (const s of SUITS) {
        const own = gear.suits.includes(s.id);
        const worn = gear.suit === s.id;
        this.row(
          b,
          `${s.name}${own ? '' : ` · ${s.price} denti`}`,
          `${s.note} · fino a ${s.maxDepth} m${s.hpBonus ? ` · +${s.hpBonus} cuori` : ''}`,
          {
            label: worn ? 'Indossata' : own ? 'Indossa' : 'Compra',
            disabled: worn,
            onClick: () => this.result(buySuit(gear, s.id), `${s.name} indossata.`),
          },
        );
      }
      el('h3', '', b, 'Potenziamenti');
      for (const u of SUIT_UPGRADES) {
        const ready = MARKET.upgradesReady.includes(u.id);
        const own = gear.upgrades.includes(u.id);
        this.row(b, `${u.name} · ${u.price} denti`, ready ? u.effect : `${u.effect} (in arrivo)`, {
          label: own ? 'Tuo' : 'Compra',
          disabled: own || !ready,
          onClick: () => this.result(buyUpgrade(gear, u.id), `${u.name} montato.`),
        });
      }
    } else if (this.tab === 'zaino') this.renderBackpack(b);
    else if (this.tab === 'bacheca') this.renderBoard(b);
    else renderTeamPanel(b, this.g, true);
  }

  private renderBackpack(b: HTMLElement): void {
    const gear = this.g.gear;
    el(
      'p',
      '',
      b,
      'L’arpione è sempre con te. Scegli cosa mettere nei 3 posti dello zaino per la prossima immersione.',
    );
    const options = [
      ...gear.weapons.filter((w) => w !== 'arpione'),
      ...gear.swarms,
      ...Object.keys(gear.inventory).filter((i) => (gear.inventory[i] ?? 0) > 0),
    ];
    gear.backpack.forEach((cur, i) => {
      const r = el('div', 'shop-row', b);
      el('div', 'shop-title', r, `Posto ${i + 1}`);
      const sel = el('select', 'slot-select', r);
      const none = el('option', '', sel, '— vuoto —');
      none.value = '';
      for (const id of options) {
        const o = el(
          'option',
          '',
          sel,
          `${slotName(id)}${gear.inventory[id] ? ` ×${gear.inventory[id]}` : ''}`,
        );
        o.value = id;
        o.disabled = id !== cur && (gear.backpack.includes(id) || !canEquip(gear, id));
      }
      sel.value = cur ?? '';
      sel.addEventListener('change', () => {
        setSlot(gear, i, sel.value || null);
        this.render();
      });
    });
    if (!options.length)
      el('p', '', b, 'Ancora niente da mettere: apri i relitti, compra oggetti, lega uno sciame.');
  }

  private renderBoard(b: HTMLElement): void {
    const gear = this.g.gear;
    el('h3', '', b, 'In corso');
    if (!gear.missions.active.length) el('p', '', b, 'Nessuna missione in corso.');
    for (const id of gear.missions.active) {
      const m = missionById(id)!;
      const done = isComplete(gear, id);
      const p = Math.min(gear.missions.progress[id] ?? 0, goalCount(m));
      this.row(b, `${m.title} · ${m.reward} denti`, `${m.text} (${p}/${goalCount(m)})`, {
        label: done ? 'Riscuoti' : 'In corso',
        disabled: !done,
        onClick: () => {
          const t = claimMission(gear, id);
          this.say(`Missione compiuta: ${t} denti.`);
          this.render();
        },
      });
    }
    el('h3', '', b, 'Bacheca');
    const board = boardMissions(gear);
    if (!board.length) el('p', '', b, 'Per ora non ci sono altri incarichi.');
    for (const m of board)
      this.row(b, `${m.title} · ${m.reward} denti`, m.text, {
        label: 'Accetta',
        onClick: () => {
          if (acceptMission(gear, m.id)) this.say('Missione accettata.');
          else this.say('Hai già 3 missioni in corso.', true);
          this.render();
        },
      });
  }

  destroy(): void {
    this.root.remove();
  }
}
