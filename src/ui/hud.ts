// Hearts, oxygen, depth and messages (top-left, inside the iPhone safe area).
import { DIVER } from '../data/diver';
import { subModel } from '../systems/submarine';
import { airShown, pressureShown } from '../systems/rideAir';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { currentObjective } from '../systems/chapters';
import { depthMetres } from '../systems/world/zones';
import { kmFromCoast } from '../systems/world/endless';
import { LAYOUT, OPEN_SEA_X, WORLD } from '../data/worldLayout';
import { el } from './dom';
import { messageFor } from './eventMessages';

export class Hud {
  private readonly hearts: HTMLDivElement;
  private readonly o2: HTMLDivElement;
  private readonly o2Fill: HTMLDivElement;
  private readonly o2Label: HTMLSpanElement;
  private readonly press: HTMLDivElement;
  private readonly pressFill: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly goal: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private toastTimer = 0;
  private zoneTimer = 0;
  private cache = { hp: -1, max: -1, o2: -1, whale: false, press: -1, info: '', goal: '' };

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
    this.info = el('div', 'hud-info', hud);
    this.goal = el('div', 'hud-goal', hud);
    this.zone = el('div', 'zone-name', root);
    this.toastEl = el('div', 'toast', root);
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
    const bag = Object.values(g.gear.bag).reduce((a, b) => a + b, 0);
    // out at sea (past the Delta): how far you are from the coast
    const far =
      d.x > OPEN_SEA_X
        ? ` · ${(kmFromCoast(d.x) - kmFromCoast(LAYOUT.shoreX)).toFixed(1).replace('.', ',')} km dalla costa`
        : '';
    // where your boat waits (when you are not on it)
    const toBoat = (g.sub.x - d.x) / WORLD.unitsPerMetre;
    const boat = g.sub.aboard
      ? ` · scafo ${Math.round(g.sub.hull)}/${subModel(g.sub.model).hull}`
      : g.sub.owned && Math.abs(toBoat) > 15
        ? ` · sottomarino ${Math.round(Math.abs(toBoat))} m ${toBoat < 0 ? '←' : '→'}`
        : '';
    const info = `${Math.round(depthMetres(d.y))} m${far}${boat} · 🦷 ${g.gear.teeth} · sacca ${bag}`;
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
