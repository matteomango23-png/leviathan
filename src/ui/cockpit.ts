// The cockpit of the ship (owner, 4-5 ottobre 2026: the centre of planning), full screen like a harbour: the sonar
// screen (sonarScreen.ts, first), the bridge (bridgePanel.ts), the hunting diary, the pen (your team) and the
// backpack. The sea goes on under it: a button sails the ship slowly (under the sonar's limit) or stops it, and the
// speed shows live.
import { SHIP } from '../data/ship';
import type { Session } from '../scenes/session';
import { knotsOf } from '../systems/helm';
import { shipTopSpeed } from '../systems/ship/ship';
import type { GameState } from '../systems/game';
import { renderBridge } from './bridgePanel';
import { el } from './dom';
import { icon, type IconName } from './icons';
import { renderBackpack, type TabContext } from './portTabs';
import type { CockpitTab } from '../data/fleet';
import { shipModel } from '../systems/ship/model';
import { renderSonar } from './sonarScreen';
import { renderTeamPanel } from './teamPanel';
import { renderDiary } from './huntDiary';
import './cockpit.css';
import './cockpitSteam.css';
import { STEAM_BRIDGE, STEAM_FRAME, STEAM_LIST, STEAM_SONAR, type Rect } from '../data/cockpitSteam';
import { renderBridgeSteam } from './bridgeSteam';
import { crop, place } from './steamStage';
import { renderReconTab } from './reconPanel';

type Tab = CockpitTab;
const TABS: [Tab, string, IconName][] = [
  ['sonar', 'Sonar', 'dive'],
  ['plancia', 'Plancia', 'lamp'],
  ['drone', 'Drone', 'school'], // the Nightmare's drone report, above the diary (owner, 9 ottobre)
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
  private tab: Tab = 'sonar';
  private droneSeen = '';
  private readonly engine: HTMLButtonElement;
  private readonly engineOff: HTMLButtonElement;
  private readonly speed: HTMLSpanElement;
  private tick = 0;
  private ticks = 0;
  private msgTimer = 0;
  private stopSonar: (() => void) | null = null;
  /** The steam cockpit's stage (its painted screens), when the ship has one. */
  private readonly stage: HTMLDivElement | null = null;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly g: GameState,
    private readonly onClose: () => void,
  ) {
    const look = shipModel(g.ship).cockpitStyle;
    this.root = el('div', `port cockpit${look ? ` style-${look}` : ''}`, parent);
    // the steam cockpit: everything on the owner's painted screens, on a stage of their shape (cockpitSteam.ts)
    if (look === 'vapore') {
      crop(el('div', 'steam-backdrop', this.root), 'dragons', [0, 0, 100, 100]);
      this.stage = el('div', 'steam-stage', this.root);
    }
    const host = this.stage ?? this.root;
    parent.classList.add('in-port'); // the sea's controls hide while the cockpit is open
    const top = el('div', 'port-top', host);
    el('span', '', el('div', 'port-title', top), 'Cockpit');
    // the engine from here: slow ahead (the sonar still hears) or stop
    this.speed = el('span', 'cockpit-speed', top);
    this.engine = el('button', 'console-btn cockpit-engine', top);
    this.engine.addEventListener('click', () => this.toggleEngine());
    // switched off it burns nothing (owner, 8 ottobre); the throttle starts it again
    this.engineOff = el('button', 'console-btn cockpit-engine', top);
    this.engineOff.addEventListener('click', () => {
      if (this.g.ship.engineOn) this.session.input.helmCmd = 'engine';
    });
    this.teeth = el('span', 'port-teeth', top);
    const back = el('button', 'pbtn primary', top);
    back.append(icon('lamp'), document.createTextNode(' Al timone'));
    back.addEventListener('click', () => onClose());
    const rail = el('div', 'port-rail', host);
    const own = shipModel(g.ship).cockpit; // each ship its own instruments (owner, 8 ottobre)
    for (const [id, label, ic] of TABS.filter(([t]) => own.includes(t))) {
      const b = el('button', 'port-tab', rail);
      b.append(icon(ic), el('span', '', undefined, label));
      b.addEventListener('click', () => {
        this.tab = id;
        this.render();
      });
      b.dataset.tab = id;
      this.tabs.push(b);
    }
    this.body = el('div', 'port-body', host);
    this.msg = el('div', 'port-msg', this.root);
    if (this.stage) {
      const F = STEAM_FRAME;
      place(top.querySelector('.port-title') as HTMLElement, F.title);
      place(this.speed, F.top.speed);
      place(this.engine, F.top.cruise);
      place(this.engineOff, F.top.engine);
      place(this.teeth, F.top.teeth);
      crop(place(back, F.top.helm), F.brass.art as 'chart', F.brass.rect);
      this.tabs.forEach((b, i) => place(b, F.tabs[i] ?? F.tabs[F.tabs.length - 1]!));
    }
    this.render();
    this.live();
    this.tick = window.setInterval(() => this.live(), 500);
  }

  /** The throttle that keeps the ship under the sonar's limit (SHIP.sonar.cruiseKnots). */
  private cruise(): number {
    return Math.min(1, SHIP.sonar.cruiseKnots / knotsOf(shipTopSpeed(this.g.ship)));
  }

  private toggleEngine(): void {
    const helm = this.session.input.helm;
    const going = helm.throttle > 0.01;
    helm.throttle = going ? 0 : this.cruise();
    helm.dir = this.g.ship.face;
    this.live();
  }

  /** Twice a second: the speed and the engine button; the bridge redraws once a second. */
  private live(): void {
    const kn = Math.round(knotsOf(this.g.ship.speed));
    const going = this.session.input.helm.throttle > 0.01;
    this.speed.textContent = `${kn} nodi`;
    this.engine.textContent = going ? '■ Ferma i motori' : `▶ Avanti adagio (${SHIP.sonar.cruiseKnots} nodi)`;
    this.engine.classList.toggle('on', going);
    this.engineOff.textContent = this.g.ship.engineOn ? '⏻ Spegni motore' : '⏻ Motore spento';
    this.engineOff.disabled = !this.g.ship.engineOn;
    if (this.tab === 'plancia' && this.ticks++ % 2 === 1) this.render();
    // the drone's report shows as soon as it is back
    const r = this.g.gadgets.recon;
    const drone = `${r.phase}:${r.report?.length ?? -1}`;
    if (this.tab === 'drone' && drone !== this.droneSeen) this.render();
    this.droneSeen = drone;
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
      (this.stage ? renderBridgeSteam : renderBridge)(this.body, {
        ...ctx,
        fired: () => {
          this.session.emit('saveNow');
          this.onClose();
        },
      });
    else if (this.tab === 'sonar') this.stopSonar = renderSonar(this.body, this.g, redraw);
    else if (this.tab === 'diario') renderDiary(this.body, this.g, redraw);
    else if (this.tab === 'zaino') renderBackpack(this.body, ctx);
    else if (this.tab === 'drone') renderReconTab(this.body, this.g, this.session, (t) => this.say(t));
    else renderTeamPanel(this.body, this.g, true);
    if (this.stage) this.dressSteam();
    this.body.scrollTop = keep;
  }

  /** The steam cockpit: the picture behind this tab, the lit tab, and where the tab's content sits on it. */
  private dressSteam(): void {
    const stage = this.stage!;
    const F = STEAM_FRAME;
    crop(stage, this.tab === 'plancia' ? 'chart' : 'frame', [0, 0, 100, 100]);
    for (const t of this.tabs) {
      const on = t.dataset.tab === this.tab;
      crop(t, 'frame', on ? F.tabOn.rect : F.tabOff.rect);
    }
    const b = this.body;
    b.dataset.steam = this.tab;
    b.style.backgroundImage = '';
    if (this.tab === 'sonar') {
      place(b, [0, 0, 100, 100]);
      const S = STEAM_SONAR;
      const at = (sel: string, r: Rect): void => {
        const e = b.querySelector<HTMLElement>(sel);
        if (e) place(e, r);
      };
      at('.sonar-status', S.status);
      at('.sonar-switch', S.switch);
      at('.sonar-frame', S.screen);
      at('.sonar-legend', [S.screen[0] + 1, S.screen[3] - 4.5, S.screen[2] - 1, S.screen[3] - 0.5]);
    } else if (this.tab === 'plancia') place(b, STEAM_BRIDGE.window);
    else crop(place(b, STEAM_LIST.window), 'dragons', STEAM_LIST.dragons);
  }

  destroy(): void {
    window.clearInterval(this.tick);
    this.stopSonar?.();
    window.clearTimeout(this.msgTimer);
    this.root.parentElement?.classList.remove('in-port');
    this.root.remove();
  }
}
