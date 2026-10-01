// The bestiary (like a Pokédex): every beast, swarm and fish. Unknown ones are silhouettes,
// seen ones are in shadow, tamed ones are in colour. Tap a beast to open its sheet.
import { RARITY } from '../data/cards';
import { SPECIES } from '../data/species';
import { FISH, SWARMS } from '../data/world';
import { formKey, formName, formStars, type BeastForm } from '../systems/beasts/forms';
import { ART_KEYS } from '../data/sprites.generated';
import type { GameState } from '../systems/game';
import { openBeastSheet } from './beastSheet';
import { el } from './dom';
import { ICONS, icon } from './icons';
import { setArt } from './art';

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
  const seenBeasts = SPECIES.filter((s) => g.seen.has(s.id) || tamedCount(s.id) > 0).length;
  const tamedBeasts = SPECIES.filter((s) => tamedCount(s.id) > 0).length;
  el(
    'p',
    'bestiary-count',
    panel,
    `Bestie viste ${seenBeasts}/${SPECIES.length} · domate ${tamedBeasts}/${SPECIES.length}`,
  );

  const body = el('div', 'bestiary-body', panel);
  el('h3', '', body, 'Bestie');
  const grid = el('div', 'bestiary-grid', body);
  SPECIES.forEach((s, i) => {
    const owned = team.filter((b) => b.form.speciesId === s.id);
    const seen = g.seen.has(s.id) || owned.length > 0;
    const form: BeastForm = { speciesId: s.id, variant: 'comune' };
    const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
    const card = el('button', `beast-tile ${owned.length ? 'tamed' : seen ? 'seen' : 'unknown'}`, grid);
    card.style.setProperty('--rarity', RARITY[stars].color);
    if (ART_KEYS.includes(s.id)) {
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
  // rare versions you own (albino, alfa, Guardians, final forms)
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
