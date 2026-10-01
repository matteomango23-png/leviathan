// The three backpack slots during a dive (top right): tap a weapon to use it instead of the harpoon
// (tap again to go back), tap an item to use it, tap a swarm to call it. Keys R, T, Y.
import { SWARMS } from '../data/world';
import { slotKind } from '../systems/economy/gear';
import type { GameState } from '../systems/game';
import type { Session } from '../scenes/session';
import { el } from './dom';
import { slotName } from './portMenu';

const SHORT: Record<string, string> = {
  fiocine: 'Fiocine',
  rete: 'Rete',
  folgore: 'Folgore',
  runico: 'Runico',
  sciame_sardine: 'Sardine',
  bolla_aria: 'Bolla',
  alga_curativa: 'Alga',
  krill_dorato: 'Krill',
  esca: 'Esca',
  arpione_mitico: 'Mitico',
};

export class BackpackBar {
  private readonly root: HTMLDivElement;
  private readonly slots: HTMLButtonElement[] = [];
  private readonly harpoonLabel: HTMLElement | null;

  constructor(parent: HTMLElement, session: Session) {
    this.root = el('div', 'backpack', parent);
    for (let i = 0; i < 3; i++) {
      const b = el('button', 'pack-slot', this.root);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        session.input.slot = i;
      });
      this.slots.push(b);
    }
    this.harpoonLabel = parent.querySelector('.act-harpoon');
  }

  update(g: GameState): void {
    const gear = g.gear;
    this.root.hidden = gear.backpack.every((s) => !s);
    gear.backpack.forEach((id, i) => {
      const b = this.slots[i]!;
      b.hidden = !id;
      if (!id) return;
      const k = slotKind(id);
      let label = SHORT[id] ?? slotName(id);
      if (k === 'item') label += ` ×${gear.inventory[id] ?? 0}`;
      if (k === 'swarm') {
        const cd = g.swarmCooldowns[id] ?? 0;
        if (g.beasts.decoy?.id === id) label += ' ✦';
        else if (cd > 0) label += ` ${Math.ceil(cd)}`;
        b.classList.toggle('cooldown', cd > 0);
        b.title = SWARMS.find((s) => s.id === id)?.text ?? '';
      }
      if (b.textContent !== label) b.textContent = label;
      b.classList.toggle('on', k === 'weapon' && gear.activeWeapon === id);
    });
    if (this.harpoonLabel) {
      const name = gear.activeWeapon === 'arpione' ? 'Fucile' : (SHORT[gear.activeWeapon] ?? 'Arma');
      if (this.harpoonLabel.textContent !== name) this.harpoonLabel.textContent = name;
      this.harpoonLabel.classList.toggle('mythic', g.beasts.mythic > 0);
    }
  }
}
