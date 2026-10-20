// Birds caught by a beast leaping out of the water (owner: the gulls diving for the sardines; breach.ts).
import type { BirdsState, Splash } from './birds';

/** A beast leaping out of the water snaps up the birds within `r` of its mouth (breach.ts): they are gone from their
 *  flock. Returns where each one was caught. */
export function eatBirdsNear(s: BirdsState, x: number, y: number, r: number): Splash[] {
  const caught: Splash[] = [];
  for (const f of s.flocks) {
    if (!f.active) continue;
    f.birds = f.birds.filter((b) => {
      if (Math.hypot(b.x - x, b.y - y) > r) return true;
      caught.push({ x: b.x, y: b.y });
      return false;
    });
  }
  return caught;
}
