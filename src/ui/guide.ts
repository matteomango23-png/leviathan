// The Guida (pause menu): every tip of Aurelio's, to read again whenever you like, and the switch that turns them off
// (owner, 16 ottobre 2026: a tutorial that explains the ship, the hunts, how to find a beast). systems/tips.ts.
import { COACH, coachSeen, type CoachRound } from '../data/coach';
import { DIALOGUES, TIPS } from '../data/story';
import type { GameState } from '../systems/game';
import { setTipsOn, tipsOn } from '../systems/tips';
import { el } from './dom';

const COACH_ROUNDS = Object.keys(COACH) as CoachRound[];

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
  // the step-by-step tutorial again (data/coach.ts): each round comes back the next time its place is
  const again = el('button', 'menu-btn small guide-toggle', card, 'Rivedi il tutorial passo passo');
  again.addEventListener('click', () => {
    g.story.seen = g.story.seen.filter((x) => !COACH_ROUNDS.some((r) => x === coachSeen(r)));
    again.textContent = 'Lo rivedi appena torni in acqua, al porto, al timone e nel cockpit';
    again.disabled = true;
  });
  const list = el('div', 'guide-list', card);
  for (const t of TIPS) {
    const item = el('div', `guide-item${g.story.seen.includes(t.id) ? ' read' : ''}`, list);
    el('h3', '', item, t.title);
    for (const line of DIALOGUES[t.id]) el('p', '', item, line.text);
  }
}
