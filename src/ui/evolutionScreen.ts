// Pokémon's evolution screen: "Cosa? Zanna si sta evolvendo!", the old and the new shape flashing white faster and
// faster, and a button to stop it (Pokémon's B). Stopped, it tries again at its next level.
import { FEMININE_SPECIES } from '../data/battleText';
import { evolve, evolvesInto, stopEvolution } from '../systems/beasts/growth';
import { formName } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import type { GameEvent } from '../systems/events';
import { battleArt } from '../views/battle/beastArt';
import { setArt } from './art';
import { el } from './dom';
import { learnScreen } from './movePanel';
import './screens.css';

/** How long the flashing lasts before it evolves (ms). */
const EVOLVE_MS = 4200;

/** Runs the screen; resolves when it is closed (evolved or stopped, and any new move chosen). */
export function evolutionScreen(parent: HTMLElement, b: TeamBeast, events: GameEvent[]): Promise<void> {
  const next = evolvesInto(b);
  if (!next) return Promise.resolve();
  return new Promise((done) => {
    const root = el('div', 'mscreen evo', parent);
    const card = el('div', 'mscreen-card evo-card', root);
    const stage = el('div', 'evo-stage flashing', card);
    const oldImg = el('img', 'evo-old', stage);
    const newImg = el('img', 'evo-new', stage);
    // the cut-out battle picture, so only its shape flashes (a card where there is none)
    const show = (img: HTMLImageElement, form: typeof next): void => {
      const art = battleArt(form, 'foe');
      if (art.own) img.src = art.url;
      else setArt(img, form);
    };
    show(oldImg, b.form);
    show(newImg, next);
    oldImg.alt = newImg.alt = '';
    const before = formName(b.form);
    const line = el('p', 'mscreen-line evo-line', card, `Cosa? ${before} si sta evolvendo!`);
    const actions = el('div', 'mscreen-actions', card);
    const stopBtn = el('button', 'menu-btn', actions, 'Annulla');
    const close = (): void => {
      root.remove();
      // a move it learned by evolving with 4 already known: choose now
      const waiting = [...(b.pendingMoves ?? [])];
      const ask = (i: number): void => {
        if (i >= waiting.length) return done();
        learnScreen(parent, b, waiting[i]!, () => ask(i + 1));
      };
      ask(0);
    };
    const ok = (): void => {
      actions.replaceChildren();
      el('button', 'menu-btn mscreen-ok', actions, 'OK').addEventListener('click', close);
    };
    const timer = window.setTimeout(() => {
      stage.classList.remove('flashing');
      stage.classList.add('done');
      evolve(b, events);
      const o = FEMININE_SPECIES.includes(b.form.speciesId) ? 'a' : 'o';
      line.textContent = `Congratulazioni! ${before} si è evolut${o} in ${formName(b.form)}!`;
      ok();
    }, EVOLVE_MS);
    stopBtn.addEventListener('click', () => {
      window.clearTimeout(timer);
      stopEvolution(b);
      stage.classList.remove('flashing');
      line.textContent = `${before} ha smesso di evolversi.`;
      ok();
    });
  });
}
