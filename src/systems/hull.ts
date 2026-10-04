// Solid hulls (owner, 4 ottobre 2026): the submarine's and the ship's. A body touching one (you, your beast, a wild
// one) is pushed out and slides along it.

/** One circle of a hull, in world units. */
export interface HullPart {
  x: number;
  y: number;
  r: number;
}

/**
 * Pushes a body out of a hull. `circles` are the body's own, as offsets from its middle. Returns true if it touched.
 */
export function pushOutOfHull(
  hull: readonly HullPart[],
  b: { x: number; y: number; vx: number; vy: number },
  circles: readonly { dx: number; dy: number; r: number }[],
): boolean {
  let touched = false;
  for (let pass = 0; pass < 2; pass++)
    for (const c of circles)
      for (const h of hull) {
        const px = b.x + c.dx - h.x;
        const py = b.y + c.dy - h.y;
        const d = Math.hypot(px, py) || 0.001;
        const overlap = c.r + h.r - d;
        if (overlap <= 0) continue;
        touched = true;
        const nx = px / d;
        const ny = py / d;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= nx * vn;
          b.vy -= ny * vn;
        }
      }
  return touched;
}
