// The bestiary (like a Pokédex): every beast, swarm and fish. Unknown ones are silhouettes,
// seen ones are in shadow, tamed ones are in colour. Tap a beast to open its sheet.
import { RARITY } from '../data/cards';
import { GAME_SPECIES } from '../data/species';
import { FISH, SWARMS } from '../data/world';
import { formKey, formName, formStars, type BeastForm } from '../systems/beasts/forms';
import { ART_KEYS } from '../data/sprites.generated';
import type { GameState } from '../systems/game';
import { openBeastSheet } from './beastSheet';
import { el } from './dom';
import { ICONS, icon } from './icons';
import { setArt } from './art';
import { LEGEND_GIANTS, LEGENDS } from '../systems/beasts/legends';

export function openBestiary(parent: HTMLElement, g: GameState): () => void {
  const root = el('div', 'sheet bestiary', parent);
  const panel = el('div', 'bestiary-panel', root);
  const close = (): void => root.remove();
  const head = el('div', 'sheet-head', panel);
  const title = el('h2', '', head);
  title.append(icon('book'), document.createTextNode(' Bestiario'));
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.addEventListener('click', close);

  const team = g.beasts.team;
  const tamedCount = (id: string) => team.filter((b) => b.form.speciesId === id).length;
  const seenBeasts = GAME_SPECIES.filter((s) => g.seen.has(s.id) || tamedCount(s.id) > 0).length;
  const tamedBeasts = GAME_SPECIES.filter((s) => tamedCount(s.id) > 0).length;
  el(
    'p',
    'bestiary-count',
    panel,
    `Bestie viste ${seenBeasts}/${GAME_SPECIES.length} · domate ${tamedBeasts}/${GAME_SPECIES.length}`,
  );

  const body = el('div', 'bestiary-body', panel);
  el('h3', '', body, 'Bestie');
  // like the Pokédex: all of them, or only the ones seen, tamed or still missing
  const filters = el('div', 'sheet-tabs bestiary-filters', body);
  const grid = el('div', 'bestiary-grid', body);
  const FILTERS: [string, string][] = [
    ['all', 'Tutte'],
    ['seen', 'Viste'],
    ['tamed', 'Domate'],
    ['missing', 'Mancanti'],
  ];
  const applyFilter = (f: string): void => {
    for (const t of filters.children) t.classList.toggle('on', (t as HTMLElement).dataset.f === f);
    for (const tile of grid.children) {
      const st = (tile as HTMLElement).dataset.state;
      const show =
        f === 'all' || (f === 'seen' ? st !== 'unknown' : f === 'tamed' ? st === 'tamed' : st !== 'tamed');
      (tile as HTMLElement).style.display = show ? '' : 'none'; // the tiles' own display beats [hidden]
    }
  };
  for (const [f, label] of FILTERS) {
    const t = el('button', 'sheet-tab', filters, label);
    t.dataset.f = f;
    t.addEventListener('click', () => applyFilter(f));
  }
  // order: by number (as in the Pokédex) or by rarity, rarest first (owner, 4 ottobre)
  const sortBtn = el('button', 'sheet-tab bestiary-sort', filters, 'Per rarità');
  let byRarity = false;
  sortBtn.addEventListener('click', () => {
    byRarity = !byRarity;
    sortBtn.classList.toggle('on', byRarity);
    sortBtn.textContent = byRarity ? 'Per numero' : 'Per rarità';
    const tiles = [...grid.children] as HTMLElement[];
    const n = (t: HTMLElement, k: string): number => Number(t.dataset[k] ?? 0);
    tiles.sort((a, b) => (byRarity ? n(b, 'stars') - n(a, 'stars') : 0) || n(a, 'order') - n(b, 'order'));
    grid.append(...tiles);
  });
  GAME_SPECIES.forEach((s, i) => {
    const owned = team.filter((b) => b.form.speciesId === s.id);
    const seen = g.seen.has(s.id) || owned.length > 0;
    const form: BeastForm = { speciesId: s.id, variant: 'comune' };
    const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
    const state = owned.length ? 'tamed' : seen ? 'seen' : 'unknown';
    const card = el('button', `beast-tile ${state}`, grid);
    card.dataset.state = state;
    card.dataset.order = String(i);
    card.dataset.stars = String(stars);
    card.style.setProperty('--rarity', RARITY[stars].color);
    // never met: the same dark tile with a paw for every beast (its painting would show as a black block)
    if (seen && ART_KEYS.includes(s.id)) {
      const img = el('img', '', card);
      setArt(img, form);
      img.alt = '';
    } else card.append(icon('paw'));
    el('span', 'tile-num', card, `#${String(i + 1).padStart(2, '0')}`);
    el('span', 'tile-name', card, seen ? s.name : '???');
    if (owned.length) el('span', 'tile-badge', card, `×${owned.length}`);
    if (!seen) return;
    card.addEventListener('click', () => {
      const best = [...owned].sort((a, b) => b.level - a.level)[0];
      if (best)
        openBeastSheet(parent, best.form, best.level, { hp: best.hp, ko: best.ko, count: owned.length });
      else openBeastSheet(parent, form);
    });
  });
  applyFilter('all');
  // the legends: one of each in the world; ??? until met, then free, yours, or gone forever
  el('h3', '', body, 'Leggende');
  const lg = el('div', 'bestiary-grid', body);
  for (const u of LEGENDS) {
    const form: BeastForm = { speciesId: u.speciesId, variant: 'comune', unique: u.id };
    const mine = team.find((b) => b.form.unique === u.id);
    const gone = g.beasts.gone.includes(u.id);
    const met = g.seen.has(u.id) || !!mine || gone;
    const card = el(
      'button',
      `beast-tile legend ${mine ? 'tamed' : met ? 'seen' : 'unknown'}${gone ? ' gone' : ''}`,
      lg,
    );
    card.style.setProperty('--rarity', RARITY[5].color);
    if (met) {
      const img = el('img', '', card);
      setArt(img, form);
      img.alt = '';
    } else card.append(icon('paw'));
    el('span', 'tile-name', card, met ? u.name : '???');
    el('span', 'tile-sub', card, mine ? 'domata' : gone ? 'sconfitta per sempre' : (u.place ?? ''));
    if (met)
      card.addEventListener('click', () =>
        openBeastSheet(parent, form, mine?.level ?? u.wildLevel?.[0] ?? u.level),
      );
  }
  // the hunted giants (megalodon, Livyatan): species, but legends all the same
  for (const giant of LEGEND_GIANTS) {
    const form: BeastForm = { speciesId: giant.speciesId, variant: 'comune' };
    const mine = team.find((b) => b.form.speciesId === giant.speciesId && !b.form.unique);
    const met = g.seen.has(giant.speciesId) || !!mine;
    const card = el('button', `beast-tile legend ${mine ? 'tamed' : met ? 'seen' : 'unknown'}`, lg);
    card.style.setProperty('--rarity', RARITY[5].color);
    if (met) {
      const img = el('img', '', card);
      setArt(img, form);
      img.alt = '';
    } else card.append(icon('paw'));
    el('span', 'tile-name', card, met ? giant.name : '???');
    el('span', 'tile-sub', card, mine ? 'domata' : 'gigante preistorico');
    if (met) card.addEventListener('click', () => openBeastSheet(parent, form, mine?.level));
  }
  // rare versions you own (albino, alfa, final forms)
  const specials = team.filter((b) => b.form.variant !== 'comune' || b.form.unique || b.form.final);
  if (specials.length) {
    el('h3', '', body, 'Versioni rare domate');
    const sg = el('div', 'bestiary-grid', body);
    const done = new Set<string>();
    for (const b of specials) {
      const key = formKey(b.form);
      if (done.has(key)) continue;
      done.add(key);
      const stars = formStars(b.form) as 1 | 2 | 3 | 4 | 5;
      const card = el('button', 'beast-tile tamed special', sg);
      card.style.setProperty('--rarity', RARITY[stars].color);
      const img = el('img', '', card);
      setArt(img, b.form);
      img.alt = '';
      el('span', 'tile-name', card, formName(b.form));
      card.addEventListener('click', () => openBeastSheet(parent, b.form, b.level, { hp: b.hp, ko: b.ko }));
    }
  }
  el('h3', '', body, 'Sciami');
  const sw = el('div', 'bestiary-grid small', body);
  for (const s of SWARMS) {
    const bound = g.gear.swarms.includes(s.id);
    const t = el('div', `fish-tile ${bound ? 'tamed' : g.seen.has(s.id) ? 'seen' : 'unknown'}`, sw);
    t.append(icon('school'));
    el('span', 'tile-name', t, bound || g.seen.has(s.id) ? s.name : '???');
    if (bound) el('span', 'tile-sub', t, 'legato');
  }
  el('h3', '', body, 'Pesci');
  const fg = el('div', 'bestiary-grid small', body);
  for (const f of FISH) {
    const n = g.fishCaught[f.id] ?? 0;
    const seen = n > 0 || g.seen.has(f.id);
    const t = el('div', `fish-tile ${n ? 'tamed' : seen ? 'seen' : 'unknown'}`, fg);
    t.append(icon('fish'));
    el('span', 'tile-name', t, seen ? f.name : '???');
    if (n) el('span', 'tile-sub', t, `pescati ${n}`);
  }
  return close;
}
