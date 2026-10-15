// The drone is back: its report pops up at once (owner, 15 ottobre 2026: "uno che non sa dove trovarlo diventa
// scemo"), the same cards as the cockpit's Drone tab, so you can pick the beast to follow there and then. Closed with
// its X or a tap outside; the report stays in the cockpit while it is fresh (RECON.reportSeconds).
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { el } from './dom';
import { ICONS } from './icons';
import { renderReconTab } from './reconPanel';

export function openReconPopup(g: GameState, session: Session, say: (t: string) => void): void {
  const host = document.getElementById('ui') ?? document.body;
  host.querySelector('.recon-popup')?.remove();
  const root = el('div', 'diary-sheet recon-popup', host);
  const card = el('div', 'diary-sheet-card', root);
  root.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); // not a tap on the sea's controls under it
    if (e.target === root) root.remove();
  });
  const head = el('div', 'diary-sheet-head', card);
  el('h3', '', head, 'Il drone è tornato');
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.addEventListener('click', () => root.remove());
  renderReconTab(card, g, session, say);
}
