// The big health bar at the top of the screen for Guardians and other named beasts, with the exhaustion notch.
import { TAMING } from '../data/rules';
import { formName } from '../systems/beasts/forms';
import type { GameState } from '../systems/game';
import { isInWater } from '../systems/beasts/wild';
import { activeGuardian } from '../systems/guardian';
import { el } from './dom';

export class BossBar {
  private readonly root: HTMLDivElement;
  private readonly name: HTMLSpanElement;
  private readonly fill: HTMLDivElement;
  private shown = '';

  constructor(parent: HTMLElement) {
    this.root = el('div', 'boss-bar', parent);
    this.name = el('span', 'boss-name', this.root);
    const track = el('div', 'boss-track', this.root);
    this.fill = el('div', 'boss-fill', track);
    el('div', 'boss-notch', track).style.left = `${TAMING.exhaustionThresholdFraction * 100}%`;
  }

  update(g: GameState): void {
    const w = activeGuardian(g) ?? g.beasts.wilds.find((x) => x.boss && isInWater(x) && x.mood !== 'fleeing');
    const key = w ? `${Math.round((w.hp / w.maxHp) * 200)}|${w.mood}` : '';
    if (key === this.shown) return;
    this.shown = key;
    this.root.classList.toggle('show', !!w);
    if (!w) return;
    this.name.textContent = `${formName(w.form)} · ${w.boss ?? ''} · liv. ${w.level}`;
    this.fill.style.width = `${Math.max(0, (w.hp / w.maxHp) * 100)}%`;
    this.root.classList.toggle('tired', w.mood === 'tired' || w.mood === 'taming');
  }
}
