// Port tabs: backpack (choose the 3 slots by tapping) and the harbour board (missions).
import { ITEMS, SWARMS, WEAPONS } from '../data/world';
import { canEquip, setSlot, slotKind } from '../systems/economy/gear';
import {
  acceptMission,
  boardMissions,
  claimMission,
  goalCount,
  isComplete,
  missionById,
} from '../systems/economy/missions';
import type { GameState } from '../systems/game';
import { el } from './dom';
import { iconFor } from './icons';
import { portCard } from './portCard';
import { renderDiary } from './huntDiary';

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

export function renderBoard(b: HTMLElement, ctx: TabContext): void {
  const gear = ctx.g.gear;
  el('h3', '', b, 'Avvistamenti');
  renderDiary(b, ctx.g, ctx.redraw); // the rumours of this harbour are heard when you come in (hunts.ts)
  el('h3', '', b, 'In corso');
  const active = el('div', 'pcard-grid', b);
  if (!gear.missions.active.length)
    el('p', 'port-hint', active, 'Nessuna missione in corso: scegline una qui sotto.');
  for (const id of gear.missions.active) {
    const m = missionById(id)!;
    const done = isComplete(gear, id);
    const p = Math.min(gear.missions.progress[id] ?? 0, goalCount(m));
    const c = portCard(active, {
      icon: 'scroll',
      title: m.title,
      text: m.text,
      price: m.reward,
      state: done ? 'active' : '',
      button: {
        label: done ? 'Riscuoti' : `${p} / ${goalCount(m)}`,
        disabled: !done,
        onClick: () => {
          ctx.say(`Missione compiuta: +${claimMission(gear, id)} denti.`);
          ctx.redraw();
        },
      },
    });
    const bar = el('div', 'pcard-progress', c);
    el('div', 'pcard-progress-fill', bar).style.width = `${(p / goalCount(m)) * 100}%`;
  }
  el('h3', '', b, 'Bacheca');
  const grid = el('div', 'pcard-grid', b);
  const board = boardMissions(gear);
  if (!board.length) el('p', 'port-hint', grid, 'Per ora non ci sono altri incarichi.');
  for (const m of board)
    portCard(grid, {
      icon: 'scroll',
      title: m.title,
      text: m.text,
      price: m.reward,
      button: {
        label: 'Accetta',
        onClick: () => {
          if (acceptMission(gear, m.id)) ctx.say('Missione accettata.');
          else ctx.say('Hai già 3 missioni in corso.', true);
          ctx.redraw();
        },
      },
    });
}
