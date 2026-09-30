// Test panel (only with ?prove in the link): show any white shark version, get a level 15 shark, heal.
import { WHITE_SHARK_FORMS, formName } from '../systems/beasts/forms';
import type { GameState } from '../systems/game';
import { giveTestBeast, healAll, spawnTestBeast } from '../systems/testTools';
import { el } from './dom';

export function renderTestPanel(parent: HTMLElement, g: GameState, done: (msg: string) => void): void {
  const box = el('div', 'test-panel', parent);
  el('h3', '', box, 'Prove (link con ?prove)');
  const grid = el('div', 'test-grid', box);
  for (const form of WHITE_SHARK_FORMS) {
    const b = el('button', 'menu-btn small', grid, `Fai apparire: ${formName(form)}`);
    b.addEventListener('click', () => {
      spawnTestBeast(g, form);
      done(`${formName(form)} sta arrivando.`);
    });
  }
  const give = el('button', 'menu-btn small', grid, 'Squalo bianco liv. 15 in squadra (3 mosse)');
  give.addEventListener('click', () => {
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 15);
    done('Squalo bianco liv. 15 aggiunto. Chiamalo dalla barra in alto.');
  });
  const heal = el('button', 'menu-btn small', grid, 'Cura tutto');
  heal.addEventListener('click', () => {
    healAll(g);
    done('Tutti curati.');
  });
}
