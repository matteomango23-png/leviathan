// The corals on the rock tops, painted into each chunk of terrain (views/terrainPainter.ts): the owner's painted
// corals (lot C3, data/worldArt.ts PROP_ART) or, without them, little branches drawn with lines. Where they grow
// comes from the coral sets (data/worldLayout.ts CORALS, the stretches' own in the endless sea).
import { TERRAIN } from '../data/diver';
import { CORALS } from '../data/worldLayout';
import { PROP_ART } from '../data/worldArt';
import { hash2 } from '../systems/math';
import { biomeAt } from '../systems/world/endless';
import { galleriesAtX } from '../systems/world/galleries';
import type { TileMap } from '../systems/world/tileMap';

/** Pictures the terrain painter uses: the corals, and the bone walls' texture as pixels. */
export interface PaintProps {
  corals?: CanvasImageSource[];
  bones?: ImageData;
  /** The Gallerie's dark cave wall (lot M3). */
  caveWall?: ImageData;
}

export function drawCorals(
  g: CanvasRenderingContext2D,
  map: TileMap,
  x0: number,
  y0: number,
  size: number,
  pictures?: CanvasImageSource[],
): void {
  const T = map.tileSize;
  const tpu = TERRAIN.texelsPerUnit;
  const tx0 = Math.floor(x0 / T);
  const ty0 = Math.floor(y0 / T);
  const n = Math.ceil(size / T);
  // the tops a little outside the chunk too: a coral standing by its edge is drawn whole by both chunks
  const pad = pictures?.length ? 2 : 0;
  g.save();
  g.scale(tpu, tpu);
  g.translate(-x0, -y0);
  g.lineCap = 'round';
  for (let ty = ty0 - pad; ty < ty0 + n + pad; ty++) {
    for (let tx = tx0 - pad; tx < tx0 + n + pad; tx++) {
      if (!map.isTop(tx, ty)) continue;
      const x = tx * T;
      const y = ty * T;
      const biome = biomeAt(x);
      const far = biome && biome.corals.colors.length ? { ...biome.corals, maxY: Infinity } : null;
      const patch = CORALS.patches.some((p) => x > p.x0 && x < p.x1 && y < p.maxY);
      const reef = !!far || patch || (x > CORALS.reef.xMin && x < CORALS.reef.xMax && y < CORALS.reef.maxY);
      const set = far
        ? far
        : reef
          ? CORALS.reef
          : y < CORALS.shallow.maxY
            ? CORALS.shallow
            : y < CORALS.deep.maxY
              ? CORALS.deep
              : null;
      if (!set || hash2(tx, ty * 7) > set.chance) continue;
      // never in or by a gallery (its cave wall would cover half of one: a straight cut)
      if (galleriesAtX(x, 40).some((g) => y > g.y0 - 40 && y < g.y1 + 40)) continue;
      const count = 1 + Math.floor(hash2(tx * 3, ty) * (reef ? 3 : 2));
      for (let i = 0; i < count; i++) {
        const cx = x + hash2(tx, i) * T;
        // root the coral on the smooth rock outline
        let cy = y - T;
        while (cy < y + T && !map.solidAt(cx, cy)) cy += 0.5;
        if (pictures?.length) {
          // a painted coral (lot C3), its rock base sunk a little into the rock
          const pic = pictures[Math.floor(hash2(tx * 5 + i, ty * 3) * pictures.length)]! as HTMLImageElement;
          const [lo, hi] = PROP_ART.coralHeight;
          const h = (lo + hash2(tx + i * 7, ty) * (hi - lo)) * (reef ? 1 : 0.7);
          const w = (h * pic.width) / pic.height;
          // standing on the deepest rock under its whole base (the terrain is laid over it: what goes into the
          // rock is hidden; owner, 25 ottobre: "ben piantate al terreno"); too steep a slope, no coral there
          let base = cy;
          for (let k = -2; k <= 2; k++) {
            const sx = cx + (k / 4) * w;
            let sy = cy - T;
            while (sy < cy + h && !map.solidAt(sx, sy)) sy += 0.5;
            base = Math.max(base, sy);
          }
          if (base - cy > h * 0.35) continue;
          g.drawImage(pic, cx - w / 2, base - h + PROP_ART.coralSink, w, h);
          continue;
        }
        g.strokeStyle = set.colors[(tx + i) % set.colors.length]!;
        g.lineWidth = reef ? 0.9 : 0.6;
        const len = (reef ? 3 : 2) + hash2(tx + i, ty * 3) * (reef ? 5 : 3);
        const branch = (bx: number, by: number, a: number, l: number, depth: number): void => {
          if (depth > 3 || l < 0.8) return;
          const ex = bx + Math.cos(a) * l;
          const ey = by + Math.sin(a) * l;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(ex, ey);
          g.stroke();
          branch(ex, ey, a - 0.45, l * 0.72, depth + 1);
          branch(ex, ey, a + 0.4, l * 0.7, depth + 1);
        };
        branch(cx, cy + 0.6, -Math.PI / 2 + (hash2(tx, ty + i) - 0.5) * 0.4, len, 0);
      }
    }
  }
  g.restore();
}
