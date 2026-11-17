// At the helm (owner, 17 novembre 2026): "Vista interna", the first person view from your ship, always there; with the
// arena's tick off, "Armi" with a Compagnia vessel near opens the side battle instead. In it, the gun —
// hold its button and drag to aim (the start of the arc shows in the sea: views/aimView.ts), let go to fire — and the
// torpedo for the ships that have one, each showing its reload. Out of battle no weapons.
import { WEAPONS } from '../data/company';
import type { Session } from '../scenes/session';
import { canArm } from '../systems/company/battle';
import { yourWeapon } from '../systems/company/yourFire';
import type { GameState } from '../systems/game';
import { el } from './dom';
import './naval.css';

/** Dragged less than this (CSS px), the gun keeps its last aim. Tuning. */
const DEAD_DRAG = 12;
/** The first aim: this far above the level towards the enemy (radians). Tuning. */
const START_LIFT = 0.3;

export class BattleControls {
  private readonly root: HTMLDivElement;
  private readonly arm: HTMLButtonElement;
  private readonly gun: HTMLButtonElement;
  private readonly torpedo: HTMLButtonElement;
  private readonly leave: HTMLButtonElement;
  private drag: { id: number; x: number; y: number } | null = null;
  private lastAim: number | null = null;
  private game: GameState | null = null;

  constructor(parent: HTMLElement, session: Session) {
    this.root = el('div', 'naval-controls', parent);
    this.arm = el('button', 'naval-arm', this.root, 'Armi');
    this.torpedo = el('button', 'naval-btn torpedo', this.root, 'Siluro');
    this.gun = el('button', 'naval-btn gun', this.root, 'Fuoco');
    // back to the helm's view: the vessel stays where it is, to be chased (owner, 17 novembre 2026)
    this.leave = el('button', 'naval-leave', this.root, 'Timone');
    this.leave.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      session.input.helmCmd = 'disarm';
    });
    this.arm.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      session.input.helmCmd = 'arm';
    });
    this.torpedo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      session.input.helmCmd = 'torpedo';
    });
    // the gun: hold and drag the way to shoot, let go to fire
    this.gun.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.gun.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      session.input.cannonAim = this.lastAim ?? this.startAim();
    });
    this.gun.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.hypot(dx, dy) >= DEAD_DRAG) session.input.cannonAim = Math.atan2(dy, dx);
    });
    const letGo = (e: PointerEvent): void => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      this.lastAim = session.input.cannonAim;
      session.input.fireAngle = session.input.cannonAim;
      session.input.cannonAim = null;
    };
    this.gun.addEventListener('pointerup', letGo);
    this.gun.addEventListener('pointercancel', letGo);
  }

  /** Aimed a little up towards the vessel you fight. */
  private startAim(): number {
    const g = this.game;
    const foe = g?.company.enemies.find((e) => e.id === g.company.battle?.foe);
    const right = !g || !foe || foe.x >= g.ship.x;
    return right ? -START_LIFT : Math.PI + START_LIFT;
  }

  update(g: GameState): void {
    this.game = g;
    const battle = !!g.company.battle && !g.company.battle.result && g.ship.aboard;
    this.arm.hidden = !canArm(g);
    const label = g.company.turret ? 'Vista interna' : 'Armi';
    if (this.arm.textContent !== label) this.arm.textContent = label;
    this.root.hidden = !battle && this.arm.hidden;
    const show = (b: HTMLButtonElement, kind: 'shell' | 'torpedo'): void => {
      const w = battle ? yourWeapon(g, kind) : null;
      b.hidden = !w;
      if (!w) return;
      const left = Math.max(g.company.yourReload[w] ?? 0, g.company.yourDmg.jam);
      b.style.setProperty('--ready', String(1 - Math.min(1, left / WEAPONS[w].reload)));
      b.classList.toggle('loading', left > 0);
    };
    this.leave.hidden = !battle;
    show(this.gun, 'shell');
    show(this.torpedo, 'torpedo');
    if (!battle) this.lastAim = null;
  }
}
