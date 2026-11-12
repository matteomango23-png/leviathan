// The levers' handling at the helm (split from helmControls.ts in the cleanup of 12 novembre 2026): one finger per
// lever, the keyboard (W/S gas, arrows up/down to rise and sink), and how they spring back when let go. In the
// submarine the gas goes back to zero and the dive lever to the middle (owner, 8 ottobre); B locks both where you
// leave them (owner, 25 ottobre and 12 novembre 2026); the ship's gas always stays.
import { HELM } from '../data/ship';
import type { Session } from '../scenes/session';
import { diveOf } from '../systems/helm';
import type { HelmInfo } from './helmTypes';

type Lever = 'throttle' | 'dive';

export class HelmLevers {
  /** B: the levers stay where you leave them. Kept until switched off, not saved. */
  lock = false;
  /** Keys held now (the keyboard on a computer). */
  readonly keys = new Set<string>();
  private mode: HelmInfo['mode'] | null = null;
  /** The ship at the helm is a U-Boat: its dive lever works like the submarine's. */
  private canDive = false;
  /** The arrow keys were held last frame (to let the dive lever go back to the middle when released). */
  private keyDive = false;
  /** One finger per lever (owner, 5 ottobre: throttle and dive together): pointer id → its lever. */
  private readonly dragging = new Map<number, Lever>();

  constructor(
    private readonly session: Session,
    private readonly tracks: Record<Lever, HTMLElement>,
  ) {}

  /** Into another vehicle (or out): no finger on the levers any more. */
  setMode(mode: HelmInfo['mode'] | null): void {
    this.mode = mode;
    this.dragging.clear();
  }

  grab(e: PointerEvent, lever: Lever): void {
    if (this.session.paused) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragging.set(e.pointerId, lever);
    this.drag(e);
  }

  /** The finger sets the lever where it is along the track (top = full throttle / rise). */
  drag(e: PointerEvent): void {
    const lever = this.dragging.get(e.pointerId);
    if (!lever) return;
    const r = this.tracks[lever].getBoundingClientRect();
    const share = Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)); // 0 bottom … 1 top
    const helm = this.session.input.helm;
    if (lever === 'throttle') helm.throttle = share;
    else helm.dive = diveOf(1 - share * 2); // top = rise (−1), bottom = sink (1)
  }

  /** A finger leaves its lever: in the submarine (and a U-Boat's dive lever) it springs back, unless locked. */
  letGo(pointerId: number): void {
    const lever = this.dragging.get(pointerId);
    this.dragging.delete(pointerId);
    if (!lever) return;
    const helm = this.session.input.helm;
    if (lever === 'dive' && (this.mode === 'sub' || this.canDive)) {
      if (!this.lock) helm.dive = 0;
    } else if (lever === 'throttle' && this.mode === 'sub' && !this.lock) helm.throttle = 0;
  }

  /** B: locked, or let go and both levers back at rest. */
  toggleLock(): void {
    this.lock = !this.lock;
    if (this.lock) return;
    this.session.input.helm.dive = 0;
    if (this.mode === 'sub') this.session.input.helm.throttle = 0;
  }

  releaseAll(): void {
    if (this.mode === 'sub' && !this.lock) {
      this.session.input.helm.throttle = 0;
      this.session.input.helm.dive = 0;
    }
    this.dragging.clear();
    this.keys.clear();
  }

  /** Each frame: the keyboard, and the submarine's gas springing back when nothing holds it. */
  step(info: HelmInfo, dt: number): void {
    const helm = this.session.input.helm;
    const k = this.keys;
    if (k.has('w')) helm.throttle = Math.min(1, helm.throttle + HELM.keyThrottlePerSec * dt);
    if (k.has('s')) helm.throttle = Math.max(0, helm.throttle - HELM.keyThrottlePerSec * dt);
    const holding = [...this.dragging.values()];
    if (info.mode === 'sub' && !k.has('w') && !holding.includes('throttle') && !this.lock) helm.throttle = 0;
    // the arrows hold the dive lever up or down; let go, it goes back to the middle (locked: it moves and stays)
    const held = k.has('arrowup') || k.has('arrowdown');
    this.canDive = !!info.canDive;
    if ((info.mode === 'sub' || this.canDive) && !holding.includes('dive')) {
      if (this.lock && held) {
        const step = HELM.keyThrottlePerSec * dt * (k.has('arrowup') ? -1 : 1);
        helm.dive = Math.max(-1, Math.min(1, helm.dive + step));
      } else if (held) helm.dive = k.has('arrowup') ? -1 : 1;
      else if (this.keyDive && !this.lock) helm.dive = 0;
    }
    this.keyDive = held;
  }
}
