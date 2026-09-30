import { describe, expect, it } from 'vitest';
import {
  bodyLine,
  coverCrop,
  opaqueBox,
  parseInboxName,
  placeProfile,
  removeBlackBackground,
} from '../scripts/art/cutout.ts';

/** A black image with a grey "fish" rectangle and a black eye inside it. */
function fishImage(w = 40, h = 20): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const inFish = x >= 10 && x < 30 && y >= 6 && y < 14;
      const eye = x === 26 && y === 9;
      const v = inFish && !eye ? 120 : 0;
      d[o] = v;
      d[o + 1] = v;
      d[o + 2] = v;
      d[o + 3] = 255;
    }
  return d;
}

describe('art: background removal', () => {
  it('makes the black border transparent and keeps the creature', () => {
    const out = removeBlackBackground({ data: fishImage(), width: 40, height: 20 });
    expect(out[3]).toBe(0); // corner
    expect(out[(10 * 40 + 20) * 4 + 3]).toBe(255); // body
  });

  it('keeps dark details inside the creature (not reachable from the border)', () => {
    const out = removeBlackBackground({ data: fishImage(), width: 40, height: 20 });
    expect(out[(9 * 40 + 26) * 4 + 3]).toBe(255); // the black eye stays
  });

  it('finds the bounding box and the body line', () => {
    const out = removeBlackBackground({ data: fishImage(), width: 40, height: 20 });
    const box = opaqueBox(out, 40, 20)!;
    expect(box).toEqual({ x0: 10, y0: 6, x1: 29, y1: 13 });
    expect(bodyLine(out, 40, box)).toBeCloseTo(9.5);
  });
});

describe('art: layout', () => {
  const frame = { w: 1000, h: 460, lineY: 250 };

  it('fills the frame width with the body line on y=250', () => {
    const p = placeProfile(500, 150, 75, frame);
    expect(p.scale).toBe(2);
    expect(p.left).toBe(0);
    expect(p.top + 75 * p.scale).toBeCloseTo(250);
  });

  it('shrinks tall creatures so nothing spills out of the frame', () => {
    const p = placeProfile(500, 400, 200, frame);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.top + 400 * p.scale).toBeLessThanOrEqual(460);
    expect(p.left).toBeGreaterThan(0);
  });

  it('crops cards to 2:3', () => {
    expect(coverCrop(848, 1264, 2 / 3)).toEqual({ left: 3, top: 0, width: 843, height: 1264 });
    expect(coverCrop(1000, 1000, 2 / 3)).toEqual({ left: 167, top: 0, width: 667, height: 1000 });
  });
});

describe('art: inbox names', () => {
  it('recognises cards, profiles and mirrored profiles', () => {
    expect(parseInboxName('squalo_bianco_card.jpg')).toEqual({
      id: 'squalo_bianco',
      kind: 'card',
      mirror: false,
    });
    expect(parseInboxName('squalo_bianco_albino_side_open.jpeg')).toEqual({
      id: 'squalo_bianco_albino',
      kind: 'side_open',
      mirror: false,
    });
    expect(parseInboxName('torpedine_side_left.jpeg')).toEqual({
      id: 'torpedine',
      kind: 'side',
      mirror: true,
    });
    expect(parseInboxName('LEGGIMI.txt')).toBeNull();
    expect(parseInboxName('foto.jpg')).toBeNull();
  });
});
