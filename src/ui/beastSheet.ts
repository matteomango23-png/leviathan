// The beast card sheet: the illustration whole on the left (framed in the rarity colour),
// name, stars, type, role, level, stats and the three moves on the right.
import { SPECIAL_FRAMES } from '../data/cards';
import { buildSheet } from '../systems/beasts/sheet';
import type { BeastForm } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import { growthBars } from './growthBars';
import { el } from './dom';
import { ICONS, icon } from './icons';
import { setArt } from './art';

export interface SheetExtra {
  hp?: number;
  ko?: boolean;
  count?: number; // how many of this form you own
  /** A tamed beast: shows its experience and nourishment bars. */
  beast?: TeamBeast;
}

/** Opens a sheet over everything; returns a function that closes it. */
export function openBeastSheet(
  parent: HTMLElement,
  form: BeastForm,
  level?: number,
  extra: SheetExtra = {},
): () => void {
  const s = buildSheet(form, level);
  const root = el('div', 'sheet', parent);
  const card = el('div', 'sheet-card', root);
  card.style.setProperty('--rarity', s.rarityColor);
  if (s.special) {
    card.classList.add(`special-${s.special}`);
    card.style.setProperty('--special', SPECIAL_FRAMES[s.special].glow);
  }
  const close = (): void => root.remove();
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });

  const art = el('div', 'sheet-art', card);
  const img = el('img', '', art);
  setArt(img, form);
  img.alt = s.name;
  const banner = el('div', 'sheet-banner', art);
  el('span', 'sheet-stars', banner).innerHTML = ICONS.star.repeat(s.stars);
  el(
    'span',
    'sheet-rarity',
    banner,
    s.special ? `${s.rarityName} · ${SPECIAL_FRAMES[s.special].label}` : s.rarityName,
  );

  const info = el('div', 'sheet-info', card);
  const head = el('div', 'sheet-head', info);
  el('h2', '', head, s.name);
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.setAttribute('aria-label', 'Chiudi');
  x.addEventListener('click', close);

  const tags = el('div', 'sheet-tags', info);
  const type = el('span', 'tag', tags, s.typeName);
  type.style.borderColor = s.typeColor;
  type.style.color = s.typeColor;
  el('span', 'tag', tags, s.roleName);
  el('span', 'tag', tags, s.levelLabel);
  if (extra.count && extra.count > 1) el('span', 'tag', tags, `×${extra.count}`);
  if (extra.beast) growthBars(info, extra.beast);
  if (s.evolution.length) {
    // the line, like a Pokédex: Zanna → Squarcio (Lv 16) → Zannarossa (Lv 36), the current stage lit
    const evo = el('div', 'sheet-evo', info);
    s.evolution.forEach((st, i) => {
      if (i) el('span', 'evo-arrow', evo, '→');
      const step = el('span', `evo-step${st.current ? ' current' : ''}`, evo, st.name);
      if (st.level) el('span', 'evo-level', step, ` Lv ${st.level}`);
    });
  }

  const stats = el('div', 'sheet-stats', info);
  const stat = (label: string, value: string, iconName?: Parameters<typeof icon>[0]): void => {
    const r = el('div', 'stat', stats);
    if (iconName) r.append(icon(iconName));
    el('span', 'stat-label', r, label);
    el('span', 'stat-value', r, value);
  };
  stat(
    'Vita',
    extra.hp !== undefined
      ? `${Math.ceil(extra.hp)} / ${s.stats.hp}${extra.ko ? ' (KO)' : ''}`
      : String(s.stats.hp),
    'heart',
  );
  stat('Morso', String(s.stats.bite), 'tooth');
  stat('Carica', String(s.stats.charge), 'bolt');
  stat('Difesa', `${Math.round(s.stats.defense * 100)}%`, 'shield');
  stat('Velocità', String(s.stats.speed), 'dive');
  stat('Lunghezza', `${s.lengthM.toString().replace('.', ',')} m`, 'fish');

  el('h3', '', info, 'Mosse');
  for (const m of s.moves) {
    const row = el('div', `sheet-move${m.unlocked ? '' : ' locked'}`, info);
    const top = el('div', 'move-top', row);
    if (!m.unlocked) top.append(icon('lock'));
    el('span', 'move-name', top, m.name);
    const t = el('span', 'tag small', top, m.typeName);
    t.style.color = m.typeColor;
    t.style.borderColor = m.typeColor;
    el('span', 'move-meta', top, m.unlocked ? `ricarica ${m.cooldown} s` : `livello ${m.unlockLevel}`);
    el(
      'div',
      'move-text',
      row,
      m.damageNow > 0 ? `${m.text} · danno ${m.damageNow} → ${m.damageNext} al prossimo livello` : m.text,
    );
  }
  if (s.fieldMove) {
    // the move used in the sea, not in battle: it breaks ancient bones
    const f = s.fieldMove;
    const row = el('div', `sheet-move${f.unlocked ? '' : ' locked'}`, info);
    const top = el('div', 'move-top', row);
    if (!f.unlocked) top.append(icon('lock'));
    el('span', 'move-name', top, f.name);
    el('span', 'tag small', top, 'Nel mare');
    el('span', 'move-meta', top, f.unlocked ? 'pronta' : `livello ${f.level}`);
    el('div', 'move-text', row, 'Rompe le ossa antiche: chiamala vicino alle ossa e premi Sfonda.');
  }
  el('h3', '', info, 'Habitat e carattere');
  el('p', '', info, `${s.habitat}. ${s.trait}.`);
  return close;
}
