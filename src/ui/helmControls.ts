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
  /** Submarine only: depth and the model's limit (m). */
  depthM?: number;
  maxDepthM?: number;
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
  private readonly buttons: HTMLDivElement;
  private readonly hatchBtn: HTMLButtonElement;
  private readonly launchBtn: HTMLButtonElement;
  private readonly diveBtn: HTMLButtonElement;
  private mode: HelmInfo['mode'] | null = null;
  private dragging: { lever: 'throttle' | 'dive'; id: number } | null = null;
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

    this.gauges = el('div', 'helm-gauges', this.root);
    this.buttons = el('div', 'helm-buttons', this.root);
    this.hatchBtn = el('button', 'helm-btn', this.buttons, 'Apri portellone');
    this.launchBtn = el('button', 'helm-btn', this.buttons, 'Cala sottomarino');
    this.diveBtn = el('button', 'helm-btn', this.buttons, 'Tuffati');

    this.listen(this.throttleTrack, 'pointerdown', (e) => this.grab(e, 'throttle'));
    this.listen(this.diveTrack, 'pointerdown', (e) => this.grab(e, 'dive'));
    this.listen(window, 'pointermove', (e) => this.drag(e));
    for (const t of ['pointerup', 'pointercancel'] as const)
      this.listen(window, t, (e) => {
        if (this.dragging?.id === e.pointerId) this.dragging = null;
      });
    this.tap(this.west, () => (this.session.input.helm.dir = -1));
    this.tap(this.east, () => (this.session.input.helm.dir = 1));
    this.tap(this.hatchBtn, () => (this.session.input.helmCmd = 'hatch'));
    this.tap(this.launchBtn, () => (this.session.input.helmCmd = 'launch'));
    this.tap(this.diveBtn, () => (this.session.input.helmCmd = 'dive'));
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
    this.dragging = { lever, id: e.pointerId };
    this.drag(e);
  }

  /** The finger sets the lever where it is along the track (top = full throttle / rise). */
  private drag(e: PointerEvent): void {
    if (!this.dragging || e.pointerId !== this.dragging.id) return;
    const track = this.dragging.lever === 'throttle' ? this.throttleTrack : this.diveTrack;
    const r = track.getBoundingClientRect();
    const share = Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)); // 0 bottom … 1 top
    const helm = this.session.input.helm;
    if (this.dragging.lever === 'throttle') helm.throttle = share;
    else helm.dive = diveOf(1 - share * 2); // top = rise (−1), bottom = sink (1)
  }

  releaseAll(): void {
    this.dragging = null;
    this.keys.clear();
  }

  /** Called every frame with what the levers drive now (null: you swim, the levers hide). */
  update(info: HelmInfo | null, dt: number): void {
    const helm = this.session.input.helm;
    if ((info?.mode ?? null) !== this.mode) {
      // climbing in: the levers start at rest, pointing where the vehicle points
      Object.assign(helm, freshHelm(info?.face ?? 1));
      this.mode = info?.mode ?? null;
      this.dragging = null;
    }
    this.root.hidden = !info;
    if (!info) return;
    const k = this.keys;
    if (k.has('w')) helm.throttle = Math.min(1, helm.throttle + HELM.keyThrottlePerSec * dt);
    if (k.has('s')) helm.throttle = Math.max(0, helm.throttle - HELM.keyThrottlePerSec * dt);
    // keyboard: the arrows hold the dive lever up or down; let go, it goes back to the middle
    const held = k.has('arrowup') || k.has('arrowdown');
    if (info.mode === 'sub' && !this.dragging) {
      if (held) helm.dive = k.has('arrowup') ? -1 : 1;
      else if (this.keyDive) helm.dive = 0;
    }
    this.keyDive = held;

    this.throttleKnob.style.transform = `translateY(${-helm.throttle * TRACK}px)`;
    this.diveWrap.hidden = info.mode !== 'sub';
    this.diveKnob.style.transform = `translateY(${-((1 - helm.dive) / 2) * TRACK}px)`;
    this.west.classList.toggle('on', helm.dir === -1);
    this.east.classList.toggle('on', helm.dir === 1);

    const parts = [`${Math.round(info.knots)} nodi`, `gas ${Math.round(helm.throttle * 100)}%`];
    if (info.depthM !== undefined) parts.push(`${Math.round(info.depthM)} / ${info.maxDepthM} m`);
    const text = parts.join(' · ');
    if (text !== this.gaugeText) {
      this.gaugeText = text;
      this.gauges.textContent = text;
    }
    this.buttons.hidden = info.mode !== 'ship';
    this.hatchBtn.textContent = info.hatchOpen ? 'Chiudi portellone' : 'Apri portellone';
    this.hatchBtn.classList.toggle('off', !info.hatchCanMove);
    this.launchBtn.hidden = !info.canLaunch;
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.root.remove();
  }
}
