// Touch and keyboard controls → InputState (port of the prototype's input section).
// Left 55% of the screen: a joystick appears where you put your thumb.
// Right: harpoon button (hold to fire, drag to aim), dash button; tapping the water shoots there.
import type { Session } from '../scenes/session';
import { el, isTouchDevice } from './dom';

const STICK_RADIUS = 48; // CSS px
const AIM_DEADZONE = 10;
const AIM_TRAVEL = 26;

export class Controls {
  private readonly keys = new Set<string>();
  private joy = { id: -1, sx: 0, sy: 0, x: 0, y: 0 };
  private harpoonId = -1;
  private harpoonStart = { x: 0, y: 0 };
  private aimAngle: number | null = null;
  private harpoonHeld = false;
  private readonly stick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly harpoonBtn: HTMLButtonElement;
  private readonly dashBtn: HTMLButtonElement;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    root: HTMLElement,
    private readonly session: Session,
    onPause: () => void,
  ) {
    if (!isTouchDevice()) root.classList.add('no-touch');
    const left = el('div', 'touch-zone touch-left', root);
    const right = el('div', 'touch-zone touch-right', root);
    this.stick = el('div', 'stick touch-only', root);
    this.knob = el('div', 'stick-knob', this.stick);
    this.stick.hidden = true;
    const row = el('div', 'act-row touch-only', root);
    this.dashBtn = el('button', 'act act-dash', row, 'Scatto');
    this.harpoonBtn = el('button', 'act act-harpoon', row, 'Fucile');
    const pause = el('button', 'pause-btn', root, 'II');
    pause.setAttribute('aria-label', 'Pausa');

    this.listen(left, 'pointerdown', (e) => this.joyStart(e));
    this.listen(window, 'pointermove', (e) => this.joyMove(e));
    this.listen(window, 'pointerup', (e) => this.joyEnd(e));
    this.listen(window, 'pointercancel', (e) => this.joyEnd(e));
    // tap on the water to shoot there (also mouse clicks on desktop)
    this.listen(right, 'pointerdown', (e) => this.tap(e));
    if (!isTouchDevice()) this.listen(left, 'pointerdown', (e) => this.tap(e));

    this.listen(this.harpoonBtn, 'pointerdown', (e) => this.harpoonDown(e));
    this.listen(this.harpoonBtn, 'pointermove', (e) => this.harpoonMove(e));
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      this.listen(this.harpoonBtn, t, (e) => this.harpoonUp(e));
    this.listen(this.dashBtn, 'pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.session.input.dash = true;
    });
    this.listen(pause, 'click', () => onPause());

    this.listen<KeyboardEvent>(window, 'keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if ((k === 'escape' || k === 'p') && !e.repeat) {
        onPause();
        return;
      }
      this.keys.add(k);
      if (e.repeat) return;
      const input = this.session.input;
      if (k === 'shift' || k === 'k') input.dash = true;
      else if (k === 'e') input.action = true;
      else if (k === ' ' || k === 'j') input.tameTap = true;
      else if (k >= '1' && k <= '5') input.summon = Number(k) - 1;
      else if (k === 'z' || k === 'x' || k === 'c') input.move = { z: 1, x: 2, c: 3 }[k];
      else if (k === 'r' || k === 't' || k === 'y') input.slot = { r: 0, t: 1, y: 2 }[k];
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

  private joyStart(e: PointerEvent): void {
    if (this.session.paused || e.pointerType === 'mouse' || this.joy.id !== -1) return;
    e.preventDefault();
    this.joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, y: 0 };
    this.stick.style.left = `${e.clientX}px`;
    this.stick.style.top = `${e.clientY}px`;
    this.knob.style.transform = 'translate(0,0)';
    this.stick.hidden = false;
  }

  private joyMove(e: PointerEvent): void {
    if (e.pointerId !== this.joy.id) return;
    let dx = e.clientX - this.joy.sx;
    let dy = e.clientY - this.joy.sy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) {
      dx *= STICK_RADIUS / d;
      dy *= STICK_RADIUS / d;
    }
    this.joy.x = dx / STICK_RADIUS;
    this.joy.y = dy / STICK_RADIUS;
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
  }

  private joyEnd(e: PointerEvent): void {
    if (e.pointerId !== this.joy.id) return;
    this.joy = { id: -1, sx: 0, sy: 0, x: 0, y: 0 };
    this.stick.hidden = true;
  }

  /** A mouse click shoots there (PC tests). On a phone only the weapon button shoots: a touch does nothing. */
  private tap(e: PointerEvent): void {
    if (this.session.paused) return;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.preventDefault();
    this.session.tapScreen = { x: e.clientX, y: e.clientY };
  }

  private harpoonDown(e: PointerEvent): void {
    if (this.session.paused) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      this.harpoonBtn.setPointerCapture(e.pointerId);
    } catch {
      // not supported: aiming still works while the finger stays on the button
    }
    this.harpoonId = e.pointerId;
    this.harpoonStart = { x: e.clientX, y: e.clientY };
    this.aimAngle = null;
    this.harpoonHeld = true;
    this.harpoonBtn.classList.add('on');
  }

  private harpoonMove(e: PointerEvent): void {
    if (e.pointerId !== this.harpoonId) return;
    const dx = e.clientX - this.harpoonStart.x;
    const dy = e.clientY - this.harpoonStart.y;
    const d = Math.hypot(dx, dy);
    if (d > AIM_DEADZONE) {
      this.aimAngle = Math.atan2(dy, dx);
      const k = Math.min(d, AIM_TRAVEL) / d;
      this.harpoonBtn.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    }
  }

  private harpoonUp(e: PointerEvent): void {
    if (e.pointerId !== this.harpoonId) return;
    this.harpoonId = -1;
    this.harpoonHeld = false;
    this.aimAngle = null;
    this.harpoonBtn.classList.remove('on');
    this.harpoonBtn.style.transform = '';
  }

  releaseAll(): void {
    this.keys.clear();
    this.joy = { id: -1, sx: 0, sy: 0, x: 0, y: 0 };
    this.stick.hidden = true;
    this.harpoonId = -1;
    this.harpoonHeld = false;
    this.aimAngle = null;
    this.harpoonBtn.classList.remove('on');
    this.harpoonBtn.style.transform = '';
  }

  /** Called every frame: writes the current controls into the session input. */
  update(dashReady: boolean): void {
    const input = this.session.input;
    const k = this.keys;
    let mx: number;
    let my: number;
    if (this.joy.id !== -1) {
      mx = this.joy.x;
      my = this.joy.y;
      if (Math.hypot(mx, my) < 0.15) mx = my = 0;
    } else {
      mx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
      my = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    }
    input.moveX = mx;
    input.moveY = my;
    input.fireHeld = this.harpoonHeld || k.has(' ') || k.has('j');
    input.aim = this.harpoonHeld ? this.aimAngle : null;
    this.dashBtn.classList.toggle('cooldown', !dashReady);
  }

  destroy(): void {
    for (const c of this.cleanup) c();
  }
}
