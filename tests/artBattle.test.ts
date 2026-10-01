import { describe, expect, it } from 'vitest';
import {
  borderColor,
  fadeCutEdges,
  iconFromBlack,
  parseExtraName,
  parseInboxName,
  removeDarkBackground,
  removeGreenBackground,
} from '../scripts/art/cutout.ts';

const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number): number => d[(y * w + x) * 4 + 3]!;

/** A navy image (like a screenshot) with a dark "shark": a body with a thin very dark crease across it. */
function darkShark(w = 60, h = 40): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const body = x >= 10 && x < 50 && y >= 10 && y < 30;
      const crease = body && x === 30; // a shadow as dark as the background, one pixel wide
      const c = !body || crease ? [12, 18, 30] : [60, 70, 80];
      data.set([...c, 255], o);
    }
  return { data, width: w, height: h };
}

describe('battle pictures: cut-out', () => {
  it('reads a navy background from the border', () => {
    expect(borderColor(darkShark())).toEqual([12, 18, 30]);
  });

  it('removes the background but never holes a dark body through a thin shadow', () => {
    const img = darkShark();
    const out = removeDarkBackground(img, borderColor(img), 2, { low: 3, high: 16 });
    expect(alphaAt(out, 60, 2, 2)).toBe(0); // background gone
    expect(alphaAt(out, 60, 20, 20)).toBe(255); // body kept
    expect(alphaAt(out, 60, 30, 20)).toBe(255); // the dark crease inside the body is kept
  });

  it('mirrors pictures named _flip, never cards', () => {
    expect(parseInboxName('squalo_bianco_front_flip.jpg')).toEqual({
      id: 'squalo_bianco',
      kind: 'front',
      mirror: true,
    });
    expect(parseInboxName('squalo_bianco_card_flip.jpg')).toBeNull();
  });
});

describe('battle extras', () => {
  it('recognises background layers, the shell and icons', () => {
    expect(parseExtraName('bg_baia_far.jpg')).toEqual({ kind: 'bg', place: 'baia', layer: 'far' });
    expect(parseExtraName('bg_tana_ground.png')).toEqual({ kind: 'bg', place: 'tana', layer: 'ground' });
    expect(parseExtraName('conchiglia_aperta.jpg')).toEqual({ kind: 'item', id: 'conchiglia_aperta' });
    expect(parseExtraName('tipo_tempesta.jpg')).toEqual({ kind: 'icon', id: 'tipo_tempesta' });
    expect(parseExtraName('squalo_bianco_card.jpg')).toBeNull();
  });

  it('removes a green background and takes the green tint off the edges', () => {
    const data = new Uint8ClampedArray([0, 255, 0, 255, 90, 80, 70, 255, 80, 140, 70, 255]);
    const out = removeGreenBackground({ data, width: 3, height: 1 });
    expect(out[3]).toBe(0); // pure green: gone
    expect(out[7]).toBe(255); // rock: kept
    expect(out[11]).toBeGreaterThan(0); // a greenish edge: half
    expect(out[9]).toBeLessThanOrEqual(80); // …without its green
  });

  it('turns a white-on-black icon into white with transparency', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const out = iconFromBlack({ data, width: 2, height: 1 });
    expect([...out]).toEqual([255, 255, 255, 0, 255, 255, 255, 255]);
  });
});

describe('battle pictures: fins cut by the frame', () => {
  it('fades a creature where it touches the edge of the picture, leaves the rest alone', () => {
    const w = 50;
    const h = 20;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 5; y < 15; y++) for (let x = 0; x < 30; x++) px[(y * w + x) * 4 + 3] = 255; // touches the left
    fadeCutEdges(px, w, h, 0.5); // fade over 10 px
    expect(px[(10 * w + 0) * 4 + 3]).toBe(0); // at the cut: transparent
    expect(px[(10 * w + 5) * 4 + 3]).toBeGreaterThan(0);
    expect(px[(10 * w + 5) * 4 + 3]).toBeLessThan(255);
    expect(px[(10 * w + 25) * 4 + 3]).toBe(255); // far from the cut: untouched
  });
});
