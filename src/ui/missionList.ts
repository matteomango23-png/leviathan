// The missions you accepted, out at sea (owner, 15 ottobre 2026: "le missioni che accetti al porto, dove le vedo poi?
// Cockpit non c'è nulla"): in the cockpit's Diary and in the pause menu, with how far you are. Rewards are claimed at
// a harbour's board.
import { goalCount, isComplete, missionById } from '../systems/economy/missions';
import type { GearState } from '../systems/economy/gear';
import { el } from './dom';

export function renderMissions(b: HTMLElement, gear: GearState): void {
  el('h3', 'diary-section', b, 'Missioni in corso');
  if (!gear.missions.active.length) {
    el('p', 'port-hint', b, 'Nessuna: le accetti alla bacheca di un porto.');
    return;
  }
  const list = el('div', 'mission-list', b);
  for (const id of gear.missions.active) {
    const m = missionById(id);
    if (!m) continue;
    const total = goalCount(m);
    const p = Math.min(gear.missions.progress[id] ?? 0, total);
    const done = isComplete(gear, id);
    const row = el('div', `mission-row${done ? ' done' : ''}`, list);
    const top = el('div', 'mission-top', row);
    el('span', 'mission-title', top, m.title);
    el('span', 'mission-count', top, done ? 'compiuta: riscuoti al porto' : `${p} / ${total}`);
    el('div', 'mission-text', row, m.text);
    const bar = el('div', 'pcard-progress', row);
    el('div', 'pcard-progress-fill', bar).style.width = `${(p / total) * 100}%`;
  }
}
