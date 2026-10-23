// The numbers of one tab of a ship's page (owner, 8 ottobre 2026; tabs 23 ottobre): each row with its real value, a
// bar against the best of the fleet, and the difference from what it is compared with (the ship in use, or the
// vehicle of the same kind on it), green when better and red when worse. Numbers from systems/ship/stats.ts and
// pageTabs.ts.
import { statDiff, statShare } from '../systems/ship/stats';
import type { PageTab } from '../systems/ship/pageTabs';
import { el } from './dom';

export function renderShipStats(parent: HTMLElement, tab: PageTab): void {
  parent.replaceChildren();
  if (tab.compareName && tab.compare.length)
    el('div', 'stat-compare', parent, `Confronto con: ${tab.compareName}`);
  if (!tab.rows.length) el('div', 'stat-compare', parent, 'Nessun dato da confrontare.');
  for (const r of tab.rows) {
    const row = el('div', 'stat-row', parent);
    el('span', 'stat-k', row, r.label);
    const v = el('div', 'stat-v', row);
    el('span', 'stat-text', v, r.text);
    if (r.better !== 'none' || r.key === 'length') {
      const bar = el('div', 'stat-bar', v);
      el('div', 'stat-fill', bar).style.width =
        `${Math.round(Math.max(0.04, Math.min(1, statShare(r))) * 100)}%`;
    }
    const d = statDiff(r, tab.compare);
    if (d) el('span', `stat-diff${d.good === null ? '' : d.good ? ' good' : ' bad'}`, row, d.text);
  }
}
