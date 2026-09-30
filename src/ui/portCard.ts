// A card in the port menu: icon, title, text, a price with the tooth icon, and an action button.
import { el } from './dom';
import { icon, type IconName } from './icons';

export interface CardOptions {
  icon: IconName;
  title: string;
  text?: string;
  price?: number;
  badge?: string;
  state?: 'owned' | 'locked' | 'active' | '';
  button?: { label: string; disabled?: boolean; onClick: () => void };
  onClick?: () => void;
}

export function portCard(parent: HTMLElement, o: CardOptions): HTMLDivElement {
  const c = el('div', `pcard${o.state ? ` ${o.state}` : ''}${o.onClick ? ' tappable' : ''}`, parent);
  const ic = el('div', 'pcard-icon', c);
  ic.append(icon(o.icon));
  const body = el('div', 'pcard-body', c);
  const top = el('div', 'pcard-top', body);
  el('span', 'pcard-title', top, o.title);
  if (o.badge) el('span', 'pcard-badge', top, o.badge);
  if (o.text) el('div', 'pcard-text', body, o.text);
  const foot = el('div', 'pcard-foot', c);
  if (o.price !== undefined) {
    const p = el('span', 'price', foot);
    p.append(icon('tooth'), document.createTextNode(` ${o.price}`));
  }
  if (o.button) {
    const b = el('button', 'pbtn', foot, o.button.label);
    b.disabled = !!o.button.disabled;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      o.button!.onClick();
    });
  }
  if (o.onClick) c.addEventListener('click', o.onClick);
  return c;
}
