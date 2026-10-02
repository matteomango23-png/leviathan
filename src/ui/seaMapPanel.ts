// The sea map (pause menu): a card per zone. Visited zones show their depth and the beasts living there with
// rarity and how often you meet them (unseen beasts as ???); zones still to discover stay dark.
import { seaMap } from '../systems/seaMap';
import type { GameState } from '../systems/game';
import { el } from './dom';
import { kmFromCoast } from '../systems/world/endless';
import { ICONS, icon } from './icons';

export function openSeaMap(parent: HTMLElement, g: GameState): () => void {
  const root = el('div', 'sheet bestiary', parent);
  const panel = el('div', 'bestiary-panel', root);
  const close = (): void => root.remove();
  const head = el('div', 'sheet-head', panel);
  const title = el('h2', '', head);
  title.append(icon('dive'), document.createTextNode(' Mappa del mare'));
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.addEventListener('click', close);

  const zones = seaMap(g.seen);
  const visited = zones.filter((z) => z.visited).length;
  const boat = g.boat?.owned
    ? ` · la tua barca è a ${kmFromCoast(g.boat.x).toFixed(1).replace('.', ',')} km dalla costa`
    : '';
  el(
    'p',
    'bestiary-count',
    panel,
    `Zone esplorate ${visited}/${zones.length} · sei in: ${g.zone || '—'}${boat}`,
  );
  const body = el('div', 'bestiary-body map-grid', panel);
  for (const z of zones) {
    const card = el('div', `map-zone${z.visited ? '' : ' unknown'}${z.name === g.zone ? ' here' : ''}`, body);
    el('div', 'map-name', card, z.visited ? z.name : '???');
    const depth = z.depth[1] === null ? `oltre ${z.depth[0]} m` : `${z.depth[0]}–${z.depth[1]} m`;
    el('div', 'map-depth', card, z.visited ? depth : 'ancora da esplorare');
    if (!z.visited) continue;
    if (!z.beasts.length) {
      el('div', 'map-none', card, 'Nessuna bestia selvatica per ora.');
      continue;
    }
    for (const b of z.beasts) {
      const row = el('div', 'map-beast', card);
      el('span', 'map-beast-name', row, b.name ?? '???');
      el('span', 'map-stars', row, '★'.repeat(b.stars));
      el('span', 'map-share', row, `${Math.max(1, Math.round(b.share * 100))}%`);
    }
  }
  return close;
}
