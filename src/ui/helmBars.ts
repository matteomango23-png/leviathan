// The bars at the top left at the helm (owner, 9 ottobre 2026): the fuel (green, orange from half, red when low)
// and, in a submarine or a U-Boat, the air with its minutes; your teeth go under them (ui.css `.helm-has-air`).
import { SUBMARINE } from '../data/submarine';
import { el } from './dom';

export class HelmBars {
  private readonly fuelBar: HTMLDivElement;
  private readonly fuelFill: HTMLDivElement;
  private readonly airBar: HTMLDivElement;
  private readonly airFill: HTMLDivElement;
  private readonly airText: HTMLSpanElement;
  private readonly hullBar: HTMLDivElement;
  private readonly hullFill: HTMLDivElement;

  constructor(private readonly root: HTMLElement) {
    this.fuelBar = el('div', 'helm-fuel', root);
    el('span', 'helm-fuel-ico', this.fuelBar, '⛽');
    this.fuelFill = el('div', 'helm-fuel-fill', el('div', 'helm-fuel-bar', this.fuelBar));
    this.airBar = el('div', 'helm-fuel helm-air', root);
    el('span', 'helm-fuel-ico', this.airBar, '🫧');
    this.airFill = el('div', 'helm-fuel-fill', el('div', 'helm-fuel-bar', this.airBar));
    this.airText = el('span', 'helm-air-text', this.airBar);
    // the speedboat's or jet ski's hull, in the same place (owner, 9 ottobre: rough seas wear it)
    this.hullBar = el('div', 'helm-fuel helm-air helm-hullbar', root);
    el('span', 'helm-fuel-ico', this.hullBar, '🔧');
    this.hullFill = el('div', 'helm-fuel-fill', el('div', 'helm-fuel-bar', this.hullBar));
  }

  /** @param air seconds left and full, or undefined (no air bar) @param hull a boat's hull, now and whole */
  update(
    fuel: number,
    tank: number,
    air: number | undefined,
    airMax: number | undefined,
    hull?: [number, number],
  ): void {
    const share = Math.max(0, Math.min(1, fuel / Math.max(1, tank)));
    this.fuelFill.style.width = `${Math.round(share * 100)}%`;
    this.fuelBar.dataset.level = share > 0.5 ? 'ok' : share > 0.2 ? 'half' : 'low';
    const shown = air !== undefined && !!airMax;
    this.airBar.hidden = !shown;
    this.hullBar.hidden = !hull;
    if (hull) {
      const h = Math.max(0, Math.min(1, hull[0] / Math.max(1, hull[1])));
      this.hullFill.style.width = `${Math.round(h * 100)}%`;
      this.hullBar.dataset.level = h > 0.5 ? 'ok' : h > 0.25 ? 'half' : 'low';
    }
    this.root.parentElement?.classList.toggle('helm-has-air', shown || !!hull);
    // a U-Boat has both (block 5c): the hull bar goes under the air
    this.root.parentElement?.classList.toggle('helm-has-two', shown && !!hull);
    if (!shown) return;
    this.airFill.style.width = `${Math.round(Math.max(0, Math.min(1, air / airMax)) * 100)}%`;
    this.airBar.dataset.level = air > SUBMARINE.air.warnAt ? 'ok' : 'low';
    const t = `${Math.floor(air / 60)}:${String(Math.floor(air % 60)).padStart(2, '0')}`;
    if (this.airText.textContent !== t) this.airText.textContent = t;
  }
}
