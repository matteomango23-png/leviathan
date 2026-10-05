// The levers of the ship and the submarine (owner, 4 ottobre 2026: no joystick in a vehicle). Left: the throttle,
// it stays where you leave it. Right: the direction (west / east) and, in the submarine, the dive lever (it stays
// too, and snaps to the middle near it). At the bottom: the instruments (knots, throttle, depth) and, at the helm
// of the ship, its buttons (hatch, lower the submarine, dive off). Keyboard: W/S throttle, A/D direction,
// arrows up/down to rise and sink.
import { HELM } from '../data/ship';
import type { Session } from '../scenes/session';
import { diveOf, freshHelm } from '../systems/helm';
import { el } from './dom';

/** What the levers drive now, and what the instruments show (from the game, each frame). */
export interface HelmInfo {
  mode: 'ship' | 'sub';
  face: 1 | -1;
  knots: number;
  /** The ship's sonar (only at its helm): its line, and whether it is switched on. */
  sonar?: string;
  sonarOn?: boolean;
  /** The hunt you follow (pinned in the diary), shown at the helm. */
  objective?: string;
  /** Litres left, and how far they take you at the throttle you have now. */
  fuel: number;
  rangeKm: number;
  /** Submarine only: depth and the model's limit (m). */
  depthM?: number;
  maxDepthM?: number;
  /** The submarine's hull, now and whole (shown in its instruments). */
  hull?: [number, number];
  /** Ship only: which buttons work now. */
  hatchCanMove?: boolean;
  hatchOpen?: boolean;
  canLaunch?: boolean;
}

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
  private readonly sonar: HTMLDivElement;
  private sonarText = '';
  private readonly buttons: HTMLDivElement;
  private readonly hatchBtn: HTMLButtonElement;
  private readonly launchBtn: HTMLButtonElement;
  private readonly diveBtn: HTMLButtonElement;
  private readonly cockpitBtn: HTMLButtonElement;
  private readonly sonarBtn: HTMLButtonElement;
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

    this.sonar = el('div', 'helm-sonar', this.root);
    this.gauges = el('div', 'helm-gauges', this.root);
    this.buttons = el('div', 'helm-buttons', this.root);
    this.hatchBtn = el('button', 'helm-btn', this.buttons, 'Apri portellone');
    this.launchBtn = el('button', 'helm-btn', this.buttons, 'Cala sottomarino');
    this.diveBtn = el('button', 'helm-btn', this.buttons, 'Tuffati');
    this.sonarBtn = el('button', 'helm-btn', this.buttons, 'Sonar');
    this.cockpitBtn = el('button', 'helm-btn', this.buttons, 'Cockpit');
    this.rescueBtn = el('button', 'helm-btn helm-rescue', this.buttons, 'Razzo di soccorso');
    this.objective = el('div', 'helm-objective', this.root);

    this.listen(this.throttleTrack, 'pointerdown', (e) => this.grab(e, 'throttle'));
    this.listen(this.diveTrack, 'pointerdown', (e) => this.grab(e, 'dive'));
    this.listen(window, 'pointermove', (e) => this.drag(e));
    for (const t of ['pointerup', 'pointercancel'] as const)
      this.listen(window, t, (e) => this.dragging.delete(e.pointerId));
    this.tap(this.west, () => (this.session.input.helm.dir = -1));
    this.tap(this.east, () => (this.session.input.helm.dir = 1));
    this.tap(this.hatchBtn, () => (this.session.input.helmCmd = 'hatch'));
    this.tap(this.launchBtn, () => (this.session.input.helmCmd = 'launch'));
    this.tap(this.diveBtn, () => (this.session.input.helmCmd = 'dive'));
    this.tap(this.cockpitBtn, () => this.session.emit('openCockpit'));
    this.tap(this.sonarBtn, () => (this.session.input.helmCmd = 'sonar'));
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

  releaseAll(): void {
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
    if (!info) return;
    const k = this.keys;
    if (k.has('w')) helm.throttle = Math.min(1, helm.throttle + HELM.keyThrottlePerSec * dt);
    if (k.has('s')) helm.throttle = Math.max(0, helm.throttle - HELM.keyThrottlePerSec * dt);
    // keyboard: the arrows hold the dive lever up or down; let go, it goes back to the middle
    const held = k.has('arrowup') || k.has('arrowdown');
    if (info.mode === 'sub' && ![...this.dragging.values()].includes('dive')) {
      if (held) helm.dive = k.has('arrowup') ? -1 : 1;
      else if (this.keyDive) helm.dive = 0;
    }
    this.keyDive = held;

    this.throttleKnob.style.transform = `translateY(${-helm.throttle * TRACK}px)`;
    this.diveWrap.hidden = info.mode !== 'sub';
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
    for (const b of [this.hatchBtn, this.launchBtn, this.diveBtn, this.sonarBtn, this.cockpitBtn])
      b.hidden = info.mode !== 'ship';
    this.sonarBtn.textContent = info.sonarOn ? 'Sonar: acceso' : 'Sonar: spento';
    this.sonarBtn.classList.toggle('on', !!info.sonarOn);
    this.objective.hidden = !info.objective;
    if (info.objective && this.objective.textContent !== info.objective)
      this.objective.textContent = info.objective;
    this.hatchBtn.textContent = info.hatchOpen ? 'Chiudi portellone' : 'Apri portellone';
    this.hatchBtn.classList.toggle('off', !info.hatchCanMove);
    this.launchBtn.hidden = !info.canLaunch;
    this.rescueBtn.hidden = info.fuel > 0;
    this.gauges.classList.toggle('dry', info.fuel <= 0);
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.root.remove();
  }
}
