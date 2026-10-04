// The hunting diary (cockpit of the ship, and the board of every harbour): each rumour heard, with its region and
// its weather, and the steps done (rumour, anomalous echo, traces, the beast). Owner, 4 ottobre 2026: the hunt
// must be clear and traceable.
import { CONDITION_TEXT, HUNTS } from '../data/hunts';
import type { GameState } from '../systems/game';
import { huntOpen, huntRegionName } from '../systems/hunts';
import { el } from './dom';
import { portCard } from './portCard';

export function renderDiary(b: HTMLElement, g: GameState): void {
  const heard = HUNTS.filter((h) => g.hunts[h.id]?.heard);
  el(
    'p',
    'port-hint',
    b,
    heard.length
      ? 'Ogni voce si segue in quattro passi: la voce, l’eco anomala col sonar della nave (vicino, col tempo giusto), le tracce sott’acqua, poi la bestia.'
      : 'Nessuna voce ancora. Ascoltale nei porti e negli avamposti: ognuno parla dei suoi mari.',
  );
  const grid = el('div', 'pcard-grid', b);
  for (const h of heard) {
    const p = g.hunts[h.id]!;
    const open = huntOpen(h, g.beasts.gone, g.beasts.team);
    const tamed = h.form.unique && g.beasts.team.some((t) => t.form.unique === h.form.unique);
    const step = (done: boolean | undefined, text: string): string => `${done ? '✓' : '○'} ${text}`;
    portCard(grid, {
      icon: 'scroll',
      title: h.name,
      badge: !open ? (tamed ? 'catturata' : 'sconfitta') : undefined,
      state: !open ? 'owned' : '',
      text: [
        `${huntRegionName(h)}, ${CONDITION_TEXT[h.condition]}.`,
        step(true, `Voce: ${h.rumour}`),
        step(p.echo, 'Eco anomala col sonar della nave'),
        step(p.traces, p.traces ? `Tracce: ${h.traces}` : 'Tracce sott’acqua vicino alla tana'),
      ].join('\n'),
    });
  }
  const left = HUNTS.length - heard.length;
  if (left > 0) el('p', 'port-hint', b, `Altre ${left} voci da scoprire, più lontano.`);
}
