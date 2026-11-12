// A shot's path (owner, 12 novembre 2026: the harpoon went through beasts and fish): not only where its tip is at the
// end of a frame, but the whole stretch it flew, a point every few units, so a long frame on the phone does not jump
// over a thin body. Pure logic.
import { BEAST_BODY } from '../data/beasts';

/** A point every BEAST_BODY.hitStep units from (ax, ay) to (bx, by): true at the first point `hit` takes. */
export function hitAlong(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  hit: (x: number, y: number) => boolean,
): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / BEAST_BODY.hitStep));
  for (let i = 1; i <= n; i++) if (hit(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return true;
  return false;
}
