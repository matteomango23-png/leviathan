// Solid hulls (owner, 4 ottobre 2026): the submarine's and the ship's. A body touching one (you, your beast, a wild
// one) is pushed out and slides along it. The ship's circles are linked into one smooth capsule (owner, 19 ottobre:
// a big beast under the keel went up and down along the bumps of its circles), and a body caught inside it is pushed
// under, never up on top of it (it stayed afloat over the ship).

/** One circle of a hull, in world units. */
export interface HullPart {
  x: number;
  y: number;
  r: number;
  /** Joined to the next part by a straight stretch of hull (a capsule): no bumps between them. */
  link?: boolean;
}

/** The point of a hull nearest to (px, py), and the hull's radius there: a part, or a stretch to the next one. */
function nearestOn(
  hull: readonly HullPart[],
  i: number,
  px: number,
  py: number,
): { x: number; y: number; r: number; along: boolean } {
  const a = hull[i]!;
  const b = a.link ? hull[i + 1] : undefined;
  if (!b) return { x: a.x, y: a.y, r: a.r, along: false };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const raw = ((px - a.x) * dx + (py - a.y) * dy) / len2;
  const t = Math.max(0, Math.min(1, raw));
  // along: over this stretch, not past the hull's ends (a joint counts)
  return { x: a.x + dx * t, y: a.y + dy * t, r: a.r + (b.r - a.r) * t, along: raw >= 0 && raw <= 1 };
}

/**
 * Pushes a body out of a hull. `circles` are the body's own, as offsets from its middle. `under`: caught inside a
 * capsule it goes out under the keel (a beast you ride; you swimming by a boat are pushed aside as before). Returns
 * true if it touched.
 */
export function pushOutOfHull(
  hull: readonly HullPart[],
  b: { x: number; y: number; vx: number; vy: number },
  circles: readonly { dx: number; dy: number; r: number }[],
  under = false,
): boolean {
  let touched = false;
  for (let pass = 0; pass < 2; pass++)
    for (const c of circles)
      for (let i = 0; i < hull.length; i++) {
        const cx = b.x + c.dx;
        const cy = b.y + c.dy;
        const h = nearestOn(hull, i, cx, cy);
        let nx = cx - h.x;
        let ny = cy - h.y;
        const d = Math.hypot(nx, ny) || 0.001;
        let overlap = c.r + h.r - d;
        if (overlap <= 0) continue;
        touched = true;
        nx /= d;
        ny /= d;
        // inside a straight stretch, above its middle line: out under the keel, never on top
        if (under && h.along && ny < 0) {
          nx = 0;
          ny = 1;
          overlap = h.y + h.r + c.r - cy;
        }
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
