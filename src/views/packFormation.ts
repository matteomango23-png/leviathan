// A pack swimming together (block 5b, owner 9 ottobre 2026): the mates follow the leader's wake a moment behind
// each, so the pack turns together like a wave instead of being glued round it; wandering they spread out, charging
// they close up in a line, fleeing they scatter. Look only: the leader is the beast of the game.

/** Where the rest of a pack swims, as shares of the leader's length (behind it, above and below). */
export const PACK_PLACES: [number, number][] = [
  [0.55, -0.32],
  [0.7, 0.3],
  [1.15, -0.05],
  [1.4, 0.38],
];

/** Seconds each mate lags behind the one before; how long the wake is kept. */
const LAG = 0.22;
const KEEP = 2;
/** How spread the pack is by mood: along it, across it. */
const SPREAD: Record<'wander' | 'chase' | 'flee', [number, number]> = {
  wander: [1, 1],
  chase: [0.8, 0.35],
  flee: [1.4, 1.6],
};

interface Point {
  t: number;
  x: number;
  y: number;
  face: 1 | -1;
  pitch: number;
}

/** The leader's wake: where it was over the last couple of seconds. */
export class PackTrail {
  private pts: Point[] = [];
  private spread: [number, number] = [1, 1];

  push(p: Point, mood: 'wander' | 'chase' | 'flee', dt: number): void {
    const last = this.pts[this.pts.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) > 400) this.pts = []; // it came back somewhere else
    if (!last || p.t - last.t > 0.05) this.pts.push(p);
    while (this.pts.length > 2 && p.t - this.pts[0]!.t > KEEP) this.pts.shift();
    const want = SPREAD[mood];
    const k = Math.min(1, dt * 2); // the pack opens and closes gently
    this.spread = [
      this.spread[0] + (want[0] - this.spread[0]) * k,
      this.spread[1] + (want[1] - this.spread[1]) * k,
    ];
  }

  /** Where the leader was `ago` seconds before `now` (the oldest point if the wake is shorter). */
  private at(now: number, ago: number): Point | undefined {
    for (let i = this.pts.length - 1; i >= 0; i--) if (now - this.pts[i]!.t >= ago) return this.pts[i];
    return this.pts[0];
  }

  /** Mate k of a leader this long: its place behind the leader's wake, turning when the leader turned there. */
  mate(now: number, k: number, length: number, time: number): Omit<Point, 't'> | null {
    const p = this.at(now, LAG * (k + 1));
    if (!p) return null;
    const [bx, by] = PACK_PLACES[k % PACK_PLACES.length]!;
    const wob = Math.sin(time * 1.3 + k * 2.1) * 0.08;
    return {
      x: p.x - p.face * length * bx * 0.45 * this.spread[0],
      y: p.y + length * (by * this.spread[1] + wob),
      face: p.face,
      pitch: p.pitch,
    };
  }
}
