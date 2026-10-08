// Story dialogues at the bottom of the screen: who speaks, the line appearing letter by letter.
// Tap (or Enter / Space / E) shows the whole line, then the next one; after the last, the story goes on.
import { SPEAKERS, type DialogueId } from '../data/story';
import type { GameState } from '../systems/game';
import { closeDialogue, dialogueLines } from '../systems/story';
import { el } from './dom';

const LETTERS_PER_SECOND = 55;

export class DialogueBox {
  private readonly root: HTMLDivElement;
  private readonly who: HTMLDivElement;
  private readonly text: HTMLDivElement;
  private id: DialogueId | null = null;
  private line = 0;
  private shown = 0;
  private game: GameState | null = null;
  private readonly cleanup: (() => void)[] = [];

  constructor(parent: HTMLElement) {
    this.root = el('div', 'dialogue', parent);
    this.who = el('div', 'dialogue-who', this.root);
    this.text = el('div', 'dialogue-text', this.root);
    el('div', 'dialogue-next', this.root, '▼');
    const skip = el('button', 'dialogue-skip', this.root, 'Salta');
    skip.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.finish();
    });
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.advance();
    });
    const onKey = (e: KeyboardEvent): void => {
      if (!this.id || e.repeat) return;
      if (['enter', ' ', 'e'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        this.advance();
      }
    };
    window.addEventListener('keydown', onKey, true);
    this.cleanup.push(() => window.removeEventListener('keydown', onKey, true));
  }

  private get lines() {
    return this.id ? dialogueLines(this.id) : [];
  }

  private advance(): void {
    const l = this.lines[this.line];
    if (!l) return;
    if (this.shown < l.text.length) {
      this.shown = l.text.length; // first tap: the whole line at once
      return;
    }
    this.line++;
    this.shown = 0;
    if (this.line >= this.lines.length) this.finish();
  }

  private finish(): void {
    const g = this.game;
    this.id = null;
    this.root.classList.remove('show');
    if (g) closeDialogue(g, g.story.pending);
  }

  /** Every frame: shows the story's open dialogue, if any. */
  update(g: GameState, dt: number): void {
    this.game = g;
    const want = g.story.dialogue;
    if (want !== this.id) {
      this.id = want;
      this.line = 0;
      this.shown = 0;
      this.root.classList.toggle('show', !!want);
    }
    const l = this.lines[this.line];
    if (!l) return;
    this.shown = Math.min(l.text.length, this.shown + dt * LETTERS_PER_SECOND);
    const name = SPEAKERS[l.who];
    this.who.textContent = name;
    this.who.style.display = name ? '' : 'none';
    this.root.classList.toggle('narration', l.who === 'narratore');
    this.text.textContent = l.text.slice(0, Math.floor(this.shown));
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.root.remove();
  }
}
