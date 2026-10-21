// The bestiary (like a Pokédex): every beast, swarm and fish. Unknown ones are silhouettes,
// seen ones are in shadow, tamed ones are in colour. Tap a beast to open its sheet.
import { RARITY } from '../data/cards';
import { FISH, SWARMS } from '../data/world';
import { artKeysOf, formKey, formName, formStars, type BeastForm } from '../systems/beasts/forms';
import { ART_KEYS } from '../data/sprites.generated';
import type { GameState } from '../systems/game';
import { openBeastSheet } from './beastSheet';
import { el } from './dom';
import { ICONS, icon } from './icons';
import { setArt } from './art';
import { openTypeWheel } from './typeWheel';
import { LEGEND_GIANTS, LEGENDS } from '../systems/beasts/legends';
import { rareVersions } from '../systems/beasts/rareVersions';
import {
  bestiaryEntries,
  countsFor,
  entryState,
  knowsForm,
  type EntryKind,
} from '../systems/beasts/bestiaryEntries';

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
  const entries = bestiaryEntries().map((e) => ({ e, state: entryState(e, g) }));
  const seenN = entries.filter((x) => x.state !== 'unknown').length;
  const tamedN = entries.filter((x) => x.state === 'tamed').length;
  el(
    'p',
    'bestiary-count',
    panel,
    `Bestie viste ${seenN}/${entries.length} · domate ${tamedN}/${entries.length}`,
  );
  const known = (f: BeastForm): boolean => knowsForm(f, g);

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
    showFamilies();
  };
  // the name of each family over its beasts (21 ottobre), when any of them shows and the order is by number
  const showFamilies = (): void => {
    for (const h of grid.querySelectorAll<HTMLElement>('.bestiary-family')) {
      const any = [...grid.querySelectorAll<HTMLElement>('.beast-tile')].some(
        (t) => t.dataset.family === h.dataset.family && t.style.display !== 'none',
      );
      h.style.display = any && !byRarity ? '' : 'none';
    }
  };
  for (const [f, label] of FILTERS) {
    const t = el('button', 'sheet-tab', filters, label);
    t.dataset.f = f;
    t.addEventListener('click', () => applyFilter(f));
  }
  let byRarity = false;
  // the wheel of the types: who beats whom, and why (owner, 21 ottobre)
  el('button', 'sheet-tab', filters, 'Tipi').addEventListener('click', () => openTypeWheel(root));
  // order: by number (as in the Pokédex) or by rarity, rarest first (owner, 4 ottobre)
  const sortBtn = el('button', 'sheet-tab bestiary-sort', filters, 'Per rarità');
  sortBtn.addEventListener('click', () => {
    byRarity = !byRarity;
    sortBtn.classList.toggle('on', byRarity);
    sortBtn.textContent = byRarity ? 'Per numero' : 'Per rarità';
    const tiles = [...grid.children] as HTMLElement[];
    const n = (t: HTMLElement, k: string): number => Number(t.dataset[k] ?? 0);
    tiles.sort((a, b) => (byRarity ? n(b, 'stars') - n(a, 'stars') : 0) || n(a, 'order') - n(b, 'order'));
    grid.append(...tiles);
    showFamilies();
  });
  // a species, then its albino and its final forms right beside it, each a beast of its own (16 ottobre)
  const TAG: Record<EntryKind, string> = { specie: '', albino: 'albino', evoluzione: 'evoluzione' };
  entries.forEach(({ e, state }, i) => {
    if (e.family !== entries[i - 1]?.e.family) {
      const h = el('div', 'bestiary-family', grid, e.family);
      h.dataset.family = e.family;
      h.dataset.order = String(i - 0.5);
    }
    const form = e.form;
    const owned = team.filter((b) => countsFor(e, b));
    const seen = state !== 'unknown';
    const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
    const card = el('button', `beast-tile ${state}${e.kind !== 'specie' ? ' version' : ''}`, grid);
    card.dataset.state = state;
    card.dataset.family = e.family;
    card.dataset.order = String(i);
    card.dataset.stars = String(stars);
    card.style.setProperty('--rarity', RARITY[stars].color);
    // never met: the same dark tile with a paw for every beast (its painting would show as a black block)
    if (seen && artKeysOf(form).some((k) => ART_KEYS.includes(k))) {
      const img = el('img', '', card);
      setArt(img, form);
      img.alt = '';
    } else card.append(icon('paw'));
    el('span', 'tile-num', card, `#${String(e.num).padStart(2, '0')}`);
    el('span', 'tile-name', card, seen ? formName(form) : '???');
    if (TAG[e.kind]) el('span', 'tile-tag', card, TAG[e.kind]);
    if (owned.length) el('span', 'tile-badge', card, `×${owned.length}`);
    if (!seen) return;
    card.addEventListener('click', () => {
      // its own sheet: a common shark's, even if you only have its albino (owner, 16 ottobre)
      const best = [...owned].sort((a, b) => b.level - a.level)[0];
      if (best)
        openBeastSheet(parent, best.form, best.level, {
          hp: best.hp,
          ko: best.ko,
          count: owned.length,
          known,
        });
      else openBeastSheet(parent, form, undefined, { known });
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
  // the rare versions: the alphas with pictures of their own, seen or tamed (an albino or a final form is a beast of
  // its own above)
  const rare = rareVersions(g);
  const met = rare.filter((r) => r.state !== 'unknown');
  if (met.length) {
    const tamedN = met.filter((r) => r.state === 'tamed').length;
    el('h3', '', body, `Versioni rare · viste ${met.length}/${rare.length} · domate ${tamedN}`);
    const sg = el('div', 'bestiary-grid', body);
    for (const r of met) {
      const b = team.find((t) => formKey(t.form) === formKey(r.form));
      const stars = formStars(r.form) as 1 | 2 | 3 | 4 | 5;
      const card = el('button', `beast-tile special ${r.state}`, sg);
      card.style.setProperty('--rarity', RARITY[stars].color);
      const img = el('img', '', card);
      setArt(img, r.form);
      img.alt = '';
      el('span', 'tile-name', card, formName(r.form));
      el('span', 'tile-sub', card, r.state === 'tamed' ? 'domata' : 'vista');
      card.addEventListener('click', () =>
        openBeastSheet(parent, r.form, b?.level, b ? { hp: b.hp, ko: b.ko, known } : { known }),
      );
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
    if (n) el('span', 'tile-sub', t, `${f.bird ? 'presi' : 'pescati'} ${n}`);
  }
  return close;
}
