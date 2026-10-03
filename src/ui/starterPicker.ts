// The choice of your first beast (systems/starter.ts): Aurelio's words and three cards side by side, each with
// its illustration, name, type, what it does and what it becomes. Tapping "Scegli" adds it to your team.
import { STARTER } from '../data/story';
import { SPECIES } from '../data/species';
import { TYPES, type TypeId } from '../data/rules';
import { chooseStarter, STARTERS } from '../systems/starter';
import type { GameState } from '../systems/game';
import { assetUrl } from '../data/assets';
import { BATTLE_ART_KEYS } from '../data/sprites.generated';
import { setArt } from './art';
import { el } from './dom';
import './starter.css';

export class StarterPicker {
  private readonly root: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly getGame: () => GameState | null,
  ) {
    this.root = el('div', 'starter', parent);
    this.root.hidden = true;
    el('h2', 'starter-title', this.root, STARTER.title);
    el('p', 'starter-aurelio', this.root, STARTER.aurelio);
    const row = el('div', 'starter-row', this.root);
    for (const s of STARTERS) {
      const card = el('div', 'starter-card', row);
      const color = s.type === 'variabile' ? '#d9e4e6' : TYPES[s.type as TypeId].color;
      card.style.setProperty('--tc', color);
      // the whole beast, centred, on a patch of sea: its battle picture (the vertical card was cut badly)
      const frame = el('div', 'starter-frame', card);
      const img = el('img', 'starter-art', frame);
      if (BATTLE_ART_KEYS.includes(`${s.id}_front`)) img.src = assetUrl(`sprites/${s.id}_front.webp`);
      else setArt(img, { speciesId: s.id, variant: 'comune' });
      el('div', 'starter-name', card, s.name);
      el('span', 'starter-type', card, s.type === 'variabile' ? 'Variabile' : TYPES[s.type as TypeId].name);
      el('p', 'starter-trait', card, s.trait);
      const next = SPECIES.find((x) => x.id === s.evolvesTo);
      if (next && s.evolveLevel) el('p', 'starter-evolves', card, STARTER.evolves(next.name, s.evolveLevel));
      const btn = el('button', 'starter-btn', card, STARTER.choose);
      btn.addEventListener('click', () => {
        const g = this.getGame();
        if (g && chooseStarter(g, s.id, g.story.pending)) this.root.hidden = true;
      });
    }
  }

  /** Shown while the game waits for the choice. */
  setVisible(show: boolean): void {
    if (this.root.hidden === !show) return;
    this.root.hidden = !show;
  }
}
