// Sleeping (lot N1, systems/sleep.ts): first the choice, "Fino a sera" or "Fino al mattino"; then, while the time
// runs fast, the sea stays on screen under a light veil with the clock turning and a big "Svegliati" to stop it
// whenever you like (owner, 13 novembre 2026: "che puoi stoppare in qualsiasi momento, ovviamente").
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { clockText } from '../systems/dayNight';
import { el } from './dom';

export class SleepOverlay {
  private readonly choose: HTMLElement;
  private readonly veil: HTMLElement;
  private readonly clock: HTMLElement;
  private shownClock = '';

  constructor(
    private readonly parent: HTMLElement,
    private readonly session: Session,
  ) {
    this.choose = el('div', 'menu sleep-choose', parent);
    this.choose.hidden = true;
    const panel = el('div', 'menu-panel', this.choose);
    el('h2', '', panel, 'Dormi');
    el('p', '', panel, 'Ti sdrai e il tempo scorre veloce. Puoi svegliarti quando vuoi.');
    const pick = (label: string, cmd: 'sera' | 'mattino', primary = false): void => {
      const b = el('button', `menu-btn${primary ? ' primary' : ''}`, panel, label);
      b.addEventListener('click', () => {
        this.session.input.sleepCmd = cmd;
        this.choose.hidden = true;
      });
    };
    pick('Fino a sera', 'sera', true);
    pick('Fino al mattino', 'mattino');
    const no = el('button', 'menu-btn', panel, 'Annulla');
    no.addEventListener('click', () => (this.choose.hidden = true));

    this.veil = el('div', 'sleep-veil', parent);
    this.veil.hidden = true;
    this.clock = el('div', 'sleep-clock', this.veil);
    const wake = el('button', 'menu-btn primary sleep-wake', this.veil, 'Svegliati');
    wake.addEventListener('click', () => (this.session.input.sleepCmd = 'wake'));
  }

  /** The "Dormi" button: the choice of until when. */
  open(): void {
    this.choose.hidden = false;
  }

  update(g: GameState): void {
    const asleep = !!g.day.sleeping;
    this.veil.hidden = !asleep;
    this.parent.classList.toggle('sleeping', asleep);
    if (asleep) this.choose.hidden = true;
    const text = asleep ? clockText(g.day) : '';
    if (text !== this.shownClock) {
      this.shownClock = text;
      this.clock.textContent = text;
    }
  }
}
