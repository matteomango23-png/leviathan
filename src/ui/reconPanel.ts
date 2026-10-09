// The Ocean's Nightmare drone's report, in its own cockpit tab "Drone" (owner, 9 ottobre 2026): the beasts it found,
// one card each (name, size, level when known, depth, how far and which side). A tap picks it: the compass shows it
// from then on; "Invia sfera" at the helm (with the sphere's bay open) sends the sphere to hold it.
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { el } from './dom';
import './gadgets.css';

export function renderReconTab(
  body: HTMLElement,
  g: GameState,
  session: Session,
  say: (t: string) => void,
): void {
  const box = el('div', 'recon', body);
  el('div', 'recon-title', box, 'Resoconto del drone');
  const report = g.gadgets.recon.report;
  const out = g.gadgets.recon.phase !== 'idle';
  el(
    'div',
    'recon-note',
    box,
    out
      ? 'Il drone è in ricognizione: il resoconto arriva quando torna.'
      : report
        ? 'Scegli un animale: la bussola ti porta da lui. Con il vano della sfera aperto, "Invia sfera" lo blocca per un minuto.'
        : 'Nessun resoconto: al timone apri il portellone del drone e tocca "Ricognizione".',
  );
  if (!report?.length) return;
  const list = el('div', 'recon-list', box);
  const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  const cards: HTMLElement[] = [];
  report.forEach((e, i) => {
    const card = el('button', 'recon-card', list);
    cards.push(card);
    card.classList.toggle('on', !!g.gadgets.target && same(g.gadgets.target, e.target));
    el('div', 'recon-name', card, e.name);
    const size = `${Math.round(e.lengthM * 10) / 10} m${e.level !== undefined ? ` · liv. ${e.level}` : ''}`;
    el('div', 'recon-line', card, size);
    el(
      'div',
      'recon-line',
      card,
      `${e.dxM < 0 ? '◀' : '▶'} ${Math.abs(e.dxM)} m · a ${e.depthM} m di profondità`,
    );
    card.addEventListener('click', () => {
      session.input.pickTarget = i;
      for (const c of cards) c.classList.toggle('on', c === card);
      say(`Bussola su: ${e.name}`);
    });
  });
}
