// Small canvas painting helpers for the drawn battle background: a cached canvas texture, colour mixing,
// wobbly horizons and rock grain.
import type Phaser from 'phaser';
import type { Rng } from '../../systems/math';

export type Ctx = CanvasRenderingContext2D;

export function canvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: Ctx) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
  return key;
}

/** A hex colour mixed towards another (t = 0..1), as an rgba() string. */
export function mix(a: string, b: string, t: number, alpha = 1): string {
  const p = (s: string, i: number): number => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/** A wobbly horizon: the sum of a few sines with random phases. */
export function ridge(rng: Rng, amp: number, freq: number): (t: number) => number {
  const ph = [rng() * 9, rng() * 9, rng() * 9, rng() * 9];
  return (t) =>
    (Math.sin(t * freq + ph[0]!) +
      Math.sin(t * freq * 2.3 + ph[1]!) * 0.5 +
      Math.sin(t * freq * 5.1 + ph[2]!) * 0.22 +
      Math.sin(t * freq * 11 + ph[3]!) * 0.08) *
    amp;
}

/**
 * Rock texture: brightens and darkens what is drawn with soft noise at two scales (blotches and grain),
 * leaving the transparent parts alone.
 */
export function grain(c: Ctx, w: number, h: number, rng: Rng, strength: number): void {
  const grid = (n: number): ((x: number, y: number) => number) => {
    const gw = n + 2;
    const v = Array.from({ length: gw * gw }, () => rng() * 2 - 1);
    return (x, y) => {
      const fx = x * n;
      const fy = y * n;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const at = (a: number, b: number): number => v[(b % gw) * gw + (a % gw)]!;
      const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
      const bottom = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
      return top * (1 - ty) + bottom * ty;
    };
  };
  const big = grid(8);
  const mid = grid(40);
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (d[o + 3] === 0) continue;
      const k = 1 + strength * (big(x / w, y / h) * 0.7 + mid(x / w, y / h) * 0.35 + (rng() - 0.5) * 0.15);
      d[o] = d[o]! * k;
      d[o + 1] = d[o + 1]! * k;
      d[o + 2] = d[o + 2]! * k;
    }
  c.putImageData(img, 0, 0);
}
