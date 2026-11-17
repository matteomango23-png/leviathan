// A sea battle's screen (owner, 17 novembre 2026: "deve essere proprio fighissima"): "Ai posti di combattimento!" as it
// begins, then at the top your ship's hull and water against the enemy's, like a fighting game, and how it ended.
import { ENEMY_CLASSES } from '../data/company';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { hullMax } from '../systems/ship/shipHull';
import { shipModel } from '../systems/ship/model';
import { el } from './dom';
import './naval.css';

const ENDS = {
  victory: 'Vittoria!',
  left: 'Al timone',
  lost: 'Affondato…',
} as const;

interface Side {
  name: HTMLSpanElement;
  hull: HTMLDivElement;
  water: HTMLDivElement;
}

export class BattleHud {
  private readonly bars: HTMLDivElement;
  private readonly banner: HTMLDivElement;
  private readonly you: Side;
  private readonly foe: Side;
  private bannerT = 0;

  constructor(parent: HTMLElement) {
    this.bars = el('div', 'naval-bars', parent);
    this.you = this.side('you');
    el('span', 'naval-vs', this.bars, 'contro');
    this.foe = this.side('foe');
    this.banner = el('div', 'naval-banner', parent);
    this.bars.hidden = true;
    this.banner.hidden = true;
  }

  private side(kind: 'you' | 'foe'): Side {
    const box = el('div', `naval-side ${kind}`, this.bars);
    const name = el('span', 'naval-name', box);
    const hull = el('div', 'naval-hull', el('div', 'naval-track', box));
    const water = el('div', 'naval-water', el('div', 'naval-track thin', box));
    return { name, hull, water };
  }

  private show(text: string, sub = ''): void {
    this.banner.textContent = text;
    if (sub) el('span', 'naval-sub', this.banner, sub);
    this.banner.hidden = false;
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth; // start the animation again
    this.banner.classList.add('pop');
    this.bannerT = 2.4;
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'navalBattle')
        this.show(
          'Ai posti di combattimento!',
          e.surprise ? 'Attacco a sorpresa: il primo colpo vale doppio' : 'Ti danno la caccia',
        );
      else if (e.type === 'navalBattleEnd') this.show(ENDS[e.result]);
      else if (e.type === 'hullHit' && e.side === 'enemy' && e.zone === 'magazine')
        this.show('Deposito centrato!');
    }
  }

  update(g: GameState, dt: number): void {
    this.bannerT = Math.max(0, this.bannerT - dt);
    if (this.bannerT <= 0) this.banner.hidden = true;
    const b = g.company.battle;
    const foe = b && g.company.enemies.find((e) => e.id === b.foe);
    this.bars.hidden = !b || !foe;
    if (!b || !foe) return;
    const set = (s: Side, name: string, hull: number, water: number): void => {
      if (s.name.textContent !== name) s.name.textContent = name;
      s.hull.style.width = `${Math.round(Math.max(0, Math.min(1, hull)) * 100)}%`;
      s.water.style.width = `${Math.round(Math.max(0, Math.min(1, water)) * 100)}%`;
    };
    set(this.you, shipModel(g.ship).name, g.ship.hull / hullMax(g.ship), g.company.yourDmg.flood);
    set(this.foe, ENEMY_CLASSES[foe.cls].name, foe.hull / ENEMY_CLASSES[foe.cls].hull, foe.dmg.flood);
  }
}
