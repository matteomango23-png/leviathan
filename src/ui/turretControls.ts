// The inside view's controls (owner, 17 novembre 2026): on the left the throttle lever (ahead, and a little astern under
// its stop mark) and the rudder ◀ ▶ — the bow turns and the ship goes where it points — and a U-Boat's "Sali /
// Scendi"; on the right the weapons (under the water the machine gun is the harpoon gun) and "Fuoco", held to keep
// firing — a ship without weapons has none; drag anywhere else to turn the turret. Every
// finger works at once (ui/turretTouch.ts). "Vista esterna" back to the helm. At the top the two ships' hull and
// water (the vessel you aim at: the nearest hunting you); under the window what you aim with and its distance, with
// an arrow when it is out of view.
import { armed, gunsUp, restingInput, yourMaxDepth, type TurretInput } from '../systems/turret/inside';
import { foeFrom, type FoeInView, type InsideState } from '../systems/turret/insideState';
import { wrapAngle, yawTo } from '../systems/turret/projection';
import { ENEMY_CLASSES, WEAPONS } from '../data/company';
import { DUEL, TURRET } from '../data/turret';
import type { GameState } from '../systems/game';
import { hullMax } from '../systems/ship/shipHull';
import { shipModel } from '../systems/ship/model';
import { el } from './dom';
import { TouchRouter } from './turretTouch';
import './naval.css';
import './turret.css';

/** A button that gives its finger a role. */
function roleBtn(parent: HTMLElement, cls: string, text: string, role: string): HTMLButtonElement {
  const b = el('button', cls, parent, text);
  b.dataset.role = role;
  return b;
}

export class TurretControls {
  private readonly root: HTMLDivElement;
  private readonly fire: HTMLButtonElement;
  private readonly mg: HTMLButtonElement;
  private readonly gun: HTMLButtonElement;
  private readonly heat: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly track: HTMLDivElement;
  private readonly bars: {
    you: HTMLDivElement[];
    foe: HTMLDivElement[];
    names: HTMLSpanElement[];
    foeBox: HTMLElement;
    vs: HTMLElement;
  };
  private readonly banner: HTMLDivElement;
  private bannerT = 0;
  /** What the fingers do (TurretScene reads it each frame; the turning is used up then). */
  readonly input: TurretInput = restingInput();
  /** A U-Boat's "Sali / Scendi" and its torpedo (hidden on the ships that have none). */
  private readonly diveBox: HTMLDivElement;
  private readonly arms: HTMLDivElement;
  private readonly torpedo: HTMLButtonElement;
  private readonly touch: TouchRouter;
  exit = false;
  weapon: 'mg' | 'gun' = 'mg';

  constructor(throttle: number) {
    this.root = el('div', 'turret-ui', document.body);
    this.input.throttle = throttle;
    this.touch = new TouchRouter({
      down: (role, _x, y) => {
        if (role === 'gas') this.setGas(y);
        else if (role === 'mg' || role === 'gun') this.weapon = role;
        else if (role === 'torpedo') this.input.torpedo = true;
        else if (role === 'fire') this.input.gunShot = true;
        else if (role === 'exit') this.exit = true;
      },
      move: (role, dx, dy, _x, y) => {
        if (role === 'gas') this.setGas(y);
        else if (role === 'look') {
          this.input.yaw += dx * TURRET.dragRad;
          this.input.pitch -= dy * TURRET.dragRad;
        }
      },
    });
    // a finger takes the role of what it touched; anywhere else turns the turret
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const role = (e.target as Element).closest<HTMLElement>('[data-role]')?.dataset.role ?? 'look';
      this.touch.down(e.pointerId, role, e.clientX, e.clientY);
    });
    this.listen('pointermove', (e) => this.touch.move(e.pointerId, e.clientX, e.clientY));
    this.listen('pointerup', (e) => this.touch.up(e.pointerId));
    this.listen('pointercancel', (e) => this.touch.up(e.pointerId));
    const blur = (): void => this.touch.clear();
    window.addEventListener('blur', blur);
    this.offs.push(() => window.removeEventListener('blur', blur));
    // the throttle lever, on the left: its stop mark a little above the bottom (astern under it)
    const lever = el('div', 'turret-lever', this.root);
    lever.dataset.role = 'gas';
    el('div', 'turret-label', lever, 'Gas');
    this.track = el('div', 'turret-track', lever);
    el('div', 'turret-stop', this.track).style.bottom = `${(DUEL.reverse / (1 + DUEL.reverse)) * 100}%`;
    this.knob = el('div', 'turret-knob', this.track);
    // the rudder
    const rudder = el('div', 'turret-rudder', this.root);
    roleBtn(rudder, 'turret-btn big', '◀', 'left');
    el('div', 'turret-label', rudder, 'Timone');
    roleBtn(rudder, 'turret-btn big', '▶', 'right');
    // a U-Boat goes up and down while held
    this.diveBox = el('div', 'turret-dive', this.root);
    roleBtn(this.diveBox, 'turret-btn', 'Sali', 'up');
    roleBtn(this.diveBox, 'turret-btn', 'Scendi', 'down');
    // the weapons and the trigger, on the right
    const arms = (this.arms = el('div', 'turret-arms', this.root));
    this.mg = roleBtn(arms, 'turret-btn on', 'Mitragliatrice', 'mg');
    this.gun = roleBtn(arms, 'turret-btn', 'Cannone', 'gun');
    // the guided torpedo: it follows where you turn the turret
    this.torpedo = roleBtn(arms, 'turret-btn torpedo', 'Siluro', 'torpedo');
    this.fire = roleBtn(this.root, 'turret-fire', 'Fuoco', 'fire');
    this.heat = el('div', 'turret-heat-fill', el('div', 'turret-heat', this.root));
    roleBtn(this.root, 'turret-exit', 'Vista esterna', 'exit');
    this.info = el('div', 'turret-info', this.root);
    // the two ships, at the top
    const bars = el('div', 'naval-bars turret-bars', this.root);
    const sideBox = (kind: string): { box: HTMLElement; name: HTMLSpanElement; fills: HTMLDivElement[] } => {
      const box = el('div', `naval-side ${kind}`, bars);
      const name = el('span', 'naval-name', box);
      const hull = el('div', 'naval-hull', el('div', 'naval-track', box));
      const water = el('div', 'naval-water', el('div', 'naval-track thin', box));
      return { box, name, fills: [hull, water] };
    };
    const you = sideBox('you');
    const vs = el('span', 'naval-vs', bars, 'contro');
    const foe = sideBox('foe');
    this.bars = { you: you.fills, foe: foe.fills, names: [you.name, foe.name], foeBox: foe.box, vs };
    this.banner = el('div', 'naval-banner', this.root);
    this.banner.hidden = true;
  }

  /** The lever from where the finger is on it: the top full ahead, the bottom astern. */
  private setGas(y: number): void {
    const r = this.track.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, 1 - (y - r.top) / r.height));
    const v = k * (1 + DUEL.reverse) - DUEL.reverse;
    // it snaps to the stop near it
    this.input.throttle = Math.abs(v) < 0.06 ? 0 : v;
  }

  /** The window's listeners, taken away when the turret closes. */
  private readonly offs: (() => void)[] = [];

  private listen(ev: 'pointermove' | 'pointerup' | 'pointercancel', fn: (e: PointerEvent) => unknown): void {
    const h = (e: PointerEvent): void => void fn(e);
    window.addEventListener(ev, h);
    this.offs.push(() => window.removeEventListener(ev, h));
  }

  /** At the frame's start: what the held fingers do now (the keyboard adds to it after). */
  sample(): void {
    const h = (r: string): number => (this.touch.held(r) ? 1 : 0);
    this.input.firing = h('fire') > 0;
    // the gun fires again by itself while held, as soon as it has reloaded
    this.input.gunShot ||= this.input.firing;
    this.input.steer = h('right') - h('left');
    this.input.dive = h('down') - h('up');
  }

  show(text: string): void {
    this.banner.textContent = text;
    this.banner.hidden = false;
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth;
    this.banner.classList.add('pop');
    this.bannerT = 2.4;
  }

  update(g: GameState, d: InsideState, target: FoeInView | null, dt: number): void {
    this.bannerT = Math.max(0, this.bannerT - dt);
    if (this.bannerT <= 0) this.banner.hidden = true;
    const lever = (this.input.throttle + DUEL.reverse) / (1 + DUEL.reverse);
    this.knob.style.bottom = `${Math.round(lever * 100)}%`;
    const gunW = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
    const withArms = armed(g);
    this.gun.hidden = !gunW;
    this.mg.hidden = !withArms;
    this.fire.hidden = !withArms;
    if (!gunW) this.weapon = 'mg';
    this.mg.classList.toggle('on', this.weapon === 'mg');
    this.gun.classList.toggle('on', this.weapon === 'gun');
    const ready = this.weapon === 'mg' ? (d.hot ? 0 : 1) : gunW ? 1 - d.gunReload / WEAPONS[gunW].reload : 1;
    this.fire.style.setProperty('--ready', String(ready));
    this.fire.classList.toggle('hot', d.hot && this.weapon === 'mg');
    this.heat.style.width = `${Math.round(d.heat * 100)}%`;
    this.heat.parentElement!.hidden = this.weapon !== 'mg' || !withArms;
    const under = !gunsUp(d);
    this.diveBox.hidden = yourMaxDepth(g) <= 0;
    this.torpedo.hidden = !shipModel(g.ship).weapons.includes('siluro');
    this.torpedo.classList.toggle('off', d.torpReload > 0 || d.torpedoes.some((x) => x.from === 'you'));
    // under the water the machine gun is the harpoon gun, and the gun is shut
    const mgName = under ? 'Arpioni' : 'Mitragliatrice';
    if (this.mg.textContent !== mgName) this.mg.textContent = mgName;
    this.gun.classList.toggle('off', under);
    const arm = !withArms
      ? 'Senza armi'
      : this.weapon === 'mg'
        ? mgName
        : under
          ? 'Cannone: solo in superficie'
          : 'Cannone';
    const depth = d.you.depth > 0.5 ? ` · quota ${Math.round(d.you.depth)} m` : '';
    const astern = this.input.throttle < 0 ? ' · indietro' : '';
    let aim = 'nessuna nave vicina';
    if (target) {
      const rel = foeFrom(d, target);
      // out of view: which way to turn
      const off = wrapAngle(yawTo(rel) - d.yaw);
      const out = Math.abs(off) >= TURRET.fov / 2;
      aim = `${out && off < 0 ? '◀ ' : ''}bersaglio a ${Math.round(rel.dist)} m${out && off > 0 ? ' ▶' : ''}`;
    }
    const text = `${arm} · ${aim}${depth}${astern}`;
    if (this.info.textContent !== text) this.info.textContent = text;
    this.arms.hidden = !withArms && this.torpedo.hidden;
    const e = target ? g.company.enemies.find((x) => x.id === target.id) : undefined;
    this.bars.foeBox.hidden = !e;
    this.bars.vs.hidden = !e;
    const set = (fills: HTMLDivElement[], hull: number, water: number): void => {
      fills[0]!.style.width = `${Math.round(Math.max(0, Math.min(1, hull)) * 100)}%`;
      fills[1]!.style.width = `${Math.round(Math.max(0, Math.min(1, water)) * 100)}%`;
    };
    set(this.bars.you, g.ship.hull / hullMax(g.ship), g.company.yourDmg.flood);
    this.bars.names[0]!.textContent = shipModel(g.ship).name;
    if (e) {
      set(this.bars.foe, e.hull / ENEMY_CLASSES[e.cls].hull, e.dmg.flood);
      this.bars.names[1]!.textContent = ENEMY_CLASSES[e.cls].name;
    }
  }

  /** Used up each frame: the turning and the presses. */
  consume(): void {
    this.input.yaw = 0;
    this.input.pitch = 0;
    this.input.gunShot = false;
    this.input.torpedo = false;
  }

  destroy(): void {
    for (const off of this.offs) off();
    this.touch.clear();
    this.root.remove();
  }
}
