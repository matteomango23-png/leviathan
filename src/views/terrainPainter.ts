// Paints one square chunk of rock as a soft, layered painting (not blocky tiles).
// The outline follows TileMap.field exactly, so what you see is what you bump into.
import { SEA, TERRAIN } from '../data/diver';
import { CORALS, ICE, TILE } from '../data/worldLayout';
import { hash2, noise2, rampColor } from '../systems/math';
import type { TileMap } from '../systems/world/tileMap';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** True if a chunk has any rock in it (open-water chunks are not painted at all). */
export function chunkHasRock(map: TileMap, x0: number, y0: number, size: number): boolean {
  const T = map.tileSize;
  const tx0 = Math.floor(x0 / T) - 1;
  const ty0 = Math.floor(y0 / T) - 1;
  const n = Math.ceil(size / T) + 2;
  for (let ty = ty0; ty < ty0 + n; ty++)
    for (let tx = tx0; tx < tx0 + n; tx++)
      if (map.get(tx, ty) !== TILE.water && ty * T + T > map.surfaceY) return true;
  return false;
}

/** Box blur of a square grid (radius r), used as "how deep inside the rock" a point is. */
function boxBlur(src: Float32Array, w: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < w; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc * k;
      acc += src[y * w + Math.min(w - 1, x + r + 1)]! - src[y * w + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(w - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < w; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[Math.min(w - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

function drawCorals(g: CanvasRenderingContext2D, map: TileMap, x0: number, y0: number, size: number): void {
  const T = map.tileSize;
  const tpu = TERRAIN.texelsPerUnit;
  const tx0 = Math.floor(x0 / T);
  const ty0 = Math.floor(y0 / T);
  const n = Math.ceil(size / T);
  g.save();
  g.scale(tpu, tpu);
  g.translate(-x0, -y0);
  g.lineCap = 'round';
  for (let ty = ty0; ty < ty0 + n; ty++) {
    for (let tx = tx0; tx < tx0 + n; tx++) {
      if (!map.isTop(tx, ty)) continue;
      const x = tx * T;
      const y = ty * T;
      const reef = x > CORALS.reef.xMin && x < CORALS.reef.xMax && y < CORALS.reef.maxY;
      const set = reef
        ? CORALS.reef
        : y < CORALS.shallow.maxY
          ? CORALS.shallow
          : y < CORALS.deep.maxY
            ? CORALS.deep
            : null;
      if (!set || hash2(tx, ty * 7) > set.chance) continue;
      const count = 1 + Math.floor(hash2(tx * 3, ty) * (reef ? 3 : 2));
      for (let i = 0; i < count; i++) {
        const cx = x + hash2(tx, i) * T;
        // root the coral on the smooth rock outline
        let cy = y - T;
        while (cy < y + T && !map.solidAt(cx, cy)) cy += 0.5;
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

/**
 * Paints the chunk whose top-left world corner is (x0, y0) into `g` (size × texelsPerUnit pixels square).
 */
export function paintChunk(
  g: CanvasRenderingContext2D,
  map: TileMap,
  x0: number,
  y0: number,
  size: number,
): void {
  const tpu = TERRAIN.texelsPerUnit;
  const px = size * tpu;
  const M = TERRAIN.shadeRadius + 2; // margin in units around the chunk
  const W = size + 2 * M + 1; // unit grid width
  const field = new Float32Array(W * W);
  const blotch = new Float32Array(W * W);
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const wx = x0 - M + i;
      const wy = y0 - M + j;
      field[j * W + i] = map.field(wx, wy);
      blotch[j * W + i] = noise2(wx * 0.07, wy * 0.07) * 0.65 + noise2(wx * 0.23 + 11, wy * 0.23 + 5) * 0.35;
    }
  }
  const depth = boxBlur(field, W, TERRAIN.shadeRadius);

  const img = g.createImageData(px, px);
  const d = img.data;
  const soft = TERRAIN.edgeSoftness;
  const rowRock: [number, number, number][] = [];
  const rowSed: [number, number, number][] = [];
  for (let py = 0; py < px; py++) {
    const wy = y0 + (py + 0.5) / tpu;
    rowRock.push(rampColor(SEA.rockByY, wy));
    rowSed.push(rampColor(SEA.sedimentByY, wy));
  }

  for (let py = 0; py < px; py++) {
    const v = (py + 0.5) / tpu + M;
    const j0 = Math.floor(v);
    const fy = v - j0;
    const wy = y0 + (py + 0.5) / tpu;
    const rock = rowRock[py]!;
    const sed = rowSed[py]!;
    for (let pxx = 0; pxx < px; pxx++) {
      const u = (pxx + 0.5) / tpu + M;
      const i0 = Math.floor(u);
      const fx = u - i0;
      const k00 = j0 * W + i0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const f = field[k00]! * w00 + field[k00 + 1]! * w10 + field[k00 + W]! * w01 + field[k00 + W + 1]! * w11;
      const alpha = smooth01((f - 0.5) / soft + 0.5);
      if (alpha <= 0) continue;
      const dep =
        depth[k00]! * w00 + depth[k00 + 1]! * w10 + depth[k00 + W]! * w01 + depth[k00 + W + 1]! * w11;
      const up = depth[k00 + W]! - depth[k00 - W]!; // > 0 where rock lies below: an up-facing surface
      const bl =
        blotch[k00]! * w00 + blotch[k00 + 1]! * w10 + blotch[k00 + W]! * w01 + blotch[k00 + W + 1]! * w11;
      const wx = x0 + (pxx + 0.5) / tpu;

      const tile = map.tileAtPoint(wx, wy);
      let r: number;
      let gg: number;
      let b: number;
      if (tile === TILE.bone || tile === TILE.ice) {
        const c = tile === TILE.bone ? SEA.bone : SEA.ice;
        const stripe =
          tile === TILE.bone ? ((wx + wy * 2) % 7 < 2 ? -60 : 0) : (wx * 3 + wy) % 11 < 2 ? 30 : 0;
        r = c[0] + stripe;
        gg = c[1] + stripe;
        b = c[2] + stripe;
      } else {
        const edge = 1 - smooth01((dep - 0.5) * 3.2); // 1 near the outline, 0 deep inside
        const interior = 1 - 0.62 * smooth01((dep - 0.55) * 2.2); // deep rock sinks into shadow
        const lit = clamp01(up * 2.2) * edge; // sediment on up-facing ledges
        const strata = Math.sin(wy * 0.33 + bl * 5) * 5;
        const tone = (bl - 0.5) * 34 + strata + edge * 16;
        r = (rock[0] + tone) * interior;
        gg = (rock[1] + tone) * interior;
        b = (rock[2] + tone) * interior;
        r += (sed[0] - r) * lit * 0.85;
        gg += (sed[1] - gg) * lit * 0.85;
        b += (sed[2] - b) * lit * 0.85;
        if (wx > ICE.xMin) {
          r += SEA.iceTint[0];
          gg += SEA.iceTint[1];
          b += SEA.iceTint[2];
        }
      }
      const grain = (hash2(Math.floor(wx * tpu), Math.floor(wy * tpu)) - 0.5) * 14;
      const o = (py * px + pxx) * 4;
      d[o] = r + grain;
      d[o + 1] = gg + grain;
      d[o + 2] = b + grain;
      d[o + 3] = alpha * 255;
    }
  }
  g.clearRect(0, 0, px, px);
  g.putImageData(img, 0, 0);
  drawCorals(g, map, x0, y0, size);
}
