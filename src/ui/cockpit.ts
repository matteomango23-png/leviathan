// The cockpit of the ship (owner, 4 ottobre 2026: the centre of planning), full screen like a harbour: the bridge
// (fuel of the ship and the submarine with their range, moving fuel between them, the rescue flare, where you
// are), the pen (your team) and the backpack. More will come here: the sonar, the map, the hunting diary.
import { FUEL, RESCUE, SHIP } from '../data/ship';
import { OPEN_SEA_X } from '../data/worldLayout';
import type { Session } from '../scenes/session';
import { autonomyKm, canRescue, rescue, transferFuel } from '../systems/fuel';
import type { GameState } from '../systems/game';
import { subModel } from '../systems/submarine';
import { kmFromCoast } from '../systems/world/endless';
import { el } from './dom';
import { icon, type IconName } from './icons';
import { portCard } from './portCard';
import { renderBackpack, type TabContext } from './portTabs';
import { renderTeamPanel } from './teamPanel';
import { renderDiary } from './huntDiary';

type Tab = 'plancia' | 'diario' | 'recinto' | 'zaino';
const TABS: [Tab, string, IconName][] = [
  ['plancia', 'Plancia', 'lamp'],
  ['diario', 'Diario', 'scroll'],
  ['recinto', 'Recinto', 'pen'],
  ['zaino', 'Zaino', 'backpack'],
];

const km = (v: number): string => (v < 10 ? v.toFixed(1).replace('.', ',') : `${Math.round(v)}`);

export class Cockpit {
  private readonly root: HTMLDivElement;
  private readonly teeth: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private readonly msg: HTMLDivElement;
  private readonly tabs: HTMLButtonElement[] = [];
  private tab: Tab = 'plancia';
  private msgTimer = 0;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly g: GameState,
    private readonly onClose: () => void,
  ) {
    this.root = el('div', 'port', parent);
    parent.classList.add('in-port'); // the sea's controls hide while the cockpit is open
    const top = el('div', 'port-top', this.root);
    el('span', '', el('div', 'port-title', top), 'Cockpit');
    this.teeth = el('span', 'port-teeth', top);
    const back = el('button', 'pbtn primary', top);
    back.append(icon('lamp'), document.createTextNode(' Al timone'));
    back.addEventListener('click', () => onClose());
    const rail = el('div', 'port-rail', this.root);
    for (const [id, label, ic] of TABS) {
      const b = el('button', 'port-tab', rail);
      b.append(icon(ic), el('span', '', undefined, label));
      b.addEventListener('click', () => {
        this.tab = id;
        this.render();
      });
      b.dataset.tab = id;
      this.tabs.push(b);
    }
    this.body = el('div', 'port-body', this.root);
    this.msg = el('div', 'port-msg', this.root);
    this.render();
  }

  private say(text: string, error = false): void {
    this.msg.textContent = text;
    this.msg.classList.toggle('error', error);
    this.msg.classList.add('show');
    window.clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => this.msg.classList.remove('show'), 2600);
  }

  private render(): void {
    const keep = this.body.scrollTop;
    this.teeth.replaceChildren(icon('tooth'), document.createTextNode(` ${this.g.gear.teeth}`));
    for (const t of this.tabs) t.classList.toggle('on', t.dataset.tab === this.tab);
    this.body.replaceChildren();
    const ctx: TabContext = { g: this.g, say: (t, e) => this.say(t, e), redraw: () => this.render() };
    if (this.tab === 'plancia') this.renderBridge(this.body);
    else if (this.tab === 'diario') renderDiary(this.body, this.g);
    else if (this.tab === 'zaino') renderBackpack(this.body, ctx);
    else renderTeamPanel(this.body, this.g, true);
    this.body.scrollTop = keep;
  }

  private renderBridge(b: HTMLElement): void {
    const g = this.g;
    const ship = g.ship;
    const sub = g.sub;
    const where = ship.x > OPEN_SEA_X ? `${km(kmFromCoast(ship.x))} km dalla costa` : 'lungo la costa';
    el('p', 'port-hint', b, `Sei ${where}. L’autonomia è a tutto gas: andando piano dura di più.`);
    el('h3', '', b, 'Carburante');
    const grid = el('div', 'pcard-grid', b);
    portCard(grid, {
      icon: 'bolt',
      title: `Nave: ${Math.round(ship.fuel)} / ${SHIP.fuel.tank} L`,
      text: `Autonomia ${km(autonomyKm(ship.fuel, SHIP.fuel.perKm))} km. Si riempie in porto (scheda Mute).`,
    });
    if (sub.owned) {
      const m = subModel(sub.model);
      const docked = ship.bay === 'docked';
      const step = FUEL.transferStep;
      portCard(grid, {
        icon: 'bolt',
        title: `Sottomarino: ${Math.round(sub.fuel)} / ${m.tank} L`,
        text: `Autonomia ${km(autonomyKm(sub.fuel, m.perKm))} km.${docked ? '' : ' È fuori dalla stiva: il travaso si fa con il sottomarino a bordo.'}`,
        button: {
          label: `+${step} L dalla nave`,
          disabled: !docked || ship.fuel <= 0 || sub.fuel >= m.tank,
          onClick: () => {
            const l = transferFuel(g, true);
            this.say(`${Math.round(l)} L passati al sottomarino.`);
            this.render();
          },
        },
      });
      portCard(grid, {
        icon: 'bolt',
        title: 'Dal sottomarino alla nave',
        text: `Riporta ${step} L nel serbatoio della nave.`,
        button: {
          label: `+${step} L alla nave`,
          disabled: !docked || sub.fuel <= 0 || ship.fuel >= SHIP.fuel.tank,
          onClick: () => {
            const l = transferFuel(g, false);
            this.say(`${Math.round(l)} L passati alla nave.`);
            this.render();
          },
        },
      });
    }
    el('h3', '', b, 'Emergenza');
    const cost = Math.min(
      g.gear.teeth,
      Math.max(RESCUE.minTeeth, Math.floor(g.gear.teeth * RESCUE.teethShare)),
    );
    portCard(el('div', 'pcard-grid', b), {
      icon: 'star',
      title: 'Razzo di soccorso',
      text: 'Un rimorchiatore porta la nave al porto più vicino. Da usare se resti senza carburante.',
      price: cost,
      button: {
        label: 'Lancia il razzo',
        disabled: !canRescue(g),
        onClick: () => {
          rescue(g, g.story.pending); // its message shows in the sea
          this.session.emit('saveNow');
          this.onClose();
        },
      },
    });
  }

  destroy(): void {
    window.clearTimeout(this.msgTimer);
    this.root.parentElement?.classList.remove('in-port');
    this.root.remove();
  }
}
