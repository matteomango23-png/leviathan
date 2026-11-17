// Your ship's weapons at the helm (owner, 17 novembre 2026; data/company.ts): "Fuoco" for its gun, "Siluro" for a
// U-Boat's torpedoes, each showing its reload. Only while the Compagnia's vessels are about (the test arena for now).
import { WEAPONS } from '../data/company';
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { shipModel } from '../systems/ship/model';
import { el } from './dom';
import './fireButtons.css';

export class FireButtons {
  private readonly root: HTMLDivElement;
  private readonly gun: HTMLButtonElement;
  private readonly torpedo: HTMLButtonElement;

  constructor(parent: HTMLElement, session: Session) {
    this.root = el('div', 'fire-buttons', parent);
    this.torpedo = el('button', 'fire-btn torpedo', this.root, 'Siluro');
    this.gun = el('button', 'fire-btn', this.root, 'Fuoco');
    const tap = (b: HTMLButtonElement, cmd: 'fire' | 'torpedo'): void =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        session.input.helmCmd = cmd;
      });
    tap(this.gun, 'fire');
    tap(this.torpedo, 'torpedo');
    this.root.hidden = true;
  }

  update(g: GameState): void {
    const on = g.ship.aboard && g.ship.hull > 0 && g.company.enemies.length > 0;
    this.root.hidden = !on;
    if (!on) return;
    const weapons = shipModel(g.ship).weapons;
    const show = (b: HTMLButtonElement, kind: 'shell' | 'torpedo'): void => {
      const w = weapons.find((x) => WEAPONS[x].kind === kind);
      b.hidden = !w;
      if (!w) return;
      const left = g.company.yourReload[w] ?? 0;
      b.style.setProperty('--ready', String(1 - left / WEAPONS[w].reload));
      b.classList.toggle('loading', left > 0);
    };
    show(this.gun, 'shell');
    show(this.torpedo, 'torpedo');
  }
}
