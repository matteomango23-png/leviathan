// The levers of the ship and the submarine (owner, 4 ottobre 2026: no joystick in a vehicle). Left: the throttle;
// on the ship it stays where you leave it, in the submarine it springs back to zero (owner, 8 ottobre). Right: the
// direction (west / east) and, in the submarine, the dive lever (it springs back to the middle). At the bottom:
// the instruments (knots, throttle, depth) and, at the helm of the ship, its buttons (hatch, lower the submarine, dive off). Keyboard: W/S throttle, A/D direction,
// arrows up/down to rise and sink.
import { HelmBars } from './helmBars';
import type { HelmInfo } from './helmTypes';
export type { HelmInfo } from './helmTypes';
import type { Session } from '../scenes/session';
import { freshHelm } from '../systems/helm';
import { HelmLevers } from './helmLevers';
import { el } from './dom';
import { HelmDials } from './helmDials';
import { lightLabel, travel } from './helmGauges';

export class HelmControls {
  private readonly root: HTMLDivElement;
  private readonly throttleKnob: HTMLDivElement;
  private readonly throttleTrack: HTMLDivElement;
  private readonly diveWrap: HTMLDivElement;
  private readonly diveTrack: HTMLDivElement;
  private readonly diveKnob: HTMLDivElement;
  /** The dive lever's lock (owner, 25 ottobre): on, the lever stays where you leave it (a slow steady dive while you
   *  look at the cockpit); off, it springs back to the middle. Kept until switched off, not saved. */
  private readonly lockBtn: HTMLButtonElement;
  private readonly west: HTMLButtonElement;
  private readonly east: HTMLButtonElement;
  private readonly dials: HelmDials;
  private readonly sonar: HTMLButtonElement;
  private sonarText = '';
  private readonly buttons: HTMLDivElement;
  private readonly hatchBtn: HTMLButtonElement;
  private readonly hatch2Btn: HTMLButtonElement;
  private readonly launchBtn: HTMLButtonElement;
  private readonly launchBoatBtn: HTMLButtonElement;
  private readonly engineBtn: HTMLButtonElement;
  private readonly diveBtn: HTMLButtonElement;
  private readonly reconBtn: HTMLButtonElement;
  private readonly sphereBtn: HTMLButtonElement;
  private readonly trackerBtn: HTMLButtonElement;
  private readonly lightBtn: HTMLButtonElement;
  private readonly nightBtn: HTMLButtonElement;
  private readonly sleepBtn: HTMLButtonElement;
  private readonly cockpitBtn: HTMLButtonElement;
  /** Top left, over your teeth (owner, 9 ottobre): the tank at a glance, green → orange → red. */
  private readonly bars: HelmBars;
  private readonly objective: HTMLDivElement;
  private readonly rescueBtn: HTMLButtonElement;
  private mode: HelmInfo['mode'] | null = null;
  /** The levers' fingers, keys and lock (ui/helmLevers.ts). */
  private readonly levers: HelmLevers;
  private readonly cleanup: (() => void)[] = [];
  private readonly poolMark: HTMLSpanElement;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
  ) {
    this.root = el('div', 'helm', parent);
    this.root.hidden = true;

    const left = el('div', 'helm-lever helm-throttle', this.root);
    el('div', 'helm-label', left, 'Gas');
    this.throttleTrack = el('div', 'helm-track', left);
    this.throttleKnob = el('div', 'helm-knob', this.throttleTrack);

    const right = el('div', 'helm-right', this.root);
    this.diveWrap = el('div', 'helm-lever helm-dive', right);
    el('div', 'helm-label', this.diveWrap, 'Sali / Scendi');
    this.diveTrack = el('div', 'helm-track helm-track-mid', this.diveWrap);
    this.diveKnob = el('div', 'helm-knob', this.diveTrack);
    this.lockBtn = el('button', 'helm-lock', this.diveWrap, 'B');
    this.lockBtn.title = 'Blocca le leve: Gas e Sali/Scendi restano dove le lasci';
    const dir = el('div', 'helm-dir', right);
    this.west = el('button', 'helm-dir-btn', dir, '◀');
    this.east = el('button', 'helm-dir-btn', dir, '▶');

    // fixed bands (owner, 5 ottobre: nothing on top of anything): the instruments in the middle at the top, the
    // ship's buttons in a column on the right, the cockpit next to the pause button, the objective on the left
    const panel = el('div', 'helm-panel', this.root);
    this.dials = new HelmDials(panel);
    // the sonar's line is its switch too
    this.sonar = el('button', 'helm-sonar', panel);
    this.buttons = el('div', 'helm-buttons', this.root);
    // the engine: a round on/off button left of the cockpit (owner, 9 ottobre), green running, red off
    const corner = el('div', 'helm-corner', this.root);
    this.engineBtn = el('button', 'helm-power', corner, '⏻');
    this.cockpitBtn = el('button', 'helm-btn helm-cockpit', corner, 'Cockpit');
    // beasts resting in the pool: a small mark on it (owner, 20 ottobre: the pool's words ran over the engine)
    this.poolMark = el('span', 'helm-pool-mark', this.cockpitBtn);
    this.bars = new HelmBars(this.root);
    // the buttons that work only with the ship still, in one group that fades as a whole (owner, 9 ottobre: on the
    // iPhone fading them one by one over the game left them half drawn)
    const still = el('div', 'helm-still', this.buttons);
    // each hatch with what it lets out under it (the Nightmare's: the drone scouts, the sphere goes)
    this.hatchBtn = el('button', 'helm-btn', still, 'Apri portellone');
    this.launchBtn = el('button', 'helm-btn', still, 'Cala sottomarino');
    this.reconBtn = el('button', 'helm-btn', still, 'Ricognizione');
    this.hatch2Btn = el('button', 'helm-btn', still, 'Apri portellone');
    this.launchBoatBtn = el('button', 'helm-btn', still, 'Cala motoscafo');
    this.sphereBtn = el('button', 'helm-btn', still, 'Invia sfera');
    this.diveBtn = el('button', 'helm-btn', still, 'Tuffati');
    this.lightBtn = el('button', 'helm-btn helm-light', still, 'Luce');
    this.sleepBtn = el('button', 'helm-btn', still, 'Dormi'); // the time runs fast (lot N1, ui/sleepOverlay.ts)
    this.rescueBtn = el('button', 'helm-btn helm-rescue', this.buttons, 'Razzo di soccorso');
    this.trackerBtn = el('button', 'helm-btn helm-tracker', this.buttons, 'Tracker');
    this.nightBtn = el('button', 'helm-btn helm-night', this.buttons, 'Visione notturna');
    this.objective = el('div', 'helm-objective', this.root);
    // the step-by-step tutorial lights these (data/coach.ts)
    const coach: [HTMLElement, string][] = [
      [left, 'helm-throttle'],
      [dir, 'helm-dir'],
      [this.engineBtn, 'helm-engine'],
      [this.sonar, 'helm-sonar'],
      [this.diveWrap, 'helm-dive-lever'],
      [this.launchBtn, 'helm-launch'],
      [this.lightBtn, 'helm-light'],
      [this.sleepBtn, 'helm-sleep'],
      [this.diveBtn, 'helm-swim'],
      [this.rescueBtn, 'helm-rescue'],
      [this.cockpitBtn, 'helm-cockpit'],
    ];
    for (const [e, name] of coach) e.dataset.coach = name;

    this.levers = new HelmLevers(session, { throttle: this.throttleTrack, dive: this.diveTrack });
    this.listen(this.throttleTrack, 'pointerdown', (e) => this.levers.grab(e, 'throttle'));
    this.listen(this.diveTrack, 'pointerdown', (e) => this.levers.grab(e, 'dive'));
    this.listen(window, 'pointermove', (e) => this.levers.drag(e));
    for (const t of ['pointerup', 'pointercancel'] as const)
      this.listen(window, t, (e) => this.levers.letGo(e.pointerId));
    this.tap(this.west, () => (this.session.input.helm.dir = -1));
    this.tap(this.east, () => (this.session.input.helm.dir = 1));
    this.tap(this.hatchBtn, () => (this.session.input.helmCmd = 'hatch'));
    this.tap(this.hatch2Btn, () => (this.session.input.helmCmd = 'hatch2'));
    this.tap(this.launchBtn, () => (this.session.input.helmCmd = 'launch'));
    this.tap(this.launchBoatBtn, () => (this.session.input.helmCmd = 'launchBoat'));
    this.tap(this.engineBtn, () => (this.session.input.helmCmd = 'engine'));
    this.tap(this.diveBtn, () => (this.session.input.helmCmd = 'dive'));
    this.tap(this.reconBtn, () => (this.session.input.helmCmd = 'recon'));
    this.tap(this.sphereBtn, () => (this.session.input.helmCmd = 'sphere'));
    this.tap(this.trackerBtn, () => (this.session.input.helmCmd = 'tracker'));
    this.tap(this.lightBtn, () => (this.session.input.helmCmd = 'light'));
    this.tap(this.sleepBtn, () => this.session.emit('askSleep'));
    this.tap(this.nightBtn, () => (this.session.input.helmCmd = 'night'));
    this.tap(this.cockpitBtn, () => this.session.emit('openCockpit'));
    this.tap(this.sonar, () => (this.session.input.helmCmd = 'sonar'));
    this.tap(this.rescueBtn, () => (this.session.input.helmCmd = 'rescue'));
    this.tap(this.lockBtn, () => this.levers.toggleLock());
    this.listen<KeyboardEvent>(window, 'keydown', (e) => {
      const k = e.key.toLowerCase();
      this.levers.keys.add(k);
      if (!this.mode || e.repeat) return;
      if (k === 'a' || k === 'arrowleft') this.session.input.helm.dir = -1;
      if (k === 'd' || k === 'arrowright') this.session.input.helm.dir = 1;
    });
    this.listen<KeyboardEvent>(window, 'keyup', (e) => this.levers.keys.delete(e.key.toLowerCase()));
    this.listen(window, 'blur', () => this.releaseAll());
  }

  private listen<E extends Event = PointerEvent>(
    target: EventTarget,
    type: string,
    fn: (e: E) => void,
  ): void {
    const h = fn as EventListener;
    target.addEventListener(type, h, { passive: false });
    this.cleanup.push(() => target.removeEventListener(type, h));
  }

  private tap(btn: HTMLElement, fn: () => void): void {
    this.listen(btn, 'pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.session.paused) fn();
    });
  }

  releaseAll(): void {
    this.levers.releaseAll();
  }

  /** Called every frame with what the levers drive now (null: you swim, the levers hide). */
  update(info: HelmInfo | null, dt: number): void {
    const helm = this.session.input.helm;
    if ((info?.mode ?? null) !== this.mode) {
      // climbing in: the levers start at rest, pointing where the vehicle points
      Object.assign(helm, freshHelm(info?.face ?? 1));
      this.mode = info?.mode ?? null;
      this.levers.setMode(this.mode);
    }
    this.root.hidden = !info;
    // driving a vehicle: no hearts, air or team on screen (owner, 9 ottobre), only what the vehicle needs
    this.root.parentElement?.classList.toggle('at-helm', !!info);
    if (!info) return;
    this.levers.step(info, dt);
    this.lockBtn.classList.toggle('on', this.levers.lock);

    this.throttleKnob.style.transform = `translateY(${-helm.throttle * travel(this.throttleTrack)}px)`;
    this.diveWrap.hidden = info.mode !== 'sub' && !info.canDive;
    // with the dive lever at the far right, the context button (Porto, Esci) moves left over the arrows
    this.root.parentElement?.classList.toggle('helm-diving', !this.diveWrap.hidden);
    this.diveKnob.style.transform = `translateY(${-((1 - helm.dive) / 2) * travel(this.diveTrack)}px)`;
    this.west.classList.toggle('on', helm.dir === -1);
    this.east.classList.toggle('on', helm.dir === 1);

    this.dials.update(info);
    const pool = info.poolCount ?? 0;
    this.poolMark.hidden = pool <= 0;
    if (pool > 0 && this.poolMark.textContent !== `≈${pool}`) this.poolMark.textContent = `≈${pool}`;
    this.sonar.hidden = !info.sonar;
    if (info.sonar && info.sonar !== this.sonarText) {
      this.sonarText = info.sonar;
      this.sonar.textContent = info.sonar;
      this.sonar.classList.toggle('anomaly', info.sonar.includes('anomala'));
    }
    this.buttons.classList.toggle('sub', info.mode !== 'ship');
    // under way the hatches and the dive cannot be used: they show only with the ship still (owner, 9 ottobre)
    const still = info.mode === 'ship' && info.still !== false;
    // they fade out under way and back in once still (owner, 9 ottobre: they popped in and out at once)
    const ship = info.mode === 'ship';
    for (const b of [this.hatchBtn, this.hatch2Btn]) b.hidden = !ship;
    // off the ship, and off the speedboat or jet ski when still (owner, 9 ottobre)
    this.diveBtn.hidden = (!ship && info.mode !== 'boat') || info.canDiveOff === false;
    // all together, as soon as the throttle moves (owner, 9 ottobre: they went one by one, seconds later, while a
    // heavy ship slowly got going); back once it is still with the throttle at zero
    this.buttons.classList.toggle('under-way', ship && (!still || helm.throttle > 0.01));
    // the abyssal submarine has a cockpit of its own (owner, 25 ottobre: hunting far from the ship)
    this.cockpitBtn.hidden = info.mode !== 'ship' && !info.subCockpit;
    this.nightBtn.hidden = info.night === undefined;
    this.nightBtn.classList.toggle('on', !!info.night);
    this.engineBtn.hidden = info.mode === 'sub';
    this.bars.update(
      info.fuel,
      info.tank,
      info.air,
      info.airMax,
      info.mode !== 'sub' ? info.hull : undefined, // the boat's and the ship's (block 5c)
    );
    this.sonar.classList.toggle('on', !!info.sonarOn);
    this.objective.hidden = !info.objective;
    if (info.objective && this.objective.textContent !== info.objective)
      this.objective.textContent = info.objective;
    const hatches = ship ? (info.hatches ?? []) : [];
    for (const [i, btn] of [this.hatchBtn, this.hatch2Btn].entries()) {
      const h = hatches[i];
      if (!h) {
        btn.hidden = true;
        continue;
      }
      if (btn.textContent !== h.text) btn.textContent = h.text;
      btn.classList.toggle('off', !info.hatchCanMove);
    }
    this.launchBtn.hidden = !info.canLaunch;
    const subLabel = `Cala ${info.subName ?? 'sottomarino'}`;
    if (this.launchBtn.textContent !== subLabel) this.launchBtn.textContent = subLabel;
    this.reconBtn.hidden = !info.canRecon;
    this.trackerBtn.hidden = !info.canTrack;
    this.lightBtn.hidden = !ship;
    this.sleepBtn.hidden = !ship;
    const lightText = lightLabel(info);
    if (this.lightBtn.textContent !== lightText) this.lightBtn.textContent = lightText;
    this.lightBtn.classList.toggle('on', !!info.lightOn);
    this.sphereBtn.hidden = !info.sphere;
    if (info.sphere && this.sphereBtn.textContent !== info.sphere.text)
      this.sphereBtn.textContent = info.sphere.text;
    this.sphereBtn.classList.toggle('off', !info.sphere?.ready);
    this.launchBoatBtn.hidden = !info.canLaunchBoat;
    const boatLabel = `Cala ${info.boatName ?? 'motoscafo'}`;
    if (this.launchBoatBtn.textContent !== boatLabel) this.launchBoatBtn.textContent = boatLabel;
    this.engineBtn.classList.toggle('on', !!info.engineOn);
    this.engineBtn.title = info.engineOn ? 'Spegni il motore' : 'Accendi il motore';
    // dry or broken down (block 5c); the boat crawls on its reserve
    this.rescueBtn.hidden = (info.fuel > 0 && !info.broken) || info.mode === 'boat';
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.root.remove();
  }
}
