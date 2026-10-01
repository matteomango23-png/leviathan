// The evolution, like Pokémon: the beast's card glows brighter and brighter, a white flash, then its new stage
// with its name. The sea waits; a tap (after the reveal) closes it. Several evolutions are shown one by one.
import { EVOLUTION_TEXT } from '../data/story';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { formName } from '../systems/beasts/forms';
import { setArt } from './art';
import { el } from './dom';
import './evolution.css';

type Evolved = Extract<GameEvent, { type: 'evolved' }>;

export class EvolutionShow {
  private readonly root: HTMLDivElement;
  private readonly img: HTMLImageElement;
  private readonly text: HTMLDivElement;
  private readonly queue: { e: Evolved; to: GameState['beasts']['team'][number] }[] = [];
  private busy = false;
  private closable = false;

  constructor(
    parent: HTMLElement,
    private readonly onPause: (paused: boolean) => void,
  ) {
    this.root = el('div', 'evo', parent);
    this.root.hidden = true;
    const stage = el('div', 'evo-stage', this.root);
    el('div', 'evo-glow', stage);
    this.img = el('img', 'evo-art', stage);
    this.text = el('div', 'evo-text', this.root);
    this.root.addEventListener('pointerdown', () => {
      if (this.closable) this.next();
    });
  }

  onEvents(events: GameEvent[], g: GameState): void {
    for (const e of events) {
      if (e.type !== 'evolved') continue;
      const b = g.beasts.team.find((x) => x.uid === e.uid);
      if (b) this.queue.push({ e, to: b });
    }
    if (!this.busy && this.queue.length) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      this.closable = false;
      this.root.hidden = true;
      this.root.className = 'evo';
      this.onPause(false);
      return;
    }
    this.busy = true;
    this.closable = false;
    this.onPause(true);
    const { e, to } = item;
    setArt(this.img, { ...to.form, speciesId: e.fromId });
    this.text.textContent = EVOLUTION_TEXT.what(e.from);
    this.root.hidden = false;
    this.root.className = 'evo glowing';
    window.setTimeout(() => {
      // the flash: the new stage appears
      setArt(this.img, to.form);
      this.root.className = 'evo revealed';
      this.text.textContent = EVOLUTION_TEXT.done(e.from, formName(to.form));
      window.setTimeout(() => (this.closable = true), 900);
    }, 2800);
  }
}
