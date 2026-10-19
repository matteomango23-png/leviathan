// The Guida (pause menu): every tip of Aurelio's, to read again whenever you like, and the switch that turns them off
// (owner, 16 ottobre 2026: a tutorial that explains the ship, the hunts, how to find a beast). systems/tips.ts.
import { DIALOGUES, TIPS } from '../data/story';
import type { GameState } from '../systems/game';
import { setTipsOn, tipsOn } from '../systems/tips';
import { el } from './dom';

export function openGuide(parent: HTMLElement, g: GameState): void {
  const root = el('div', 'mscreen', parent);
  const card = el('div', 'mscreen-card guide', root);
  const head = el('div', 'bag-head', card);
  el('h2', 'mscreen-title', head, 'Guida');
  el('button', 'menu-btn small', head, 'Chiudi').addEventListener('click', () => root.remove());
  const toggle = el('button', 'menu-btn small guide-toggle', card);
  const label = (): string => `Consigli di Aurelio durante il gioco: ${tipsOn(g.story) ? 'sì' : 'no'}`;
  toggle.textContent = label();
  toggle.addEventListener('click', () => {
    setTipsOn(g.story, !tipsOn(g.story));
    toggle.textContent = label();
  });
  const list = el('div', 'guide-list', card);
  for (const t of TIPS) {
    const item = el('div', `guide-item${g.story.seen.includes(t.id) ? ' read' : ''}`, list);
    el('h3', '', item, t.title);
    for (const line of DIALOGUES[t.id]) el('p', '', item, line.text);
  }
}
