// The beast card sheet, like Pokémon's summary: the illustration whole on the left (framed in the rarity colour),
// name and three pages on the right (Info, Statistiche, Mosse: ui/sheetPages.ts).
import { SPECIAL_FRAMES } from '../data/cards';
import { buildSheet } from '../systems/beasts/sheet';
import type { BeastForm } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import type { GameEvent } from '../systems/events';
import { el } from './dom';
import { evolutionScreen } from './evolutionScreen';
import { ICONS } from './icons';
import { setArt } from './art';
import { infoPage, movesPage, statsPage, type PageContext } from './sheetPages';

export type SheetPage = 'info' | 'stats' | 'moves';

export interface SheetExtra {
  hp?: number;
  ko?: boolean;
  count?: number; // how many of this form you own
  /** A tamed beast: its experience, its own moves (to order, learn, remember), its evolution. */
  beast?: TeamBeast;
  /** At the port: the Ricordamosse can teach it again a move it forgot. */
  remember?: boolean;
  /** Something about the beast changed (its moves, its evolution). */
  onChange?: () => void;
  /** Where game events go (an evolution's message). */
  events?: GameEvent[];
  /** The page it opens on. */
  page?: SheetPage;
}

const PAGES: [SheetPage, string, (box: HTMLElement, c: PageContext) => void][] = [
  ['info', 'Info', infoPage],
  ['stats', 'Statistiche', statsPage],
  ['moves', 'Mosse', movesPage],
];

/** Opens a sheet over everything; returns a function that closes it. */
export function openBeastSheet(
  parent: HTMLElement,
  form: BeastForm,
  level?: number,
  extra: SheetExtra = {},
): () => void {
  const b = extra.beast;
  const s = buildSheet(b?.form ?? form, b?.level ?? level, b?.known, b?.ppUsed);
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
  setArt(img, b?.form ?? form);
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

  let page: SheetPage = extra.page ?? 'info';
  const tabs = el('div', 'sheet-tabs', info);
  const body = el('div', 'sheet-page', info);
  const ctx: PageContext = {
    parent,
    s,
    beast: b,
    hp: extra.hp,
    ko: extra.ko,
    count: extra.count,
    remember: extra.remember,
    // after a choice the sheet opens again, up to date, on the same page
    again: () => {
      close();
      extra.onChange?.();
      openBeastSheet(parent, form, level, { ...extra, page, hp: b?.hp ?? extra.hp, ko: b?.ko ?? extra.ko });
    },
  };
  if (b) ctx.evolve = () => void evolutionScreen(parent, b, extra.events ?? []).then(ctx.again);
  const show = (): void => {
    body.replaceChildren();
    for (const t of tabs.children) t.classList.toggle('on', (t as HTMLElement).dataset.page === page);
    PAGES.find(([id]) => id === page)![2](body, ctx);
  };
  for (const [id, label] of PAGES) {
    const t = el('button', 'sheet-tab', tabs, label);
    t.dataset.page = id;
    t.addEventListener('click', () => {
      page = id;
      show();
    });
  }
  show();
  return close;
}
