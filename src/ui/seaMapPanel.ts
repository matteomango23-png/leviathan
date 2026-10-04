// The sea map (pause menu): a tab for the coast and one for each region of the open sea (owner, 4 ottobre: one
// tab per place, not the same kinds of sea over and over). Visited places show their depth or distance, the
// outpost once found, and the beasts living there with rarity and how often you meet them (unseen as ???).
import { ENDLESS } from '../data/endless';
import { WORLD } from '../data/worldLayout';
import { coastMap, regionsMap, type MapBeast } from '../systems/seaMap';
import type { GameState } from '../systems/game';
import { el } from './dom';
import { kmFromCoast } from '../systems/world/endless';
import { ICONS, icon } from './icons';

const startKm = ENDLESS.startX / WORLD.unitsPerMetre / 1000;
const km = (v: number): string => v.toFixed(1).replace('.', ',');

function beastRows(card: HTMLElement, beasts: MapBeast[]): void {
  if (!beasts.length) {
    el('div', 'map-none', card, 'Nessuna bestia selvatica per ora.');
    return;
  }
  for (const b of beasts) {
    const row = el('div', 'map-beast', card);
    el('span', 'map-beast-name', row, b.name ?? '???');
    el('span', 'map-stars', row, '★'.repeat(b.stars));
    el('span', 'map-share', row, `${Math.max(1, Math.round(b.share * 100))}%`);
  }
}

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

  const coast = coastMap(g.seen);
  const regions = regionsMap(g.seen);
  const vehicle = g.ship.owned ? g.ship : g.sub.owned ? g.sub : null;
  const where = vehicle
    ? ` · ${g.ship.owned ? 'la nave' : 'il sottomarino'} è a ${km(kmFromCoast(vehicle.x))} km dalla costa`
    : '';
  el('p', 'bestiary-count', panel, `Sei a ${km(kmFromCoast(g.diver.x))} km dalla costa${where}`);
  const tabs = el('div', 'map-tabs', panel);
  const body = el('div', 'bestiary-body map-grid', panel);
  const here = g.diver.x < ENDLESS.startX ? 0 : 1 + regions.findIndex((r) => kmFromCoast(g.diver.x) < r.km[1]);
  const names = ['Costa', ...regions.map((r) => (r.visited ? r.name : '???'))];
  const buttons = names.map((n, i) => {
    const b = el('button', 'map-tab', tabs, n);
    b.addEventListener('click', () => show(i));
    return b;
  });

  function show(i: number): void {
    buttons.forEach((b, j) => b.classList.toggle('on', j === i));
    body.replaceChildren();
    if (i === 0) {
      for (const z of coast) {
        const card = el('div', `map-zone${z.visited ? '' : ' unknown'}${z.name === g.zone ? ' here' : ''}`, body);
        el('div', 'map-name', card, z.visited ? z.name : '???');
        const depth = z.depth[1] === null ? `oltre ${z.depth[0]} m` : `${z.depth[0]}–${z.depth[1]} m`;
        el('div', 'map-depth', card, z.visited ? depth : 'ancora da esplorare');
        if (z.visited) beastRows(card, z.beasts);
      }
      return;
    }
    const r = regions[i - 1]!;
    const card = el('div', `map-zone map-region${r.visited ? '' : ' unknown'}${i === here ? ' here' : ''}`, body);
    el('div', 'map-name', card, r.visited ? r.name : '???');
    el('div', 'map-depth', card, `${km(Math.max(r.km[0], startKm))}–${r.km[1]} km dalla costa`);
    if (!r.visited) {
      el('div', 'map-none', card, 'Ancora da esplorare: arrivaci con la nave.');
      return;
    }
    el('div', 'map-none', card, `${r.note} ${r.kinds.join(', ')}.`);
    el('div', 'map-none', card, r.outpost ? `Avamposto: ${r.outpost}.` : 'Avamposto: non ancora trovato.');
    beastRows(card, r.beasts);
  }
  show(Math.max(0, here));
  return close;
}
