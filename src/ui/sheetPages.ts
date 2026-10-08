// The three pages of a beast's sheet, like Pokémon's summary: Info (type, level, experience, where you met it, its
// line, habitat), Statistiche (the six statistics with bars) and Mosse (the 4 battle moves with their details, in
// an order you choose, the next ones, the Ricordamosse; then the moves of the open sea).
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { STATUS_NAMES } from '../data/moveBattle';
import { PROGRESSION } from '../data/rules';
import { STAT_IDS, STAT_NAMES } from '../data/stats';
import { swapMoves } from '../systems/beasts/battleMoves';
import { totalXp, xpToNext } from '../systems/beasts/growth';
import type { Sheet } from '../systems/beasts/sheet';
import type { TeamBeast } from '../systems/beasts/team';
import { el } from './dom';
import { growthBars } from './growthBars';
import { icon } from './icons';
import { learnScreen, moveDetail, rememberScreen } from './movePanel';

export interface PageContext {
  parent: HTMLElement;
  s: Sheet;
  beast?: TeamBeast;
  hp?: number;
  ko?: boolean;
  count?: number;
  remember?: boolean;
  /** Something changed: the sheet opens again on the same page. */
  again: () => void;
  /** Opens the evolution screen (a team beast ready to evolve). */
  evolve?: () => void;
}

function line(box: HTMLElement, label: string, value: string): void {
  const r = el('div', 'sinfo-row', box);
  el('span', 'sinfo-label', r, label);
  el('span', 'sinfo-value', r, value);
}

export function infoPage(box: HTMLElement, c: PageContext): void {
  const { s, beast: b } = c;
  const tags = el('div', 'sheet-tags', box);
  const type = el('span', 'tag', tags, s.typeName);
  type.style.borderColor = s.typeColor;
  type.style.color = s.typeColor;
  el('span', 'tag', tags, s.roleName);
  el('span', 'tag', tags, s.levelLabel);
  if (c.count && c.count > 1) el('span', 'tag', tags, `×${c.count}`);
  if (b?.status) el('span', `tag status-${b.status}`, tags, STATUS_NAMES[b.status]);
  if (b) {
    growthBars(box, b);
    const list = el('div', 'sinfo', box);
    line(list, 'Punti esperienza', String(totalXp(b)));
    if (b.level < PROGRESSION.maxLevel)
      line(list, 'Al prossimo livello', String(Math.max(0, xpToNext(b) - Math.floor(b.xp))));
    if (b.met) line(list, 'Incontrata', `${b.met.place}, Lv. ${b.met.level}`);
  }
  if (b?.evolveReady && c.evolve) {
    const next = s.evolution.find((_st, i) => i > 0 && s.evolution[i - 1]!.current);
    el('button', 'menu-btn sheet-learn', box, `Evolvi${next ? ` in ${next.name}` : ''}`).addEventListener(
      'click',
      c.evolve,
    );
  }
  if (s.evolution.length) {
    // the line, like a Pokédex: Zanna → Squarcio (Lv 16) → Zannarossa (Lv 36), the current stage lit
    const evo = el('div', 'sheet-evo', box);
    s.evolution.forEach((st, i) => {
      if (i) el('span', 'evo-arrow', evo, '→');
      const step = el('span', `evo-step${st.current ? ' current' : ''}`, evo, st.name);
      if (st.level) el('span', 'evo-level', step, ` Lv ${st.level}`);
    });
  }
  const list = el('div', 'sinfo', box);
  line(list, 'Lunghezza', `${s.lengthM.toString().replace('.', ',')} m`);
  line(list, 'Habitat', s.habitat);
  line(list, 'Profondità', s.depth);
  line(list, 'Mare aperto', s.seas);
  line(list, 'Pericolo', s.danger);
  el('p', '', box, `${s.trait}.`);
}

export function statsPage(box: HTMLElement, c: PageContext): void {
  const { s } = c;
  const top = Math.max(...STAT_IDS.map((id) => s.stats[id]));
  for (const id of STAT_IDS) {
    const r = el('div', 'sstat', box);
    el('span', 'sstat-label', r, STAT_NAMES[id]);
    const value =
      id === 'hp' && c.hp !== undefined
        ? `${Math.ceil(c.hp)}/${s.stats.hp}${c.ko ? ' KO' : ''}`
        : String(s.stats[id]);
    el('span', 'sstat-value', r, value);
    const track = el('div', 'sstat-track', r);
    const fill = el('div', `sstat-fill ${id}`, track);
    fill.style.width = `${(s.stats[id] / top) * 100}%`;
  }
  el(
    'p',
    '',
    box,
    'Le statistiche crescono a ogni livello. Ogni esemplare ha i suoi valori: due bestie della stessa specie non sono uguali.',
  );
}

export function movesPage(box: HTMLElement, c: PageContext): void {
  const { s, beast: b, parent } = c;
  if (b) {
    for (const id of b.pendingMoves ?? [])
      el(
        'button',
        'menu-btn sheet-learn',
        box,
        `Nuova mossa: ${BATTLE_MOVE_BY_ID[id]?.name ?? id} · scegli`,
      ).addEventListener('click', () => learnScreen(parent, b, id, c.again));
    if (c.remember)
      el('button', 'menu-btn sheet-learn', box, 'Ricordamosse').addEventListener('click', () =>
        rememberScreen(parent, b, c.again),
      );
  }
  const ids = b?.known;
  s.moves.forEach((m, i) => {
    const row = el('div', 'smove', box);
    row.style.setProperty('--tc', m.typeColor);
    const top = el('div', 'smove-top', row);
    el('span', 'move-name', top, m.name);
    el('span', 'move-meta', top, `${m.typeName} · PP ${m.pp}/${m.maxPp}`);
    if (b && ids && ids.length > 1) {
      // like Pokémon: the order of the moves is yours
      const up = el('button', 'menu-btn small', top, '▲');
      up.disabled = i === 0;
      up.addEventListener('click', (e) => {
        e.stopPropagation();
        if (swapMoves(b, i, i - 1)) c.again();
      });
      const down = el('button', 'menu-btn small', top, '▼');
      down.disabled = i === ids.length - 1;
      down.addEventListener('click', (e) => {
        e.stopPropagation();
        if (swapMoves(b, i, i + 1)) c.again();
      });
    }
    // tap a move for all of its details
    const def = ids ? BATTLE_MOVE_BY_ID[m.id] : undefined; // by its id (8 ottobre: never another row's move)
    let open: HTMLElement | null = null;
    row.addEventListener('click', () => {
      if (open) {
        open.remove();
        open = null;
        return;
      }
      if (def) open = moveDetail(row, def, { left: m.pp, max: m.maxPp });
      else
        el(
          'div',
          'move-text',
          row,
          `${m.text} · ${m.category} · potenza ${m.power || '—'} · precisione ${m.accuracy ?? '—'}`,
        );
    });
  });
  if (s.nextMoves.length) {
    const row = el('div', 'sheet-move locked', box);
    const top = el('div', 'move-top', row);
    top.append(icon('lock'));
    el('span', 'move-name', top, 'Prossime mosse');
    const next = el('div', 'move-text', row);
    s.nextMoves.forEach((m, i) => {
      if (i) next.append(' · ');
      el('span', '', next, `${m.name} (Lv. ${m.level})`);
    });
  }
  el('h3', '', box, 'Mosse in mare');
  for (const m of s.seaMoves) {
    const row = el('div', `sheet-move${m.unlocked ? '' : ' locked'}`, box);
    const top = el('div', 'move-top', row);
    if (!m.unlocked) top.append(icon('lock'));
    el('span', 'move-name', top, m.name);
    el('span', 'move-meta', top, m.unlocked ? 'quando la cavalchi' : `livello ${m.unlockLevel}`);
    el('div', 'move-text', row, m.text);
  }
  if (s.fieldMove) {
    // the move used in the sea, not in battle: it breaks ancient bones
    const f = s.fieldMove;
    const row = el('div', `sheet-move${f.unlocked ? '' : ' locked'}`, box);
    const top = el('div', 'move-top', row);
    if (!f.unlocked) top.append(icon('lock'));
    el('span', 'move-name', top, f.name);
    el('span', 'tag small', top, 'Nel mare');
    el('span', 'move-meta', top, f.unlocked ? 'pronta' : `livello ${f.level}`);
    el('div', 'move-text', row, 'Rompe le ossa antiche: chiamala vicino alle ossa e premi Sfonda.');
  }
}
