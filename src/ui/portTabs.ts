// Port tab "Zaino": choose the 3 backpack slots by tapping (also in the cockpit). The board is portBoard.ts.
import { ITEMS, SWARMS, WEAPONS } from '../data/world';
import { canEquip, setSlot, slotKind } from '../systems/economy/gear';
import type { GameState } from '../systems/game';
import { el } from './dom';
import { iconFor } from './icons';
import { portCard } from './portCard';

export const slotName = (id: string): string =>
  WEAPONS.find((w) => w.id === id)?.name ??
  ITEMS.find((i) => i.id === id)?.name ??
  SWARMS.find((s) => s.id === id)?.name ??
  id;

const slotText = (id: string): string =>
  WEAPONS.find((w) => w.id === id)?.text ??
  ITEMS.find((i) => i.id === id)?.text ??
  SWARMS.find((s) => s.id === id)?.text ??
  '';

export interface TabContext {
  g: GameState;
  say: (text: string, error?: boolean) => void;
  redraw: () => void;
}

let selectedSlot = 0;

export function renderBackpack(b: HTMLElement, ctx: TabContext): void {
  const gear = ctx.g.gear;
  el('p', 'port-hint', b, 'L’arpione è sempre con te. Tocca un posto, poi tocca cosa metterci.');
  const slots = el('div', 'slot-row', b);
  gear.backpack.forEach((id, i) => {
    const c = portCard(slots, {
      icon: id ? iconFor(id) : 'backpack',
      title: `Posto ${i + 1}`,
      text: id ? `${slotName(id)}${gear.inventory[id] ? ` ×${gear.inventory[id]}` : ''}` : 'vuoto',
      state: i === selectedSlot ? 'active' : '',
      button: id ? { label: 'Togli', onClick: () => (setSlot(gear, i, null), ctx.redraw()) } : undefined,
      onClick: () => {
        selectedSlot = i;
        ctx.redraw();
      },
    });
    c.classList.add('slot-card');
  });
  const options = [
    ...gear.weapons.filter((w) => w !== 'arpione'),
    ...gear.swarms,
    ...Object.keys(gear.inventory).filter((i) => (gear.inventory[i] ?? 0) > 0),
  ];
  el('h3', '', b, 'Da mettere nello zaino');
  if (!options.length) {
    el(
      'p',
      'port-hint',
      b,
      'Ancora niente: apri i relitti, compra oggetti al mercato, lega uno sciame di sardine.',
    );
    return;
  }
  const grid = el('div', 'pcard-grid', b);
  for (const id of options) {
    const inSlot = gear.backpack.indexOf(id);
    const kind = slotKind(id);
    portCard(grid, {
      icon: iconFor(id),
      title: slotName(id),
      badge: kind === 'item' ? `×${gear.inventory[id] ?? 0}` : kind === 'swarm' ? 'sciame' : 'arma',
      text: slotText(id),
      state: inSlot >= 0 ? 'owned' : '',
      button: {
        label: inSlot >= 0 ? `Nel posto ${inSlot + 1}` : `Metti nel posto ${selectedSlot + 1}`,
        disabled: inSlot >= 0 || !canEquip(gear, id),
        onClick: () => {
          setSlot(gear, selectedSlot, id);
          selectedSlot = (selectedSlot + 1) % gear.backpack.length;
          ctx.redraw();
        },
      },
    });
  }
}
