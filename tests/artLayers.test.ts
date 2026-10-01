import { describe, expect, it } from 'vitest';
import { ellipseMask, fitStage, frameMask, greenShare, keepLargest } from '../scripts/art/layers.ts';

const G = [0, 255, 0, 255];
const ROCK = [20, 30, 34, 255];
const WATER = [30, 70, 80, 255];
const LIGHT = [120, 170, 180, 255];

/** A w×h picture from a function giving the colour of each pixel. */
function picture(w: number, h: number, at: (x: number, y: number) => number[]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(at(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}

describe('painted background layers', () => {
  it('keeps only the frame of a foreground: side rocks and dark things hanging from the top', () => {
    // rocks at the sides, a green opening in the middle-top, painted water below it, a light beam on top
    const img = picture(40, 30, (x, y) =>
      x < 6 || x > 33 ? ROCK : y < 3 ? (x === 20 ? LIGHT : ROCK) : y < 15 ? G : WATER,
    );
    const m = frameMask(img);
    const at = (x: number, y: number): number => m[y * 40 + x]!;
    expect(at(2, 25)).toBe(1); // side rock, even low down
    expect(at(37, 10)).toBe(1);
    expect(at(10, 1)).toBe(1); // rock hanging from the top
    expect(at(20, 1)).toBe(0); // a painted light beam up there: not part of the frame
    expect(at(20, 25)).toBe(0); // the water in the middle would cover the beasts: dropped
    expect(at(20, 10)).toBe(0); // the green itself
  });

  it('fits an ellipse to the stone stage, ignoring the dark water above it', () => {
    const cx = 50;
    const cy = 40;
    const img = picture(100, 60, (x, y) => {
      const inStage = ((x - cx) / 30) ** 2 + ((y - cy) / 10) ** 2 <= 1;
      if (inStage) return ROCK;
      return y < 32 ? WATER : G; // dark water above, green around and below
    });
    const e = fitStage(img)!;
    expect(e.cx).toBeCloseTo(cx, 0);
    expect(e.rx).toBeGreaterThan(26);
    expect(e.rx).toBeLessThan(32);
    expect(e.cy).toBeGreaterThan(36);
    const m = ellipseMask(100, 60, e);
    expect(m[40 * 100 + 50]).toBe(1); // middle of the stage
    expect(m[10 * 100 + 50]).toBe(0); // water far above
  });
});

describe('painted layers with a clean green', () => {
  it('measures how green the middle is', () => {
    const img = picture(20, 10, (x) => (x >= 8 && x < 12 ? G : ROCK));
    expect(greenShare(img)).toBe(1);
    expect(greenShare(img, 0, 0.3)).toBe(0);
  });

  it('keeps only the biggest piece of a ground (drops a stray second slab)', () => {
    const w = 30;
    const h = 20;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 1; y < 3; y++) for (let x = 10; x < 20; x++) px[(y * w + x) * 4 + 3] = 255; // small slab
    for (let y = 8; y < 18; y++) for (let x = 2; x < 28; x++) px[(y * w + x) * 4 + 3] = 255; // the stage
    keepLargest(px, w, h);
    expect(px[(2 * w + 15) * 4 + 3]).toBe(0);
    expect(px[(12 * w + 15) * 4 + 3]).toBe(255);
  });
});
