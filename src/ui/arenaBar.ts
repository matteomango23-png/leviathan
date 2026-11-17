// The naval test arena's bar (systems/company/arena.ts): your ship, the Compagnia's vessels, day or night, start again,
// back to the title. Only in the arena's throwaway game; part of the test tools.
import type { Session } from '../scenes/session';
import { ARENA_DEFAULT, arenaShips, type ArenaSetup } from '../systems/company/arena';
import { el } from './dom';
import './gallery.css';

const FOES: { id: ArenaSetup['enemies']; name: string }[] = [
  { id: 'baleniera', name: 'Baleniera' },
  { id: 'caccia', name: 'Nave da caccia' },
  { id: 'uboot', name: 'U-Boot nemico' },
  { id: 'tutti', name: 'Tutti e tre' },
];

export class ArenaBar {
  private set: ArenaSetup = { ...ARENA_DEFAULT };

  constructor(root: HTMLElement, session: Session) {
    const bar = el('div', 'gallery-bar arena-bar', root);
    const row = el('div', 'gallery-row', bar);
    const ship = el('select', 'gallery-pick', row);
    for (const s of arenaShips()) {
      const o = el('option', '', ship, s.name);
      o.value = s.id;
    }
    ship.value = this.set.ship;
    const foe = el('select', 'gallery-pick', row);
    for (const f of FOES) {
      const o = el('option', '', foe, f.name);
      o.value = f.id;
    }
    foe.value = this.set.enemies;
    const acts = el('div', 'gallery-row', bar);
    const night = el('button', 'gallery-btn', acts, 'Giorno');
    const again = el('button', 'gallery-btn', acts, 'Ricomincia');
    el('button', 'gallery-btn exit', acts, 'Esci').addEventListener('click', () => session.emit('toTitle'));
    const go = (): void => session.emit('arena', { ...this.set });
    ship.addEventListener('change', () => {
      this.set.ship = ship.value;
      go();
    });
    foe.addEventListener('change', () => {
      this.set.enemies = foe.value as ArenaSetup['enemies'];
      go();
    });
    night.addEventListener('click', () => {
      this.set.night = !this.set.night;
      night.textContent = this.set.night ? 'Notte' : 'Giorno';
      go();
    });
    again.addEventListener('click', go);
  }
}
