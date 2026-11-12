// The speargun's ammunition (owner, 12 novembre 2026: "le munizioni non devono essere infinite, ci deve essere recoil
// per la ricarica, e si ricarica con lo stesso pulsante con cui si spara… devi comprare le ricariche al porto"): a
// magazine (gear.gunMag) loaded from the spare darts in the backpack (inventory.dardi). Each shot takes one and pushes
// you back a little; empty, the gun button reloads it over GUN.reloadSeconds, and holding it the burst goes on once
// loaded. Pure logic; the darts themselves fly in harpoon.ts.
import { GUN } from '../data/diver';
import type { DiverState } from './diver';
import type { GearState } from './economy/gear';
import type { GameEvent } from './events';
import { fireHarpoon, type HarpoonState } from './harpoon';

interface GunWorld {
  diver: DiverState;
  gear: GearState;
  harpoon: HarpoonState;
}

/** The darts you can still load. */
export const spareDarts = (g: Pick<GunWorld, 'gear'>): number => g.gear.inventory.dardi ?? 0;

/** Starts loading the magazine (empty or not full); with no spare darts it says so, now and then. */
export function startReload(g: GunWorld, events: GameEvent[]): void {
  const h = g.harpoon;
  if (h.reload > 0 || g.gear.gunMag >= GUN.magazine) return;
  if (spareDarts(g) <= 0) {
    if (h.noAmmoT <= 0) events.push({ type: 'ammoOut' });
    h.noAmmoT = GUN.noAmmoSaySeconds;
    return;
  }
  h.reload = GUN.reloadSeconds;
  events.push({ type: 'gunReload' });
}

/** The gun button with a way to shoot: a dart if the magazine has one, else the reload. True if a dart flew. */
export function pullTrigger(
  g: GunWorld,
  angle: number,
  events: GameEvent[],
  targets: readonly { x: number; y: number }[],
): boolean {
  const h = g.harpoon;
  if (h.reload > 0) return false;
  if (g.gear.gunMag <= 0) {
    startReload(g, events);
    return false;
  }
  if (!fireHarpoon(h, g.diver, angle, events, targets)) return false;
  g.gear.gunMag--;
  // the kick: pushed back along the shot
  g.diver.vx -= Math.cos(angle) * GUN.recoil;
  g.diver.vy -= Math.sin(angle) * GUN.recoil * 0.5;
  if (g.gear.gunMag === 0) events.push({ type: 'gunEmpty' });
  return true;
}

/** One step: the reload runs; done, the magazine fills from the spare darts. */
export function stepGun(g: GunWorld, dt: number, events: GameEvent[]): void {
  const h = g.harpoon;
  h.noAmmoT = Math.max(0, h.noAmmoT - dt);
  if (h.reload <= 0) return;
  h.reload -= dt;
  if (h.reload > 0) return;
  h.reload = 0;
  const take = Math.min(GUN.magazine - g.gear.gunMag, spareDarts(g));
  g.gear.gunMag += take;
  g.gear.inventory.dardi = spareDarts(g) - take;
  events.push({ type: 'gunReloaded' });
}
