// Held upright, the game asks to turn the phone (owner, 22 ottobre 2026: the fake rotation jumped, since iOS turns the
// page first and a web app cannot lock it). A dark screen over everything with a phone turning round; the game sleeps
// under it and goes on as it was once the phone is turned.
import { el } from './dom';

let hint: HTMLElement | null = null;

/** Shows or hides it; returns whether it changed. */
export function showRotateHint(upright: boolean): boolean {
  if (!hint) {
    hint = el('div', 'rotate-hint', document.body);
    hint.innerHTML =
      '<div class="rotate-phone"></div><div class="rotate-title">LEVIATANO</div>' +
      '<div class="rotate-text">Gira il telefono per giocare</div>';
  }
  const was = !hint.hidden;
  hint.hidden = !upright;
  return was !== upright;
}
