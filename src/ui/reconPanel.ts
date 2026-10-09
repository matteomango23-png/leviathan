// The Ocean's Nightmare drone's report (part 4d, owner 9 ottobre 2026): the beasts it found, one card each (name,
// size, level when known, depth, how far and which side). A tap picks it: the compass follows it and the sphere goes
// to hold it. The sea goes on meanwhile.
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { el } from './dom';

export class ReconPanel {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
  ) {
    this.root = el('div', 'recon', parent);
    const head = el('div', 'recon-head', this.root);
    el('div', 'recon-title', head, 'Resoconto del drone');
    const close = el('button', 'recon-close', head, '×');
    close.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });
    el('div', 'recon-note', this.root, 'Scegli un animale: la bussola lo segue e la sfera va a bloccarlo.');
    this.list = el('div', 'recon-list', this.root);
    this.root.hidden = true;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(g: GameState): void {
    const report = g.gadgets.recon.report ?? [];
    this.list.replaceChildren();
    report.forEach((e, i) => {
      const card = el('button', 'recon-card', this.list);
      if (g.gadgets.target && JSON.stringify(g.gadgets.target) === JSON.stringify(e.target))
        card.classList.add('on');
      el('div', 'recon-name', card, e.name);
      const size = `${Math.round(e.lengthM * 10) / 10} m${e.level !== undefined ? ` · liv. ${e.level}` : ''}`;
      el('div', 'recon-line', card, size);
      el(
        'div',
        'recon-line',
        card,
        `${e.dxM < 0 ? '◀' : '▶'} ${Math.abs(e.dxM)} m · a ${e.depthM} m di profondità`,
      );
      card.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.session.input.pickTarget = i;
        this.close();
      });
    });
    if (!report.length) el('div', 'recon-note', this.list, 'Nessun animale nel resoconto.');
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
  }
}
