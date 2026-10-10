// The levers of the ship and the submarine (owner, 4 ottobre 2026: no joystick in a vehicle). Left: the throttle;
// on the ship it stays where you leave it, in the submarine it springs back to zero (owner, 8 ottobre). Right: the
// direction (west / east) and, in the submarine, the dive lever (it springs back to the middle). At the bottom:
// the instruments (knots, throttle, depth) and, at the helm of the ship, its buttons (hatch, lower the submarine, dive off). Keyboard: W/S throttle, A/D direction,
// arrows up/down to rise and sink.
import { HELM } from '../data/ship';
import { HelmBars } from './helmBars';
import type { HelmInfo } from './helmTypes';
export type { HelmInfo } from './helmTypes';
import type { Session } from '../scenes/session';
import { diveOf, freshHelm } from '../systems/helm';
import { el } from './dom';

const TRACK = 150; // px: travel of the vertical levers

export class HelmControls {
  private readonly root: HTMLDivElement;
  private readonly throttleKnob: HTMLDivElement;
  private readonly throttleTrack: HTMLDivElement;
  private readonly diveWrap: HTMLDivElement;
  private readonly diveTrack: HTMLDivElement;
  private readonly diveKnob: HTMLDivElement;
  private readonly west: HTMLButtonElement;
  private readonly east: HTMLButtonElement;
  private readonly gauges: HTMLDivElement;
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
  private readonly cockpitBtn: HTMLButtonElement;
  /** Top left, over your teeth (owner, 9 ottobre): the tank at a glance, green → orange → red. */
  private readonly bars: HelmBars;
  private readonly objective: HTMLDivElement;
  private readonly rescueBtn: HTMLButtonElement;
  private mode: HelmInfo['mode'] | null = null;
  /** One finger per lever (owner, 5 ottobre: throttle and dive together): pointer id → its lever. */
  private readonly dragging = new Map<number, 'throttle' | 'dive'>();
  private readonly keys = new Set<string>();
  private readonly cleanup: (() => void)[] = [];
  private gaugeText = '';
  /** The arrow keys were held last frame (to let the dive lever go back to the middle when released). */
  private keyDive = false;
  /** The ship at the helm is a U-Boat: its dive lever works like the submarine's. */
  private canDive = false;

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
    const dir = el('div', 'helm-dir', right);
    this.west = el('button', 'helm-dir-btn', dir, '◀');
    this.east = el('button', 'helm-dir-btn', dir, '▶');

    // fixed bands (owner, 5 ottobre: nothing on top of anything): the instruments in the middle at the top, the
    // ship's buttons in a column on the right, the cockpit next to the pause button, the objective on the left
    const panel = el('div', 'helm-panel', this.root);
    this.gauges = el('div', 'helm-gauges', panel);
    // the sonar's line is its switch too
    this.sonar = el('button', 'helm-sonar', panel);
    this.buttons = el('div', 'helm-buttons', this.root);
    // the engine: a round on/off button left of the cockpit (owner, 9 ottobre), green running, red off
    const corner = el('div', 'helm-corner', this.root);
    this.engineBtn = el('button', 'helm-power', corner, '⏻');
    this.cockpitBtn = el('button', 'helm-btn helm-cockpit', corner, 'Cockpit');
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
    this.rescueBtn = el('button', 'helm-btn helm-rescue', this.buttons, 'Razzo di soccorso');
    this.trackerBtn = el('button', 'helm-btn helm-tracker', this.buttons, 'Tracker');
    this.objective = el('div', 'helm-objective', this.root);

    this.listen(this.throttleTrack, 'pointerdown', (e) => this.grab(e, 'throttle'));
    this.listen(this.diveTrack, 'pointerdown', (e) => this.grab(e, 'dive'));
    this.listen(window, 'pointermove', (e) => this.drag(e));
    for (const t of ['pointerup', 'pointercancel'] as const)
      this.listen(window, t, (e) => this.letGo(e.pointerId));
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
    this.tap(this.cockpitBtn, () => this.session.emit('openCockpit'));
    this.tap(this.sonar, () => (this.session.input.helmCmd = 'sonar'));
    this.tap(this.rescueBtn, () => (this.session.input.helmCmd = 'rescue'));
    this.listen<KeyboardEvent>(window, 'keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (!this.mode || e.repeat) return;
      if (k === 'a' || k === 'arrowleft') this.session.input.helm.dir = -1;
      if (k === 'd' || k === 'arrowright') this.session.input.helm.dir = 1;
    });
    this.listen<KeyboardEvent>(window, 'keyup', (e) => this.keys.delete(e.key.toLowerCase()));
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

  private grab(e: PointerEvent, lever: 'throttle' | 'dive'): void {
    if (this.session.paused) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragging.set(e.pointerId, lever);
    this.drag(e);
  }

  /** The finger sets the lever where it is along the track (top = full throttle / rise). */
  private drag(e: PointerEvent): void {
    const lever = this.dragging.get(e.pointerId);
    if (!lever) return;
    const track = lever === 'throttle' ? this.throttleTrack : this.diveTrack;
    const r = track.getBoundingClientRect();
    const share = Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)); // 0 bottom … 1 top
    const helm = this.session.input.helm;
    if (lever === 'throttle') helm.throttle = share;
    else helm.dive = diveOf(1 - share * 2); // top = rise (−1), bottom = sink (1)
  }

  /** A finger leaves its lever. In the submarine the levers spring back (owner, 8 ottobre): the gas to zero, the dive
   *  lever to the middle; the ship's throttle stays where you leave it. */
  private letGo(pointerId: number): void {
    const lever = this.dragging.get(pointerId);
    this.dragging.delete(pointerId);
    if (!lever) return;
    const helm = this.session.input.helm;
    // the dive lever springs back in the submarine and in a U-Boat; only the submarine's gas does
    if (lever === 'dive' && (this.mode === 'sub' || this.canDive)) helm.dive = 0;
    else if (lever === 'throttle' && this.mode === 'sub') helm.throttle = 0;
  }

  releaseAll(): void {
    if (this.mode === 'sub') Object.assign(this.session.input.helm, { throttle: 0, dive: 0 });
    this.dragging.clear();
    this.keys.clear();
  }

  /** Called every frame with what the levers drive now (null: you swim, the levers hide). */
  update(info: HelmInfo | null, dt: number): void {
    const helm = this.session.input.helm;
    if ((info?.mode ?? null) !== this.mode) {
      // climbing in: the levers start at rest, pointing where the vehicle points
      Object.assign(helm, freshHelm(info?.face ?? 1));
      this.mode = info?.mode ?? null;
      this.dragging.clear();
    }
    this.root.hidden = !info;
    // driving a vehicle: no hearts, air or team on screen (owner, 9 ottobre), only what the vehicle needs
    this.root.parentElement?.classList.toggle('at-helm', !!info);
    if (!info) return;
    const k = this.keys;
    if (k.has('w')) helm.throttle = Math.min(1, helm.throttle + HELM.keyThrottlePerSec * dt);
    if (k.has('s')) helm.throttle = Math.max(0, helm.throttle - HELM.keyThrottlePerSec * dt);
    // the submarine's gas springs back to zero when W is let go (and no finger holds it)
    const holdingGas = k.has('w') || [...this.dragging.values()].includes('throttle');
    if (info.mode === 'sub' && !holdingGas) helm.throttle = 0;
    // keyboard: the arrows hold the dive lever up or down; let go, it goes back to the middle
    const held = k.has('arrowup') || k.has('arrowdown');
    this.canDive = !!info.canDive;
    if ((info.mode === 'sub' || this.canDive) && ![...this.dragging.values()].includes('dive')) {
      if (held) helm.dive = k.has('arrowup') ? -1 : 1;
      else if (this.keyDive) helm.dive = 0;
    }
    this.keyDive = held;

    this.throttleKnob.style.transform = `translateY(${-helm.throttle * TRACK}px)`;
    this.diveWrap.hidden = info.mode !== 'sub' && !info.canDive;
    // with the dive lever at the far right, the context button (Porto, Esci) moves left over the arrows
    this.root.parentElement?.classList.toggle('helm-diving', !this.diveWrap.hidden);
    this.diveKnob.style.transform = `translateY(${-((1 - helm.dive) / 2) * TRACK}px)`;
    this.west.classList.toggle('on', helm.dir === -1);
    this.east.classList.toggle('on', helm.dir === 1);

    const parts = [
      `${Math.round(info.knots)} nodi`,
      `gas ${Math.round(helm.throttle * 100)}%`,
      `${Math.round(info.fuel)} L · ${info.rangeKm < 10 ? info.rangeKm.toFixed(1).replace('.', ',') : Math.round(info.rangeKm)} km`,
    ];
    if (info.depthM !== undefined) parts.push(`${Math.round(info.depthM)} / ${info.maxDepthM} m`);
    if (info.hull) parts.push(`scafo ${Math.round(info.hull[0])}/${info.hull[1]}`);
    if (info.drums) parts.push(`fusti ${Math.round(info.drums[0])}/${info.drums[1]} L`);
    const text = parts.join(' · ');
    if (text !== this.gaugeText) {
      this.gaugeText = text;
      this.gauges.textContent = text;
    }
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
    this.cockpitBtn.hidden = info.mode !== 'ship';
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
    const w = Math.ceil(info.mouth?.wait ?? 0);
    const lightText = info.mouth
      ? info.mouth.open
        ? 'Chiudi bocca'
        : w > 0
          ? `Bocca ${Math.floor(w / 60)}:${String(w % 60).padStart(2, '0')}`
          : 'Apri bocca'
      : info.lightOn
        ? 'Spegni luce'
        : 'Luce';
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
    this.gauges.classList.toggle('dry', info.fuel <= 0);
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.root.remove();
  }
}
