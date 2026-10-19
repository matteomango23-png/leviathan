// The test gallery's bar (systems/gallery.ts): ◀ the beast ▶ with a list to jump to one, and its three tries: in the
// sea, as an opponent, as a companion, on its back. Only in the gallery's throwaway game; part of the test tools.
import type { Session } from '../scenes/session';
import { formName } from '../systems/beasts/forms';
import { galleryForms } from '../systems/gallery';
import { el } from './dom';
import './gallery.css';

export class GalleryBar {
  private readonly forms = galleryForms();
  private at = 0;
  private readonly pick: HTMLSelectElement;

  constructor(root: HTMLElement, session: Session) {
    const bar = el('div', 'gallery-bar', root);
    const row = el('div', 'gallery-row', bar);
    const prev = el('button', 'gallery-btn', row, '◀');
    this.pick = el('select', 'gallery-pick', row);
    this.forms.forEach((f, i) => {
      const o = el('option', '', this.pick, `${i + 1}/${this.forms.length} · ${formName(f)}`);
      o.value = String(i);
    });
    const next = el('button', 'gallery-btn', row, '▶');
    const acts = el('div', 'gallery-row', bar);
    const form = () => this.forms[this.at]!;
    el('button', 'gallery-btn', acts, 'In mare').addEventListener('click', () =>
      session.emit('gallery', 'sea', form()),
    );
    el('button', 'gallery-btn', acts, 'Avversario').addEventListener('click', () =>
      session.emit('gallery', 'fight', form()),
    );
    el('button', 'gallery-btn', acts, 'Compagno').addEventListener('click', () =>
      session.emit('gallery', 'companion', form()),
    );
    el('button', 'gallery-btn', acts, 'In groppa').addEventListener('click', () =>
      session.emit('gallery', 'ride', form()),
    );
    el('button', 'gallery-btn exit', acts, 'Esci').addEventListener('click', () => session.emit('toTitle'));
    const go = (d: number): void => {
      this.at = (this.at + d + this.forms.length) % this.forms.length;
      this.pick.value = String(this.at);
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    this.pick.addEventListener('change', () => (this.at = Number(this.pick.value)));
  }
}
