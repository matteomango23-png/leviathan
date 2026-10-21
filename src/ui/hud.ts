// Hearts, oxygen, your teeth and messages (top-left, inside the iPhone safe area).
import { DIVER } from '../data/diver';
import { airShown, pressureShown } from '../systems/rideAir';
import { activeBeast } from '../systems/beastPlay';
import { staminaOf } from '../systems/stamina';
import { diverStamina } from '../systems/diverStamina';
import { shipArrow } from '../systems/shipPointer';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { currentObjective } from '../systems/story';
import { el } from './dom';
import { messageFor } from './eventMessages';

export class Hud {
  private readonly hearts: HTMLDivElement;
  private readonly o2: HTMLDivElement;
  private readonly o2Fill: HTMLDivElement;
  private readonly o2Label: HTMLSpanElement;
  private readonly press: HTMLDivElement;
  private readonly pressFill: HTMLDivElement;
  /** The stamina of the beast you ride (owner, 21 ottobre; stamina.ts); swimming on your own, yours while not full
   *  (diverStamina.ts). */
  private readonly stamina: HTMLDivElement;
  private readonly staminaFill: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly goal: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  /** The arrow to your ship on the edge of the screen (systems/shipPointer.ts). */
  private readonly arrow: HTMLDivElement;
  private toastTimer = 0;
  private zoneTimer = 0;
  private cache = { hp: -1, max: -1, o2: -1, whale: false, press: -1, stamina: '', info: '', goal: '' };

  constructor(root: HTMLElement) {
    const hud = el('div', 'hud', root);
    this.hearts = el('div', 'hud-hearts', hud);
    this.o2 = el('div', 'hud-o2', hud);
    this.o2Label = el('span', '', this.o2, 'O₂');
    const bar = el('div', 'hud-o2-bar', this.o2);
    this.o2Fill = el('div', 'hud-o2-fill', bar);
    // pressure: shown only deeper than your suit (or submarine) allows
    this.press = el('div', 'hud-o2 hud-press', hud);
    el('span', '', this.press, 'Pressione');
    this.pressFill = el('div', 'hud-o2-fill', el('div', 'hud-o2-bar', this.press));
    this.press.hidden = true;
    this.stamina = el('div', 'hud-o2 hud-stamina', hud);
    el('span', '', this.stamina, 'Resistenza');
    this.staminaFill = el('div', 'hud-o2-fill', el('div', 'hud-o2-bar', this.stamina));
    this.stamina.hidden = true;
    this.info = el('div', 'hud-info', hud);
    this.goal = el('div', 'hud-goal', hud);
    this.zone = el('div', 'zone-name', root);
    this.toastEl = el('div', 'toast', root);
    this.arrow = el('div', 'ship-arrow', root);
    this.arrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 12h13M11 5l8 7-8 7"/></svg>';
    this.arrow.hidden = true;
  }

  toast(text: string, seconds = 2.6): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  onEvents(events: GameEvent[], g: GameState): void {
    for (const e of events) {
      if (e.type === 'zoneEntered') {
        this.zone.textContent = e.name;
        this.zone.classList.add('show');
        this.zoneTimer = 2.4;
        continue;
      }
      const m = messageFor(e, g);
      if (m) this.toast(m[0], m[1]);
    }
  }

  update(g: GameState, dt: number): void {
    const d = g.diver;
    if (d.hp !== this.cache.hp || d.maxHp !== this.cache.max) {
      this.cache.hp = d.hp;
      this.cache.max = d.maxHp;
      this.hearts.innerHTML = '';
      for (let i = 0; i < d.maxHp; i++) el('span', i < d.hp ? '' : 'empty', this.hearts, '♥');
    }
    // riding a whale the bar is its air (bigger, but it has to come up too)
    const air = airShown(g);
    const o2 = Math.round((air.o2 / air.max) * 100);
    if (o2 !== this.cache.o2 || air.whale !== this.cache.whale) {
      this.cache.o2 = o2;
      this.cache.whale = air.whale;
      this.o2Fill.style.width = `${o2}%`;
      this.o2.classList.toggle('low', o2 < DIVER.oxygen.lowFraction * 100);
      this.o2.classList.toggle('whale', air.whale);
      this.o2Label.textContent = air.whale ? 'O₂ 🐋' : 'O₂';
    }
    const press = Math.round(pressureShown(g) * 100);
    if (press !== this.cache.press) {
      this.cache.press = press;
      this.press.hidden = press >= 100;
      this.pressFill.style.width = `${press}%`;
      this.press.classList.toggle('low', press < 30);
    }
    const ridden = g.beasts.riding ? activeBeast(g) : undefined;
    const own = diverStamina(g);
    const st = ridden ? staminaOf(g.beasts.stamina, ridden.uid) : own.value < 1 ? own : null;
    const stKey = st ? `${Math.round(st.value * 100)}${st.worn ? 'w' : ''}` : '';
    if (stKey !== this.cache.stamina) {
      this.cache.stamina = stKey;
      this.stamina.hidden = !st;
      if (st) {
        this.staminaFill.style.width = `${Math.round(st.value * 100)}%`;
        this.stamina.classList.toggle('worn', st.worn);
      }
    }
    // only your teeth here (owner, 5 ottobre: depth, distances and the bag are cockpit and map things)
    const info = `🦷 ${g.gear.teeth}`;
    if (info !== this.cache.info) {
      this.cache.info = info;
      this.info.textContent = info;
    }
    const goal = currentObjective(g) ?? '';
    if (goal !== this.cache.goal) {
      this.cache.goal = goal;
      this.goal.textContent = goal;
      this.goal.classList.toggle('show', !!goal);
    }
    const a = shipArrow(g);
    this.arrow.hidden = !a;
    if (a) {
      this.arrow.style.left = `${(a.x * 100).toFixed(2)}%`;
      this.arrow.style.top = `${(a.y * 100).toFixed(2)}%`;
      this.arrow.style.transform = `translate(-50%, -50%) rotate(${a.angle.toFixed(3)}rad)`;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
    if (this.zoneTimer > 0) {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) this.zone.classList.remove('show');
    }
  }
}
