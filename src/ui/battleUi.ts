// The battle interface, like Pokémon: the wild beast's box at the top left, yours at the right, the message
// box at the bottom and the menu (Lotta, Zaino, Squadra, Doma, Fuggi) with its sub-menus.
import { BATTLE } from '../data/battle';
import { BATTLE_TEXT } from '../data/battleText';
import { RARITY } from '../data/cards';
import { TYPES } from '../data/rules';
import { ITEMS } from '../data/world';
import type { Action, BattleState } from '../systems/battle/battle';
import { canUse, named, type Fighter } from '../systems/battle/fighter';
import { formName, formStars, formType } from '../systems/beasts/forms';
import './battle.css';
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

function typeTag(parent: HTMLElement, type: string): void {
  const t = type === 'variabile' ? null : TYPES[type as keyof typeof TYPES];
  const tag = el('span', 'btag', parent, t?.name ?? 'Variabile');
  tag.style.color = t?.color ?? '#e6ede8';
  tag.style.borderColor = t?.color ?? '#e6ede8';
}

class InfoBox {
  private readonly name: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly hpText: HTMLSpanElement;
  private readonly tags: HTMLDivElement;

  constructor(parent: HTMLElement, cls: string) {
    const box = el('div', `binfo ${cls}`, parent);
    this.name = el('div', 'binfo-name', box);
    this.tags = el('div', 'binfo-tags', box);
    const bar = el('div', 'binfo-bar', box);
    this.fill = el('div', 'binfo-fill', bar);
    this.hpText = el('span', 'binfo-hp', box);
  }

  show(f: Fighter): void {
    const stars = formStars(f.form);
    this.name.replaceChildren(
      document.createTextNode(`${formName(f.form)} `),
      el('span', 'binfo-lv', undefined, `liv. ${f.level}`),
    );
    this.tags.replaceChildren();
    typeTag(this.tags, formType(f.form));
    el('span', 'binfo-stars', this.tags).innerHTML = ICONS.star.repeat(stars);
    (this.tags.lastChild as HTMLElement).style.color = RARITY[stars as 1].color;
    this.setHp(f);
  }

  setHp(f: Fighter): void {
    const frac = Math.max(0, f.hp / f.maxHp);
    this.fill.style.width = `${frac * 100}%`;
    this.fill.classList.toggle('low', frac < 0.25);
    this.fill.classList.toggle('mid', frac >= 0.25 && frac < 0.5);
    this.hpText.textContent = `${Math.ceil(f.hp)} / ${f.maxHp}`;
  }
}

export class BattleUi {
  readonly root: HTMLDivElement;
  private readonly foeBox: InfoBox;
  private readonly youBox: InfoBox;
  private readonly msg: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  /** The SCHIVA bar, shown when the wild beast attacks. */
  readonly dodge: DodgeBar;
  private advance: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'battle', parent);
    this.foeBox = new InfoBox(this.root, 'foe');
    this.youBox = new InfoBox(this.root, 'you');
    this.msg = el('div', 'bmsg', this.root);
    this.menu = el('div', 'bmenu', this.root);
    this.dodge = new DodgeBar(this.root);
    this.msg.addEventListener('pointerdown', () => this.advance?.());
  }

  show(s: BattleState): void {
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
    this.msg.textContent = text;
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
    const b = el('button', `bbtn ${cls}`, parent, label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  /** The main menu and its sub-menus; resolves with the chosen action. */
  chooseAction(s: BattleState, items: Record<string, number>): Promise<Action> {
    return new Promise((done) => {
      const me = s.team[s.active]!;
      const main = (): void => {
        this.msg.textContent = BATTLE_TEXT.whatNext(named(me));
        const m = this.menu;
        m.replaceChildren();
        m.className = 'bmenu main';
        this.button(m, 'Lotta', moves, 'bbtn-fight');
        this.button(m, 'Zaino', bag);
        this.button(m, 'Squadra', team);
        this.button(m, 'Doma', () => done({ kind: 'tame' }), 'bbtn-tame');
        this.button(m, 'Fuggi', () => done({ kind: 'flee' }));
      };
      const back = (m: HTMLElement): void => void this.button(m, 'Indietro', main, 'bbtn-back');
      const moves = (): void => {
        const m = this.menu;
        m.replaceChildren();
        m.className = 'bmenu moves';
        me.moves.forEach((bm, i) => {
          const b = this.button(m, '', () => done({ kind: 'move', index: i }), 'bbtn-move');
          const t = bm.move.type === 'variabile' ? null : TYPES[bm.move.type];
          b.style.borderColor = t?.color ?? '#e6ede8';
          el('span', 'bm-name', b, bm.move.name);
          el('span', 'bm-type', b, t?.name ?? 'Variabile').style.color = t?.color ?? '#e6ede8';
          const state = !bm.unlocked
            ? `liv. ${bm.unlockLevel}`
            : bm.recharge > 0
              ? `pronta tra ${bm.recharge} ${bm.recharge === 1 ? 'turno' : 'turni'}`
              : bm.rechargeTurns
                ? `poi ricarica ${bm.rechargeTurns} ${bm.rechargeTurns === 1 ? 'turno' : 'turni'}`
                : 'sempre pronta';
          el('span', 'bm-info', b, `${POWER_NAMES[bm.move.power]} · ${state}`);
          b.disabled = !canUse(bm);
        });
        back(m);
      };
      const bag = (): void => {
        const m = this.menu;
        m.replaceChildren();
        m.className = 'bmenu list';
        for (const id of Object.keys(items).filter((k) => (items[k] ?? 0) > 0 && k in BATTLE.items)) {
          const name = ITEMS.find((it) => it.id === id)?.name ?? id;
          this.button(m, `${name} ×${items[id]}`, () => done({ kind: 'item', id }));
        }
        if (!m.children.length) el('div', 'bempty', m, 'Lo zaino è vuoto.');
        back(m);
      };
      const team = (): void => {
        const m = this.menu;
        m.replaceChildren();
        m.className = 'bmenu list';
        s.team.forEach((f, i) => {
          const b = this.button(
            m,
            `${formName(f.form)} liv. ${f.level} · ${Math.ceil(f.hp)}/${f.maxHp}`,
            () => done({ kind: 'switch', index: i }),
          );
          b.disabled = f.hp <= 0 || i === s.active;
        });
        back(m);
      };
      main();
    });
  }

  /** Your beast fainted: pick the next one (no going back). */
  chooseNext(s: BattleState): Promise<number> {
    return new Promise((done) => {
      this.msg.textContent = BATTLE_TEXT.chooseNext;
      const m = this.menu;
      m.replaceChildren();
      m.className = 'bmenu list';
      s.team.forEach((f, i) => {
        if (f.hp > 0)
          this.button(m, `${formName(f.form)} liv. ${f.level} · ${Math.ceil(f.hp)}/${f.maxHp}`, () =>
            done(i),
          );
      });
    });
  }

  /** The end: a title, some lines and a button (fight again, or back to the sea). */
  result(title: string, lines: string[], label: string, onClick: () => void): void {
    const box = el('div', 'bresult', this.root);
    el('h2', '', box, title);
    for (const l of lines) el('p', '', box, l);
    this.button(box, label, onClick, 'bbtn-fight');
  }

  destroy(): void {
    this.root.remove();
  }
}
