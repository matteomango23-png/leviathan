// The turret's controls (owner, 17 novembre 2026): on the left the throttle and "Avvicina / Allontana"; on the right,
// drag anywhere to turn the turret, hold "Fuoco" to fire, the machine gun or the gun; "Timone" back to the helm. At
// the top the two ships' hull and water, as in the side battle; the distance under the window; the banners.
import type { DuelState } from '../systems/turret/duelState';
import { gunsUp, restingInput, yourMaxDepth, type TurretInput } from '../systems/turret/duel';
import { foeFromYou } from '../systems/turret/duelState';
import { ENEMY_CLASSES, WEAPONS } from '../data/company';
import { TURRET } from '../data/turret';
import type { GameState } from '../systems/game';
import { hullMax } from '../systems/ship/shipHull';
import { shipModel } from '../systems/ship/model';
import { el } from './dom';
import './naval.css';
import './turret.css';

export class TurretControls {
  private readonly root: HTMLDivElement;
  private readonly fire: HTMLButtonElement;
  private readonly mg: HTMLButtonElement;
  private readonly gun: HTMLButtonElement;
  private readonly heat: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly track: HTMLDivElement;
  private readonly bars: { you: HTMLDivElement[]; foe: HTMLDivElement[]; names: HTMLSpanElement[] };
  private readonly banner: HTMLDivElement;
  private bannerT = 0;
  /** What the fingers do (TurretScene reads it each frame; the turning is used up then). */
  readonly input: TurretInput = restingInput();
  /** A U-Boat's "Sali / Scendi" and its torpedo (hidden on the ships that have none). */
  private readonly diveBox: HTMLDivElement;
  private readonly torpedo: HTMLButtonElement;
  exit = false;
  weapon: 'mg' | 'gun' = 'mg';

  constructor(throttle: number) {
    this.root = el('div', 'turret-ui', document.body);
    this.input.throttle = throttle;
    // the drag to turn the turret: the whole screen behind the buttons
    const look = el('div', 'turret-look', this.root);
    let last: { id: number; x: number; y: number } | null = null;
    look.addEventListener('pointerdown', (e) => {
      last = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this.listen('pointermove', (e) => {
      if (!last || e.pointerId !== last.id) return;
      this.input.yaw += (e.clientX - last.x) * TURRET.dragRad;
      this.input.pitch -= (e.clientY - last.y) * TURRET.dragRad;
      last = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    const up = (e: PointerEvent): void => {
      if (last && e.pointerId === last.id) last = null;
    };
    this.listen('pointerup', up);
    this.listen('pointercancel', up);
    // the throttle lever, on the left
    const lever = el('div', 'turret-lever', this.root);
    el('div', 'turret-label', lever, 'Gas');
    this.track = el('div', 'turret-track', lever);
    this.knob = el('div', 'turret-knob', this.track);
    const setGas = (y: number): void => {
      const r = this.track.getBoundingClientRect();
      this.input.throttle = Math.max(0, Math.min(1, 1 - (y - r.top) / r.height));
    };
    let gasId = -1;
    this.track.addEventListener('pointerdown', (e) => {
      gasId = e.pointerId;
      setGas(e.clientY);
    });
    this.listen('pointermove', (e) => e.pointerId === gasId && setGas(e.clientY));
    this.listen('pointerup', (e) => e.pointerId === gasId && (gasId = -1));
    const side = el('div', 'turret-side', this.root);
    const hold = (b: HTMLButtonElement, v: number): void => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.side = v;
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const)
        b.addEventListener(ev, () => this.input.side === v && (this.input.side = 0));
    };
    hold(el('button', 'turret-btn', side, 'Avvicina'), 1);
    hold(el('button', 'turret-btn', side, 'Allontana'), -1);
    // a U-Boat goes up and down while held
    this.diveBox = el('div', 'turret-dive', this.root);
    const diveHold = (b: HTMLButtonElement, v: number): void => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.dive = v;
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const)
        b.addEventListener(ev, () => this.input.dive === v && (this.input.dive = 0));
    };
    diveHold(el('button', 'turret-btn', this.diveBox, 'Sali'), -1);
    diveHold(el('button', 'turret-btn', this.diveBox, 'Scendi'), 1);
    // the weapons and the trigger, on the right
    const arms = el('div', 'turret-arms', this.root);
    this.mg = el('button', 'turret-btn on', arms, 'Mitragliatrice');
    this.gun = el('button', 'turret-btn', arms, 'Cannone');
    this.mg.addEventListener('pointerdown', () => (this.weapon = 'mg'));
    this.gun.addEventListener('pointerdown', () => (this.weapon = 'gun'));
    // the guided torpedo: it follows where you turn the turret
    this.torpedo = el('button', 'turret-btn torpedo', arms, 'Siluro');
    this.torpedo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.torpedo = true;
    });
    this.fire = el('button', 'turret-fire', this.root, 'Fuoco');
    this.heat = el('div', 'turret-heat-fill', el('div', 'turret-heat', this.root));
    this.fire.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.firing = true;
      this.input.gunShot = true;
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const)
      this.fire.addEventListener(ev, () => (this.input.firing = false));
    el('button', 'turret-exit', this.root, 'Timone').addEventListener(
      'pointerdown',
      () => (this.exit = true),
    );
    this.info = el('div', 'turret-info', this.root);
    // the two ships, at the top
    const bars = el('div', 'naval-bars turret-bars', this.root);
    const sideBox = (kind: string): { name: HTMLSpanElement; fills: HTMLDivElement[] } => {
      const box = el('div', `naval-side ${kind}`, bars);
      const name = el('span', 'naval-name', box);
      const hull = el('div', 'naval-hull', el('div', 'naval-track', box));
      const water = el('div', 'naval-water', el('div', 'naval-track thin', box));
      return { name, fills: [hull, water] };
    };
    const you = sideBox('you');
    el('span', 'naval-vs', bars, 'contro');
    const foe = sideBox('foe');
    this.bars = { you: you.fills, foe: foe.fills, names: [you.name, foe.name] };
    this.banner = el('div', 'naval-banner', this.root);
    this.banner.hidden = true;
  }

  /** The window's listeners, taken away when the turret closes. */
  private readonly offs: (() => void)[] = [];

  private listen(ev: 'pointermove' | 'pointerup' | 'pointercancel', fn: (e: PointerEvent) => unknown): void {
    const h = (e: PointerEvent): void => void fn(e);
    window.addEventListener(ev, h);
    this.offs.push(() => window.removeEventListener(ev, h));
  }

  show(text: string): void {
    this.banner.textContent = text;
    this.banner.hidden = false;
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth;
    this.banner.classList.add('pop');
    this.bannerT = 2.4;
  }

  update(g: GameState, d: DuelState, dt: number): void {
    this.bannerT = Math.max(0, this.bannerT - dt);
    if (this.bannerT <= 0) this.banner.hidden = true;
    this.knob.style.bottom = `${Math.round(this.input.throttle * 100)}%`;
    const hasGun = shipModel(g.ship).weapons.some((w) => WEAPONS[w].kind === 'shell');
    this.gun.hidden = !hasGun;
    if (!hasGun) this.weapon = 'mg';
    this.mg.classList.toggle('on', this.weapon === 'mg');
    this.gun.classList.toggle('on', this.weapon === 'gun');
    const gunW = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
    const ready = this.weapon === 'mg' ? (d.hot ? 0 : 1) : gunW ? 1 - d.gunReload / WEAPONS[gunW].reload : 1;
    this.fire.style.setProperty('--ready', String(ready));
    this.fire.classList.toggle('hot', d.hot && this.weapon === 'mg');
    this.heat.style.width = `${Math.round(d.heat * 100)}%`;
    this.heat.parentElement!.hidden = this.weapon !== 'mg';
    const dist = Math.round(foeFromYou(d).dist);
    const under = !gunsUp(d);
    this.diveBox.hidden = yourMaxDepth(g) <= 0;
    this.torpedo.hidden = !shipModel(g.ship).weapons.includes('siluro');
    this.torpedo.classList.toggle('off', d.torpReload > 0 || d.torpedoes.some((x) => x.from === 'you'));
    // under the water the guns are useless
    this.mg.classList.toggle('off', under);
    this.gun.classList.toggle('off', under);
    const arm = under ? 'Sott’acqua: solo siluri' : this.weapon === 'mg' ? 'Mitragliatrice' : 'Cannone';
    const depth = d.you.depth > 0.5 ? ` · quota ${Math.round(d.you.depth)} m` : '';
    const text = `${arm} · bersaglio a ${dist} m${depth}`;
    if (this.info.textContent !== text) this.info.textContent = text;
    const e = g.company.enemies.find((x) => x.id === d.foeId);
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

  /** Used up each frame: the turning and the gun's press. */
  consume(): void {
    this.input.yaw = 0;
    this.input.pitch = 0;
    this.input.gunShot = false;
    this.input.torpedo = false;
  }

  destroy(): void {
    for (const off of this.offs) off();
    this.root.remove();
  }
}
