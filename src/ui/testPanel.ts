// Test panel (only with ?prove in the link): show any beast version, get strong beasts, teeth, heal.
import { WHITE_SHARK_FORMS, formName, type BeastForm } from '../systems/beasts/forms';
import type { GameState } from '../systems/game';
import {
  giveTestBeast,
  goToDelta,
  goToLair,
  goToPortoFango,
  healAll,
  raiseTeam,
  spawnTestBeast,
} from '../systems/testTools';
import { el } from './dom';

const OTHERS: BeastForm[] = [
  { speciesId: 'barracuda', variant: 'comune' },
  { speciesId: 'tartaruga_marina', variant: 'comune' },
  { speciesId: 'torpedine', variant: 'comune' },
];

export function renderTestPanel(
  parent: HTMLElement,
  g: GameState,
  done: (msg: string) => void,
  skipWeather?: () => void,
): void {
  const box = el('div', 'test-panel', parent);
  el('h3', '', box, 'Prove (link con ?prove)');
  const grid = el('div', 'test-grid', box);
  for (const form of [...WHITE_SHARK_FORMS, ...OTHERS]) {
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
  for (const form of OTHERS) {
    const b = el('button', 'menu-btn small', grid, `${formName(form)} liv. 15 in squadra`);
    b.addEventListener('click', () => {
      giveTestBeast(g, form, 15);
      done(`${formName(form)} liv. 15 aggiunto (se la squadra è piena va in riserva).`);
    });
  }
  const up = el('button', 'menu-btn small', grid, '+5 livelli alla squadra');
  up.addEventListener('click', () => {
    raiseTeam(g, 5);
    done('Squadra +5 livelli.');
  });
  const grow = el('button', 'menu-btn small', grid, 'Squalo bianco liv. 30 (prova la crescita)');
  grow.addEventListener('click', () => {
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 30);
    done('Squalo liv. 30 aggiunto: dagli esperienza e fagli mangiare pesci.');
  });
  const lair = el('button', 'menu-btn small', grid, 'Portami nella tana dello Sfregiato');
  lair.addEventListener('click', () => {
    goToLair(g);
    done('Sei nella tana dello Sfregiato (liv. 8). Porta una squadra forte!');
  });
  const delta = el('button', 'menu-btn small', grid, 'Portami nel Delta');
  delta.addEventListener('click', () => {
    goToDelta(g);
    done('Sei nel Delta delle Mangrovie.');
  });
  const fango = el('button', 'menu-btn small', grid, 'Portami a Porto Fango');
  fango.addEventListener('click', () => {
    goToPortoFango(g);
    done("Sei a Porto Fango, sull'Isola delle Mangrovie.");
  });
  const teeth = el('button', 'menu-btn small', grid, '+2000 denti');
  teeth.addEventListener('click', () => {
    g.gear.teeth += 2000;
    done('2000 denti aggiunti: prova il mercato al porto.');
  });
  if (skipWeather) {
    const sky = el('button', 'menu-btn small', grid, 'Cambia il meteo');
    sky.addEventListener('click', () => {
      skipWeather();
      done('Il meteo è cambiato: sali in superficie per vederlo.');
    });
  }
  const heal = el('button', 'menu-btn small', grid, 'Cura tutto');
  heal.addEventListener('click', () => {
    healAll(g);
    done('Tutti curati.');
  });
}
