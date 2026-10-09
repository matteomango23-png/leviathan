// The compass toward the beast you follow (part 4d, owner 9 ottobre 2026): picked from the Ocean's Nightmare
// drone's report, it shows where that beast is from you (swimming, in the submarine or the drone, at the helm): an
// arrow, its name, how far. The × puts it away.
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { compassTo } from '../systems/tracking';
import { el } from './dom';
import './gadgets.css';

export class Compass {
  private readonly root: HTMLDivElement;
  private readonly arrow: HTMLDivElement;
  private readonly text: HTMLDivElement;
  private shown = '';

  constructor(parent: HTMLElement, session: Session) {
    this.root = el('div', 'compass', parent);
    this.arrow = el('div', 'compass-arrow', this.root, '➤');
    this.text = el('div', 'compass-text', this.root);
    const close = el('button', 'compass-close', this.root, '×');
    close.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      session.input.clearTarget = true;
    });
    this.root.hidden = true;
  }

  update(g: GameState): void {
    const from = g.sub.aboard ? g.sub : g.diver;
    const c = compassTo(g, g.gadgets.target, from);
    this.root.hidden = !c;
    if (!c) return;
    this.arrow.style.transform = `rotate(${Math.atan2(c.dyM, c.dxM)}rad)`;
    this.arrow.classList.toggle('here', c.here);
    const deep =
      c.dyM > 3 ? ` · ${Math.round(c.dyM)} m più giù` : c.dyM < -3 ? ` · ${Math.round(-c.dyM)} m più su` : '';
    const text = c.here
      ? `${g.gadgets.targetName}: è qui`
      : `${g.gadgets.targetName} · ${Math.round(c.distM)} m${deep}`;
    if (text !== this.shown) this.text.textContent = this.shown = text;
  }
}
