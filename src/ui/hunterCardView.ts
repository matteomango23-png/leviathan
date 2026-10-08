// The hunter's card on screen, like Pokémon's trainer card: the numbers of your journey (systems/hunterCard.ts).
import { hunterCard } from '../systems/hunterCard';
import type { GameState } from '../systems/game';
import { el } from './dom';
import './screens.css';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function openHunterCard(parent: HTMLElement, g: GameState): void {
  const c = hunterCard(g);
  const root = el('div', 'mscreen', parent);
  const card = el('div', 'mscreen-card hcard', root);
  const head = el('div', 'bag-head', card);
  el('h2', 'mscreen-title', head, 'Tessera del cacciatore');
  el('button', 'menu-btn small', head, 'Chiudi').addEventListener('click', () => root.remove());
  const list = el('div', 'hcard-rows', card);
  const row = (label: string, value: string): void => {
    const r = el('div', 'lvrow', list);
    el('span', 'lvrow-name', r, label);
    el('span', 'lvrow-value', r, value);
  };
  row('Denti', String(c.teeth));
  row('Bestiario', `viste ${c.seen} · domate ${c.tamed} su ${c.species}`);
  row('Tempo di gioco', formatTime(c.playTime));
  row('Immersione più profonda', `${c.deepestM} m`);
  row('Reliquie', `${c.relics}/${c.relicsTotal}`);
}
