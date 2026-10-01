// The dodge (owner's decision of 1 ottobre 2026): when the wild beast attacks, a big SCHIVA button appears
// with a bar; a marker runs along it and you tap when it is inside the narrow bright zone. It sometimes stops
// for a moment (a feint). The first time a short explanation comes first. Timing rules: systems/battle/dodge.
import { BATTLE } from '../data/battle';
import { BATTLE_TEXT } from '../data/battleText';
import type { DodgeRing } from '../systems/battle/dodge';
import { ringEnd } from '../systems/battle/dodge';
import { el } from './dom';

const ZONE_AT = 0.78; // where the zone sits along the bar (0..1)
const TUTORIAL_KEY = 'leviatano-schiva-spiegata';

function seenTutorial(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return true;
  }
}

function markTutorial(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // no storage: it will explain again next time, no harm
  }
}

export class DodgeBar {
  private readonly root: HTMLDivElement;
  private readonly tip: HTMLDivElement;
  private readonly marker: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly graze: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'bdodge', parent);
    this.tip = el('div', 'bdodge-tip', this.root, BATTLE_TEXT.dodgeTutorial);
    const bar = el('div', 'bdodge-bar', this.root);
    this.graze = el('div', 'bdodge-graze', bar);
    this.zone = el('div', 'bdodge-zone', bar);
    this.marker = el('div', 'bdodge-marker', bar);
    el('button', 'bdodge-btn', this.root, BATTLE_TEXT.dodgeButton);
  }

  /** Shows the bar for one attack; resolves with the time of the tap (seconds from the start), or null. */
  async run(r: DodgeRing): Promise<number | null> {
    const travel = r.closeAt - r.pauseFor;
    const frac = (s: number): number => (ZONE_AT * s) / travel;
    const { perfectSeconds, grazeSeconds } = BATTLE.dodge;
    this.zone.style.left = `${(ZONE_AT - frac(perfectSeconds)) * 100}%`;
    this.zone.style.width = `${frac(perfectSeconds * 2) * 100}%`;
    this.graze.style.left = `${(ZONE_AT - frac(grazeSeconds)) * 100}%`;
    this.graze.style.width = `${frac(grazeSeconds * 2) * 100}%`;
    this.root.classList.add('show');
    const first = !seenTutorial();
    this.tip.hidden = !first;
    if (first) {
      markTutorial();
      await new Promise((ok) => window.setTimeout(ok, 3200));
    }
    return new Promise((done) => {
      const start = performance.now();
      let tapped: number | null = null;
      const onTap = (e: Event): void => {
        if (e instanceof KeyboardEvent && ![' ', 'enter'].includes(e.key.toLowerCase())) return;
        e.preventDefault();
        e.stopPropagation();
        if (tapped === null) tapped = (performance.now() - start) / 1000;
      };
      window.addEventListener('pointerdown', onTap, true);
      window.addEventListener('keydown', onTap, true);
      const frame = (): void => {
        const t = (performance.now() - start) / 1000;
        const moving = t < r.pauseFrom ? t : t < r.pauseFrom + r.pauseFor ? r.pauseFrom : t - r.pauseFor;
        this.marker.style.left = `${Math.min(1, (ZONE_AT * moving) / travel) * 100}%`;
        if (tapped === null && t < ringEnd(r)) {
          requestAnimationFrame(frame);
          return;
        }
        window.removeEventListener('pointerdown', onTap, true);
        window.removeEventListener('keydown', onTap, true);
        this.root.classList.remove('show');
        done(tapped);
      };
      requestAnimationFrame(frame);
    });
  }
}
