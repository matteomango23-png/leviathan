// The hunting diary's sightings (block 5a, owner 9 ottobre 2026: "help to understand what you are looking for"):
// one small card per species the sonar has analysed, with what you found out so far: where you heard it, how deep,
// how big, its type; its name once you have seen it close. It only shows what you discovered (systems/sonarNotes.ts).
import { speciesById } from '../data/species';
import type { GameState } from '../systems/game';
import { el } from './dom';

export function renderSonarNotes(b: HTMLElement, g: GameState): void {
  const ids = Object.keys(g.sonarNotes);
  el('h3', 'diary-section', b, 'Avvistamenti col sonar');
  if (!ids.length) {
    el(
      'p',
      'port-hint',
      b,
      'Nessuno ancora. Nel Sonar tocca un’eco e resta lento: l’analisi ti dice cos’è, o ti dà degli indizi se non l’hai mai vista.',
    );
    return;
  }
  const grid = el('div', 'diary-grid', b);
  for (const id of ids) {
    const n = g.sonarNotes[id]!;
    const seen = g.seen.has(id);
    const caught = g.beasts.team.some((t) => t.form.speciesId === id);
    const c = el('div', 'diary-card sonar-note', grid);
    const top = el('div', 'diary-card-top', c);
    el(
      'span',
      'diary-card-name',
      top,
      seen ? (speciesById(id)?.name ?? id) : `Bestia sconosciuta (${n.type})`,
    );
    if (caught) el('span', 'diary-badge', top, 'catturata');
    else if (seen) el('span', 'diary-badge', top, 'vista');
    el('div', 'diary-card-where', c, n.places.join(' · '));
    const depth = n.minM === n.maxM ? `a ${n.minM} m` : `da ${n.minM} a ${n.maxM} m`;
    el('div', 'diary-card-where', c, `${depth} · eco ${n.cls}${seen ? ` · ${n.type}` : ''}`);
  }
}
