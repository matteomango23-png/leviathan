// Hearts, oxygen, depth and messages (top-left, inside the iPhone safe area).
import { DIVER } from '../data/diver';
import { FISH } from '../data/world';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { depthMetres } from '../systems/world/zones';
import { el } from './dom';

const fishName = (id: string): string => FISH.find((f) => f.id === id)?.name ?? id;

export class Hud {
  private readonly hearts: HTMLDivElement;
  private readonly o2: HTMLDivElement;
  private readonly o2Fill: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private toastTimer = 0;
  private zoneTimer = 0;
  private cache = { hp: -1, max: -1, o2: -1, info: '' };

  constructor(root: HTMLElement) {
    const hud = el('div', 'hud', root);
    this.hearts = el('div', 'hud-hearts', hud);
    this.o2 = el('div', 'hud-o2', hud);
    el('span', '', this.o2, 'O₂');
    const bar = el('div', 'hud-o2-bar', this.o2);
    this.o2Fill = el('div', 'hud-o2-fill', bar);
    this.info = el('div', 'hud-info', hud);
    this.zone = el('div', 'zone-name', root);
    this.toastEl = el('div', 'toast', root);
  }

  toast(text: string, seconds = 2.6): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'zoneEntered') {
        this.zone.textContent = e.name;
        this.zone.classList.add('show');
        this.zoneTimer = 2.4;
      } else if (e.type === 'creatureSeen') this.toast(`Nuova creatura nel bestiario: ${fishName(e.id)}`);
      else if (e.type === 'fishCaught')
        this.toast(
          e.healed
            ? `${fishName(e.fishId)}. Un cuore recuperato.`
            : `${fishName(e.fishId)} catturata (${e.count})`,
          1.6,
        );
      else if (e.type === 'oxygenLow') this.toast('Ossigeno basso. Risali in superficie!');
      else if (e.type === 'died') this.toast('Il mare ti ha respinto in superficie.', 3);
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
    const o2 = Math.round((d.o2 / d.maxO2) * 100);
    if (o2 !== this.cache.o2) {
      this.cache.o2 = o2;
      this.o2Fill.style.width = `${o2}%`;
      this.o2.classList.toggle('low', o2 < DIVER.oxygen.lowFraction * 100);
    }
    const info = `${Math.round(depthMetres(d.y))} m · sardine ${g.fishCaught.sardina ?? 0}`;
    if (info !== this.cache.info) {
      this.cache.info = info;
      this.info.textContent = info;
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
