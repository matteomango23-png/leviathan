// Port tab "Mute": the submarines (tappa 16) under the suits. Buy a better one, or take out one you own; fill
// the ship and the submarine with fuel (4 ottobre 2026).
import { FUEL } from '../data/ship';
import { buyFuel, canRefuel, fuelLevel, type FuelTarget } from '../systems/fuel';
import { boatName } from '../systems/ship/boatBay';
import { el } from './dom';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';

/** Fuel: fill the ship (alongside the pier), the submarine (in its hold, or moored by the pier), the speedboat and
 *  its drums (block 4b: poured into the ship when it docks). */
export function renderFuel(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  if (!g.ship.owned && !g.sub.owned) return;
  el('h3', '', b, 'Carburante');
  const grid = el('div', 'pcard-grid', b);
  const card = (which: FuelTarget, name: string, text: string): void => {
    const here = canRefuel(g, which);
    const [now, tank] = fuelLevel(g, which);
    const missing = Math.max(0, tank - now);
    portCard(grid, {
      icon: 'bolt',
      title: `${name}: ${Math.round(now)} / ${tank} L`,
      text: here ? text : `${name} non è qui al porto.`,
      price: here && missing > 0 ? Math.ceil(missing * FUEL.pricePerLitre) : undefined,
      state: here ? '' : 'locked',
      button: {
        label: which === 'drums' ? 'Carica i fusti' : 'Riempi',
        disabled: !here || missing <= 0,
        onClick: () => {
          const r = buyFuel(g, which);
          ctx.say(r.ok ? `${Math.round(r.litres)} L per ${r.cost} denti.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  };
  const pump = 'Il benzinaio del porto riempie il serbatoio.';
  if (g.ship.owned) card('ship', 'La nave', pump);
  if (g.sub.owned) card('sub', 'Il sottomarino', pump);
  if (g.boat.owned) {
    const name = boatName(g.ship);
    card('boat', name, pump);
    card(
      'drums',
      `${name}: fusti`,
      'Carburante per la nave: lo travasi quando il mezzo rientra nella stiva.',
    );
  }
}
