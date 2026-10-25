// The currents of the Gallerie (lot M3, data/galleries.ts): inside one the water carries you, or your submarine,
// towards its speed along the tunnel; you swim against it. Pure logic.
import { GALLERIES } from '../data/galleries';
import { galleryCurrentAt } from './world/galleryShape';

/** One step of the current on a body (its velocity, units/s). */
export function stepCurrent(b: { x: number; y: number; vx: number; vy: number }, dt: number): void {
  const c = galleryCurrentAt(b.x, b.y);
  if (!c) return;
  // a push towards its way: your own drag (or your submarine's) settles you at a drift you can swim against
  const k = Math.min(1, GALLERIES.currentPull * dt);
  b.vx += c.vx * k;
  b.vy += c.vy * k;
}
