// The far and middle ridges of each look of the sea, painted by the code (data/seaLooks.ts RidgeStyle) until the
// panoramas of docs/GEMINI-LOTTO-9.md arrive: a strip twice the screen wide that repeats sideways, so every shape
// is periodic and anything near an edge is drawn again on the other side.
import type { RidgeStyle, SeaLookDef } from '../data/seaLooks';
import { hash2 } from '../systems/math';

export type RidgeKind = 'far' | 'mid';

type Ctx = CanvasRenderingContext2D;

function ridgeLine(t: number, seed: number, amp: number, freq: number): number {
  let y = 0;
  for (let o = 1; o <= 4; o++)
    y += (Math.sin(t * freq * o * 1.7 + seed * o * 3.1 + Math.sin(t * freq * 0.5 * o + seed)) * amp) / o;
  return y;
}

/** Height of the strip as a share of the screen's. */
export const stripShare = (kind: RidgeKind, style: RidgeStyle): number =>
  (style === 'kelp' || style === 'spires' || style === 'trench' ? 0.15 : 0) + (kind === 'far' ? 0.5 : 0.35);

/** A colour darker (k < 1) or lighter (k > 1). */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Calls draw at x and, near an edge, again a strip's width away (the strip repeats). */
function wrap(x: number, reach: number, width: number, draw: (x: number) => void): void {
  draw(x);
  if (x - reach < 0) draw(x + width);
  if (x + reach > width) draw(x - width);
}

/** The skyline of a style at x (0 = top of the strip). */
function skyline(
  style: RidgeStyle,
  x: number,
  width: number,
  height: number,
  kind: RidgeKind,
  seed: number,
): number {
  const t = (x / width) * Math.PI * 2;
  const far = kind === 'far';
  const base = height * (far ? 0.45 : 0.4);
  switch (style) {
    case 'reef':
      return base + height * 0.08 + ridgeLine(t, seed, height * 0.09, far ? 2 : 3);
    case 'plateau': {
      // a flat shelf, then the drop (the Ciglio): one per strip, the void between the cliffs
      const u = (x / width + seed * 0.13) % 1;
      const shelf = base + height * 0.12 + ridgeLine(t, seed, height * 0.025, 3);
      if (u < 0.62) return shelf;
      if (u < 0.66) return shelf + ((u - 0.62) / 0.04) * (height - shelf);
      if (u < 0.94) return height + 1;
      return height - ((u - 0.94) / 0.06) * (height - shelf);
    }
    case 'kelp':
      return base + height * 0.22 + ridgeLine(t, seed, height * 0.08, 2);
    case 'ice': {
      // broken slabs of different widths and heights, each tilted its own way, flat-topped or peaked
      const n = far ? 7 : 11;
      const slab = Math.floor((x / width) * n) % n;
      const u = ((x / width) * n) % 1;
      const p = 0.2 + 0.6 * hash2(slab, 4 + seed); // where its top is
      const tall = 0.4 + 0.6 * hash2(slab, 3 + seed);
      const flat = hash2(slab, 5 + seed) < 0.4 ? 0.25 : 0;
      const side = u < p ? (p - u) / p : (u - p) / (1 - p);
      const rise = Math.max(0, Math.min(1, (1 - side) / (1 - flat)));
      return base + height * 0.18 - height * 0.32 * tall * Math.pow(rise, 0.7);
    }
    case 'spires':
      return base + height * 0.2 + ridgeLine(t, seed, height * 0.06, 2);
    case 'trench': {
      // two walls rising steep at the sides of a gorge
      const u = Math.cos(t + seed);
      return base + height * 0.1 - Math.sign(u) * Math.pow(Math.abs(u), 3) * height * 0.32;
    }
    default:
      return (
        base +
        ridgeLine(t, seed, height * (far ? 0.22 : 0.18), far ? 1 : 2) +
        (far ? Math.sin(t * 2) * height * 0.1 : 0)
      );
  }
}

function fillSkyline(
  g: Ctx,
  def: { top: string; bottom: string },
  style: RidgeStyle,
  w: number,
  h: number,
  kind: RidgeKind,
  seed: number,
): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, def.top);
  grad.addColorStop(1, def.bottom);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, Math.min(h, skyline(style, x, w, h, kind, seed)));
  g.lineTo(w, h);
  g.closePath();
  g.fill();
}

/** What stands on the skyline: rocks, coral, stalks, spikes, spires. */
function details(
  g: Ctx,
  look: SeaLookDef,
  style: RidgeStyle,
  w: number,
  h: number,
  kind: RidgeKind,
  seed: number,
  screenW: number,
): void {
  const def = look[kind];
  const far = kind === 'far';
  const top = (x: number): number => skyline(style, ((x % w) + w) % w, w, h, kind, seed);
  const n = (k: number): number => Math.round(k * (w / screenW));
  if (style === 'hills') {
    for (let i = 0; i < n(far ? 3.5 : 6); i++) {
      const x = hash2(i + 1, 9 + seed) * w;
      const sw = (0.03 + hash2(i, 7) * 0.03) * screenW;
      const sh = (far ? 0.35 : 0.15) * h + hash2(i, 8) * 0.3 * h;
      wrap(x, sw, w, (cx) => {
        g.fillStyle = shade(def.top, 0.8);
        g.beginPath();
        g.moveTo(cx - sw, h);
        g.lineTo(cx - sw * 0.6, h - sh);
        g.lineTo(cx - sw * 0.1, h - sh * 1.08);
        g.lineTo(cx + sw * 0.5, h - sh * 0.9);
        g.lineTo(cx + sw, h);
        g.fill();
      });
    }
  } else if (style === 'reef') {
    // coral humps and fans along the top
    for (let i = 0; i < n(far ? 14 : 22); i++) {
      const x = hash2(i + 3, 11 + seed) * w;
      const r = (far ? 0.012 : 0.02) * screenW * (0.6 + hash2(i, 12));
      wrap(x, r * 3, w, (cx) => {
        const y = top(cx);
        g.fillStyle =
          hash2(i, 13) < 0.4 && look.accent ? withAlpha(look.accent, far ? 0.35 : 0.6) : shade(def.top, 1.15);
        g.beginPath();
        g.ellipse(cx, y, r * 1.4, r, 0, Math.PI, 0);
        g.fill();
        if (hash2(i, 14) < 0.45) {
          // a sea fan: thin branches spreading upwards
          g.strokeStyle = look.accent ? withAlpha(look.accent, far ? 0.14 : 0.24) : shade(def.top, 1.3);
          g.lineWidth = Math.max(1, r * 0.08);
          const tall = 1.8 + hash2(i, 15) * 1.2;
          for (let b = -2; b <= 2; b++) {
            g.beginPath();
            g.moveTo(cx, y - r * 0.5);
            g.quadraticCurveTo(cx + b * r * 0.3, y - r * tall * 0.6, cx + b * r * 0.7, y - r * tall);
            g.stroke();
          }
        }
      });
    }
  } else if (style === 'kelp') {
    // stalks rising out of the strip's top, swaying a little, with blades
    for (let i = 0; i < n(far ? 10 : 7); i++) {
      const x = hash2(i + 5, 15 + seed) * w;
      const lean = (hash2(i, 16) - 0.5) * screenW * 0.04;
      const thick = (far ? 0.004 : 0.008) * screenW * (0.7 + hash2(i, 17) * 0.6);
      wrap(x, Math.abs(lean) + thick * 6, w, (cx) => {
        const y0 = top(cx) + h * 0.02;
        g.strokeStyle = shade(def.top, 0.9 + hash2(i, 18) * 0.3);
        g.lineWidth = thick;
        g.beginPath();
        g.moveTo(cx, y0);
        g.bezierCurveTo(cx + lean, y0 * 0.66, cx - lean, y0 * 0.33, cx + lean * 0.5, -2);
        g.stroke();
        g.fillStyle = look.accent ? withAlpha(look.accent, far ? 0.18 : 0.3) : shade(def.top, 1.2);
        for (let k = 1; k < 9; k++) {
          const v = k / 9;
          const bx = cx + lean * Math.sin(v * Math.PI) * 0.6;
          const by = y0 * (1 - v);
          const side = k % 2 ? 1 : -1;
          g.beginPath();
          g.ellipse(bx + side * thick * 2.2, by, thick * 2.4, thick * 0.8, side * 0.6, 0, Math.PI * 2);
          g.fill();
        }
      });
    }
  } else if (style === 'ice') {
    // pale light on the slabs' upper edges
    if (look.accent) {
      g.strokeStyle = withAlpha(look.accent, far ? 0.25 : 0.45);
      g.lineWidth = Math.max(1, h * 0.006);
      g.beginPath();
      for (let x = 0; x <= w; x += 4) g[x ? 'lineTo' : 'moveTo'](x, top(x) + 1);
      g.stroke();
    }
  } else if (style === 'spires' || style === 'trench') {
    const spires = style === 'spires';
    for (let i = 0; i < n(spires ? (far ? 8 : 5) : 3); i++) {
      const x = hash2(i + 7, 19 + seed) * w;
      const sw = (spires ? 0.012 : 0.02) * screenW * (0.7 + hash2(i, 20) * 0.6);
      const sh = h * (spires ? 0.35 + hash2(i, 21) * 0.45 : 0.15);
      wrap(x, sw, w, (cx) => {
        const y = top(cx) + 2;
        g.fillStyle = shade(def.top, 0.85);
        g.beginPath();
        g.moveTo(cx - sw, y);
        g.lineTo(cx - sw * 0.3, y - sh);
        g.lineTo(cx + sw * 0.15, y - sh * 1.04);
        g.lineTo(cx + sw, y);
        g.fill();
        if (look.accent && hash2(i, 22) < (spires ? 0.5 : 0.8)) {
          // a vent's glow at its foot, or specks on the wall
          const rg = g.createRadialGradient(cx, y, 0, cx, y, sw * 2.2);
          rg.addColorStop(0, withAlpha(look.accent, far ? 0.35 : 0.55));
          rg.addColorStop(1, withAlpha(look.accent, 0));
          g.fillStyle = rg;
          g.fillRect(cx - sw * 2.2, y - sw * 2.2, sw * 4.4, sw * 4.4);
        }
      });
    }
  }
}

/** Paints one ridge strip of a look on a canvas `w` × `h` (the screen `screenW` wide). */
export function paintRidgeStrip(
  g: Ctx,
  look: SeaLookDef,
  kind: RidgeKind,
  w: number,
  h: number,
  screenW: number,
): void {
  const def = look[kind];
  const seed = kind === 'far' ? 1 : 5;
  g.clearRect(0, 0, w, h);
  // the kelp stand behind their rocks, the spires and the slabs' light in front
  if (def.style === 'kelp') details(g, look, def.style, w, h, kind, seed, screenW);
  fillSkyline(g, def, def.style, w, h, kind, seed);
  if (def.style !== 'kelp') details(g, look, def.style, w, h, kind, seed, screenW);
}
