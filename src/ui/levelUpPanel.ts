// Pokémon's level-up panel: first how much each statistic went up (+3), then, with a tap, the new values.
import { STAT_IDS, STAT_NAMES, type Stats } from '../data/stats';
import { el } from './dom';
import './screens.css';

/** Shows the panel; resolves after the second tap. */
export function levelUpPanel(parent: HTMLElement, title: string, before: Stats, after: Stats): Promise<void> {
  return new Promise((done) => {
    const root = el('div', 'mscreen lvpanel', parent);
    const card = el('div', 'mscreen-card lvpanel-card', root);
    el('h2', 'mscreen-title', card, title);
    const rows = STAT_IDS.map((id) => {
      const r = el('div', 'lvrow', card);
      el('span', 'lvrow-name', r, STAT_NAMES[id]);
      return el('span', 'lvrow-value', r, `+${after[id] - before[id]}`);
    });
    const hint = el('p', 'lvpanel-hint', card, 'Tocca per continuare');
    let step = 0;
    root.addEventListener('click', () => {
      if (step++ === 0) {
        STAT_IDS.forEach((id, i) => (rows[i]!.textContent = String(after[id])));
        hint.textContent = 'Tocca per chiudere';
        return;
      }
      root.remove();
      done();
    });
  });
}
