// A ship's numbers on its page (owner, 8 ottobre 2026): each row with its real value, a bar against the best of the
// fleet, and the difference from the ship in use, green when better and red when worse. Numbers from
// systems/ship/stats.ts.
import type { ShipModelDef } from '../data/fleet';
import { shipStats, statDiff, statShare } from '../systems/ship/stats';
import { el } from './dom';

/** @param inUse the model of the ship in use (null: none yet, nothing to compare); the same ship shows no diffs */
export function renderShipStats(parent: HTMLElement, m: ShipModelDef, inUse: ShipModelDef | null): void {
  const rows = shipStats(m);
  const theirs = inUse && inUse.id !== m.id ? shipStats(inUse) : [];
  if (theirs.length) el('div', 'stat-compare', parent, `Confronto con la tua ${inUse!.name}`);
  let group = '';
  for (const r of rows) {
    if (r.group !== group) {
      group = r.group;
      if (group !== 'Nave') el('div', 'stat-group', parent, group);
    }
    const row = el('div', 'stat-row', parent);
    el('span', 'stat-k', row, r.label);
    const v = el('div', 'stat-v', row);
    el('span', 'stat-text', v, r.text);
    if (r.better !== 'none' || r.key === 'length') {
      const bar = el('div', 'stat-bar', v);
      el('div', 'stat-fill', bar).style.width =
        `${Math.round(Math.max(0.04, Math.min(1, statShare(r))) * 100)}%`;
    }
    const d = statDiff(r, theirs);
    if (d) el('span', `stat-diff${d.good === null ? '' : d.good ? ' good' : ' bad'}`, row, d.text);
  }
}
