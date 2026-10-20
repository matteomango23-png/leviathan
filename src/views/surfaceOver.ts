// The sea's surface across a beast half out of the water (owner, 20 ottobre 2026: "si deve vedere la linea dell'onda…
// la parte sotto l'acqua leggermente più azzurra… ora sembra una foto incollata lì"). In front of the beasts and the
// diver, only where a body crosses the surface: a thin bright line along the real waves (sea.ts seaHeight, the same
// the surface view draws and the hulls ride) and, under it, a veil of the water's own colour at that depth, growing
// deeper down. Over the open water around the body that veil is the water's colour on the water: it does not show.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { bodyCircles, type BodyPose } from '../systems/beasts/combat';
import { rampColor } from '../systems/math';
import { seaHeight, troughDepth, type SeaNow } from '../systems/sea';

const B = SEA.bodyWater;

export class SurfaceOver {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  /** @param bodies the beasts to draw it on (the one you ride, the wild ones near the surface) */
  update(bodies: readonly BodyPose[], time: number, sea: SeaNow): void {
    const g = this.g;
    g.clear();
    const swell = troughDepth(sea);
    for (const b of bodies) {
      // the veil a little outside its outline (on the water around it, it is the water's colour: unseen), the line a
      // little inside (it must never run across the open water)
      const circles = bodyCircles(b).map((c) => ({ x: b.x + c.dx, y: b.y + c.dy, r: c.r * B.veilFill }));
      const top = Math.min(...circles.map((c) => c.y - c.r));
      const bottom = Math.max(...circles.map((c) => c.y + c.r));
      // only a body crossing the surface (with its waves)
      if (top > WORLD.surfaceY + swell || bottom < WORLD.surfaceY - swell) continue;
      const x0 = Math.min(...circles.map((c) => c.x - c.r));
      const x1 = Math.max(...circles.map((c) => c.x + c.r));
      // each column: the body's top and bottom there (the union of its circles), the wave's line, and whether the
      // body itself (not only the veil around it) crosses that line
      const cols: { x: number; ct: number; cb: number; line: number; cut: boolean }[] = [];
      let out = 0; // how far the body stands out of the water at most
      for (let x = x0; x < x1; x += B.step) {
        const cx = x + B.step / 2;
        const line = WORLD.surfaceY - seaHeight(cx, time, sea, sea.water);
        let ct = Infinity;
        let cb = -Infinity;
        let cut = false;
        for (const c of circles) {
          const dx = cx - c.x;
          if (Math.abs(dx) >= c.r) continue;
          const h = Math.sqrt(c.r * c.r - dx * dx);
          ct = Math.min(ct, c.y - h);
          cb = Math.max(cb, c.y + h);
          const r = (c.r / B.veilFill) * B.lineFill;
          if (Math.abs(dx) < r) {
            const hl = Math.sqrt(r * r - dx * dx);
            if (c.y - hl < line && c.y + hl > line) cut = true;
            out = Math.max(out, line - (c.y - hl));
          }
        }
        if (cb > ct) cols.push({ x, ct, cb, line, cut });
      }
      // the veil only means something next to the part out of the water: it grows in as the body comes out (no jump
      // when a beast just under the surface breaks it), its columns wholly under water veiled too (no edge on it)
      const f = Math.min(1, out / B.fadeOut);
      if (f <= 0) continue;
      for (const { x, ct, cb, line, cut } of cols) {
        if (cb <= line) continue; // wholly out of the water here
        // under the line: the water's veil, stronger deeper down (cells side by side, never overlapping: no seams)
        for (let y = Math.max(line, ct); y < cb; y += B.band) {
          const k = Math.min(1, (y - line) / B.fullDepth);
          const [r, gg, bb] = rampColor(SEA.waterByY, y);
          g.fillStyle(
            Phaser.Display.Color.GetColor(r, gg, bb),
            f * (B.veil[0] + (B.veil[1] - B.veil[0]) * k),
          );
          g.fillRect(x, y, B.step, Math.min(B.band, cb - y));
        }
        // the line itself, where the wave cuts the body
        if (!cut) continue;
        g.fillStyle(Phaser.Display.Color.GetColor(...B.lineColor), f * B.lineAlpha);
        g.fillRect(x, line - B.line / 2, B.step, B.line);
      }
    }
  }
}
