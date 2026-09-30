// Experience and nourishment bars of a tamed beast (team list and card sheet).
import { PROGRESSION } from '../data/rules';
import { needsFood, xpToNext } from '../systems/beasts/growth';
import type { TeamBeast } from '../systems/beasts/team';
import { el } from './dom';

function bar(parent: HTMLElement, cls: string, label: string, value: number, max: number): void {
  const row = el('div', `gbar ${cls}`, parent);
  el('span', 'gbar-label', row, label);
  const track = el('div', 'gbar-track', row);
  el('div', 'gbar-fill', track).style.width = `${Math.min(100, (value / Math.max(1, max)) * 100)}%`;
  el('span', 'gbar-value', row, `${Math.floor(value)}/${max}`);
}

export function growthBars(parent: HTMLElement, b: TeamBeast): void {
  const box = el('div', 'gbars', parent);
  if (b.level >= PROGRESSION.maxLevel) {
    el('span', 'gbar-label', box, 'Livello massimo');
    return;
  }
  bar(box, 'xp', 'Esp.', b.xp, xpToNext(b));
  if (needsFood(b)) bar(box, 'food', 'Cibo', b.food, PROGRESSION.nourishmentPerGrowthLevel);
}
