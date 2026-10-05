// The cockpit of the ship (owner, 4-5 ottobre 2026: the centre of planning), full screen like a harbour: the
// bridge (bridgePanel.ts), the sonar screen (sonarScreen.ts), the hunting diary, the pen (your team) and the
// backpack.
import type { Session } from '../scenes/session';
import type { GameState } from '../systems/game';
import { renderBridge } from './bridgePanel';
import { el } from './dom';
import { icon, type IconName } from './icons';
import { renderBackpack, type TabContext } from './portTabs';
import { renderSonar } from './sonarScreen';
import { renderTeamPanel } from './teamPanel';
import { renderDiary } from './huntDiary';
import './cockpit.css';

type Tab = 'plancia' | 'sonar' | 'diario' | 'recinto' | 'zaino';
const TABS: [Tab, string, IconName][] = [
  ['plancia', 'Plancia', 'lamp'],
  ['sonar', 'Sonar', 'dive'],
  ['diario', 'Diario', 'scroll'],
  ['recinto', 'Recinto', 'pen'],
  ['zaino', 'Zaino', 'backpack'],
];

export class Cockpit {
  private readonly root: HTMLDivElement;
  private readonly teeth: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private readonly msg: HTMLDivElement;
  private readonly tabs: HTMLButtonElement[] = [];
  private tab: Tab = 'plancia';
  private msgTimer = 0;
  private stopSonar: (() => void) | null = null;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly g: GameState,
    private readonly onClose: () => void,
  ) {
    this.root = el('div', 'port cockpit', parent);
    session.sound.updateEngines(null, null); // the sea stands still while you plan
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
    this.stopSonar?.();
    this.stopSonar = null;
    this.body.replaceChildren();
    this.body.classList.toggle('is-sonar', this.tab === 'sonar');
    const redraw = (): void => this.render();
    const ctx: TabContext = { g: this.g, say: (t, e) => this.say(t, e), redraw };
    if (this.tab === 'plancia')
      renderBridge(this.body, {
        ...ctx,
        fired: () => {
          this.session.emit('saveNow');
          this.onClose();
        },
      });
    else if (this.tab === 'sonar') this.stopSonar = renderSonar(this.body, this.g, this.session, redraw);
    else if (this.tab === 'diario') renderDiary(this.body, this.g, redraw);
    else if (this.tab === 'zaino') renderBackpack(this.body, ctx);
    else renderTeamPanel(this.body, this.g, true);
    this.body.scrollTop = keep;
  }

  destroy(): void {
    this.stopSonar?.();
    window.clearTimeout(this.msgTimer);
    this.root.parentElement?.classList.remove('in-port');
    this.root.remove();
  }
}
