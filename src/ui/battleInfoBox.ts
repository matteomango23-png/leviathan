// A beast's box in battle (ui/battleUi.ts): name, level, stars and type, health bar and condition; the wild one's
// at the top left, yours at the bottom left with its health in numbers.
import { RARITY } from '../data/cards';
import { STATUS_NAMES } from '../data/moveBattle';
import type { Fighter } from '../systems/battle/fighter';
import { formName, formStars, formType } from '../systems/beasts/forms';
import { rarityTier } from '../systems/battle/stage';
import { typeIcon } from './battleIcons';
import { el } from './dom';
import { ICONS } from './icons';
import { typeColor, typeName } from './movePanel';

export class InfoBox {
  private readonly name: HTMLDivElement;
  private readonly level: HTMLSpanElement;
  private readonly tags: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly hpText: HTMLSpanElement | null;
  private readonly box: HTMLDivElement;
  private readonly status: HTMLSpanElement;

  constructor(parent: HTMLElement, side: 'foe' | 'you') {
    const box = (this.box = el('div', `binfo ${side}`, parent));
    const top = el('div', 'binfo-top', box);
    this.name = el('div', 'binfo-name', top);
    this.level = el('span', 'binfo-lv', top);
    this.tags = el('div', 'binfo-tags', box);
    const row = el('div', 'binfo-row', box);
    this.status = el('span', 'binfo-status', row);
    this.status.hidden = true;
    el('span', 'binfo-ps', row, 'PS');
    const bar = el('div', 'binfo-bar', row);
    this.fill = el('div', 'binfo-fill', bar);
    this.hpText = side === 'you' ? el('span', 'binfo-hp', box) : null; // like Pokémon: numbers only for yours
  }

  show(f: Fighter): void {
    const stars = formStars(f.form);
    const type = formType(f.form);
    const tier = rarityTier(f.form);
    this.box.classList.toggle('rare', tier === 1);
    this.box.classList.toggle('legend', tier === 2);
    // a long name scrolls slowly instead of being cut with dots
    const text = el('span', 'binfo-name-text', undefined, formName(f.form));
    this.name.replaceChildren(text);
    this.name.classList.remove('scroll');
    requestAnimationFrame(() => {
      const over = text.scrollWidth - this.name.clientWidth;
      if (over > 2) {
        this.name.style.setProperty('--shift', `-${over + 6}px`);
        this.name.style.setProperty('--dur', `${Math.max(4, over / 12)}s`);
        this.name.classList.add('scroll');
      }
    });
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
    // its condition, like Pokémon's badge next to the health bar
    this.status.hidden = !f.status;
    this.status.textContent = f.status ? STATUS_NAMES[f.status] : '';
    this.status.dataset.status = f.status ?? '';
  }
}
