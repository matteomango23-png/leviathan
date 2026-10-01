// The battle interface, in the style of the recent Pokémon games: the wild beast's box at the top left, yours
// at the bottom left, the commands stacked on the right (Lotta, Zaino, Squadra, Doma, Fuggi) and the moves in
// the colours of their types. Messages appear at the bottom while the commands are hidden.
import { BATTLE } from '../data/battle';
import { BATTLE_TEXT } from '../data/battleText';
import { RARITY } from '../data/cards';
import { TYPES, type MoveTypeId } from '../data/rules';
import { ITEMS } from '../data/world';
import type { Action, BattleState } from '../systems/battle/battle';
import { canUse, named, type Fighter } from '../systems/battle/fighter';
import { formName, formStars, formType } from '../systems/beasts/forms';
import './battle.css';
import { battleIcon, typeIcon } from './battleIcons';
import { el } from './dom';
import { DodgeBar } from './dodgeBar';
import { ICONS } from './icons';

const POWER_NAMES: Record<string, string> = {
  nessuno: 'nessun danno',
  basso: 'debole',
  medio: 'medio',
  alto: 'forte',
  altissimo: 'fortissimo',
};

const typeColor = (type: MoveTypeId): string => (type === 'variabile' ? '#d9e4e6' : TYPES[type].color);
const typeName = (type: MoveTypeId): string => (type === 'variabile' ? 'Variabile' : TYPES[type].name);

class InfoBox {
  private readonly name: HTMLDivElement;
  private readonly level: HTMLSpanElement;
  private readonly tags: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly hpText: HTMLSpanElement | null;

  constructor(parent: HTMLElement, side: 'foe' | 'you') {
    const box = el('div', `binfo ${side}`, parent);
    const top = el('div', 'binfo-top', box);
    this.name = el('div', 'binfo-name', top);
    this.level = el('span', 'binfo-lv', top);
    this.tags = el('div', 'binfo-tags', box);
    const row = el('div', 'binfo-row', box);
    el('span', 'binfo-ps', row, 'PS');
    const bar = el('div', 'binfo-bar', row);
    this.fill = el('div', 'binfo-fill', bar);
    this.hpText = side === 'you' ? el('span', 'binfo-hp', box) : null; // like Pokémon: numbers only for yours
  }

  show(f: Fighter): void {
    const stars = formStars(f.form);
    const type = formType(f.form);
    this.name.textContent = formName(f.form);
    this.level.textContent = `Lv. ${f.level}`;
    const pill = el('span', 'btype');
    pill.style.setProperty('--tc', typeColor(type));
    pill.append(typeIcon(type, '#fff'), document.createTextNode(typeName(type)));
    const st = el('span', 'binfo-stars');
    st.innerHTML = ICONS.star.repeat(stars);
    st.style.color = RARITY[stars as 1].color;
    this.tags.replaceChildren(pill, st);
    this.setHp(f);
  }

  setHp(f: Fighter): void {
    const frac = Math.max(0, f.hp / f.maxHp);
    this.fill.style.width = `${frac * 100}%`;
    this.fill.classList.toggle('low', frac < 0.25);
    this.fill.classList.toggle('mid', frac >= 0.25 && frac < 0.5);
    if (this.hpText) this.hpText.textContent = `${Math.ceil(f.hp)} / ${f.maxHp}`;
  }
}

export class BattleUi {
  readonly root: HTMLDivElement;
  private readonly foeBox: InfoBox;
  private readonly youBox: InfoBox;
  private readonly msg: HTMLDivElement;
  private readonly msgText: HTMLSpanElement;
  private readonly menu: HTMLDivElement;
  /** The SCHIVA bar, shown when the wild beast attacks. */
  readonly dodge: DodgeBar;
  private advance: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'battle loading', parent); // hidden until the battle is ready (show)
    this.foeBox = new InfoBox(this.root, 'foe');
    this.youBox = new InfoBox(this.root, 'you');
    this.msg = el('div', 'bmsg', this.root);
    this.msgText = el('span', '', this.msg);
    el('span', 'bmsg-next', this.msg);
    this.menu = el('div', 'bmenu', this.root);
    this.dodge = new DodgeBar(this.root);
    this.msg.addEventListener('pointerdown', () => this.advance?.());
    this.msg.hidden = true;
  }

  show(s: BattleState): void {
    this.root.classList.remove('loading');
    this.foeBox.show(s.foe);
    this.youBox.show(s.team[s.active]!);
  }

  setHp(s: BattleState): void {
    this.foeBox.setHp(s.foe);
    this.youBox.setHp(s.team[s.active]!);
  }

  /** A message: goes on with a tap, or by itself after a moment. */
  say(text: string, seconds = 1.4): Promise<void> {
    this.menu.replaceChildren();
    this.msg.hidden = false;
    this.msgText.textContent = text;
    this.msg.classList.remove('pop');
    void this.msg.offsetWidth; // restart the little pop animation
    this.msg.classList.add('pop');
    return new Promise((done) => {
      let timer = 0;
      const finish = (): void => {
        window.clearTimeout(timer);
        this.advance = null;
        done();
      };
      timer = window.setTimeout(finish, seconds * 1000);
      this.advance = finish;
    });
  }

  private button(parent: HTMLElement, label: string, onClick: () => void, cls = ''): HTMLButtonElement {
    const b = el('button', `bbtn ${cls}`, parent);
    if (label) el('span', 'bbtn-label', b, label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  /** Clears the menu for a new page: the message hides, a short caption may sit on top. */
  private page(kind: string, caption?: string): HTMLDivElement {
    this.msg.hidden = true;
    const m = this.menu;
    m.replaceChildren();
    m.className = `bmenu ${kind}`;
    if (caption) el('div', 'bmenu-caption', m, caption);
    return m;
  }

  private command(m: HTMLElement, label: string, iconName: string, cls: string, onClick: () => void): void {
    const b = this.button(m, label, onClick, `bcmd ${cls}`);
    b.prepend(battleIcon(iconName));
  }

  private back(m: HTMLElement, onClick: () => void): void {
    this.button(m, 'Indietro', onClick, 'bbtn-back');
  }

  /** The main menu and its sub-menus; resolves with the chosen action. */
  chooseAction(s: BattleState, items: Record<string, number>): Promise<Action> {
    return new Promise((done) => {
      const me = s.team[s.active]!;
      const main = (): void => {
        const m = this.page('main', BATTLE_TEXT.whatNext(named(me)));
        this.command(m, 'Lotta', 'icona_lotta', 'c-fight', moves);
        this.command(m, 'Zaino', 'icona_zaino', 'c-bag', bag);
        this.command(m, 'Squadra', 'icona_squadra', 'c-team', team);
        this.command(m, 'Doma', 'icona_doma', 'c-tame', () => done({ kind: 'tame' }));
        this.command(m, 'Fuggi', 'icona_fuggi', 'c-flee', () => done({ kind: 'flee' }));
      };
      const moves = (): void => {
        const m = this.page('moves');
        const grid = el('div', 'bmoves', m);
        me.moves.forEach((bm, i) => {
          const b = this.button(grid, '', () => done({ kind: 'move', index: i }), 'bmove');
          b.style.setProperty('--tc', typeColor(bm.move.type));
          b.append(typeIcon(bm.move.type, '#fff'));
          const text = el('span', 'bmove-text', b);
          el('span', 'bmove-name', text, bm.move.name);
          const state = !bm.unlocked
            ? `dal Lv. ${bm.unlockLevel}`
            : bm.recharge > 0
              ? `pronta tra ${bm.recharge} ${bm.recharge === 1 ? 'turno' : 'turni'}`
              : bm.rechargeTurns
                ? `poi ricarica ${bm.rechargeTurns}`
                : 'sempre pronta';
          el('span', 'bmove-info', text, `${POWER_NAMES[bm.move.power]} · ${state}`);
          b.disabled = !canUse(bm);
        });
        this.back(m, main);
      };
      const bag = (): void => {
        const m = this.page('list', 'Zaino');
        for (const id of Object.keys(items).filter((k) => (items[k] ?? 0) > 0 && k in BATTLE.items)) {
          const name = ITEMS.find((it) => it.id === id)?.name ?? id;
          const b = this.button(m, name, () => done({ kind: 'item', id }), 'brow');
          el('span', 'brow-side', b, `×${items[id]}`);
        }
        if (m.children.length === 1) el('div', 'bempty', m, 'Lo zaino è vuoto.');
        this.back(m, main);
      };
      const team = (): void => {
        const m = this.page('list', 'Squadra');
        s.team.forEach((f, i) =>
          this.teamRow(m, f, () => done({ kind: 'switch', index: i }), f.hp <= 0 || i === s.active),
        );
        this.back(m, main);
      };
      main();
    });
  }

  private teamRow(m: HTMLElement, f: Fighter, onClick: () => void, disabled: boolean): void {
    const b = this.button(m, `${formName(f.form)}  Lv. ${f.level}`, onClick, 'brow');
    const bar = el('span', 'brow-bar', b);
    el('span', 'brow-fill', bar).style.width = `${Math.max(0, (f.hp / f.maxHp) * 100)}%`;
    el('span', 'brow-side', b, `${Math.ceil(f.hp)}/${f.maxHp}`);
    b.disabled = disabled;
  }

  /** Your beast fainted: pick the next one (no going back). */
  chooseNext(s: BattleState): Promise<number> {
    return new Promise((done) => {
      const m = this.page('list', BATTLE_TEXT.chooseNext);
      s.team.forEach((f, i) => {
        if (f.hp > 0) this.teamRow(m, f, () => done(i), false);
      });
    });
  }

  /** The end: a title, some lines and a button (fight again, or back to the sea). */
  result(title: string, lines: string[], label: string, onClick: () => void): void {
    this.msg.hidden = true;
    this.menu.replaceChildren();
    const box = el('div', 'bresult', this.root);
    el('h2', '', box, title);
    for (const l of lines) el('p', '', box, l);
    this.button(box, label, onClick, 'bcmd c-fight bresult-btn');
  }

  destroy(): void {
    this.root.remove();
  }
}
