// Instruments of the cockpit drawn in SVG (owner, 5 ottobre: "grafica da cockpit della marina"): round dials with
// a needle, and the chart strip of the bridge. Drawing only; the values come from the systems.
import type { Chart, ChartKind } from '../systems/chart';
import { el } from './dom';

const NS = 'http://www.w3.org/2000/svg';
function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [
  cx + r * Math.cos(a),
  cy + r * Math.sin(a),
];
const arc = (cx: number, cy: number, r: number, a0: number, a1: number): string => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

export interface DialSpec {
  label: string;
  /** 0 … 1 where the needle points. */
  share: number;
  /** The big number and its unit, and a line under it. */
  value: string;
  unit: string;
  note?: string;
  /** Below this share the scale turns red (fuel). */
  warnBelow?: number;
}

/** A round dial: a 240° scale with ticks, a coloured band, a needle and the reading. */
export function dial(parent: HTMLElement, d: DialSpec): HTMLElement {
  const box = el('div', 'dial', parent);
  const svg = svgEl('svg', { viewBox: '0 0 120 104', class: 'dial-svg' }, box);
  const cx = 60;
  const cy = 60;
  const a0 = Math.PI * (5 / 6);
  const a1 = Math.PI * (13 / 6);
  svgEl('circle', { cx, cy, r: 52, class: 'dial-bezel' }, svg);
  svgEl('path', { d: arc(cx, cy, 44, a0, a1), class: 'dial-track' }, svg);
  const share = Math.max(0, Math.min(1, d.share));
  const low = d.warnBelow !== undefined && share < d.warnBelow;
  if (share > 0.005)
    svgEl(
      'path',
      { d: arc(cx, cy, 44, a0, a0 + (a1 - a0) * share), class: `dial-fill${low ? ' low' : ''}` },
      svg,
    );
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10;
    const [x0, y0] = polar(cx, cy, i % 5 === 0 ? 33 : 36, a);
    const [x1, y1] = polar(cx, cy, 39, a);
    svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'dial-tick' }, svg);
  }
  const [nx, ny] = polar(cx, cy, 36, a0 + (a1 - a0) * share);
  svgEl('line', { x1: cx, y1: cy, x2: nx, y2: ny, class: 'dial-needle' }, svg);
  svgEl('circle', { cx, cy, r: 4, class: 'dial-hub' }, svg);
  const v = svgEl('text', { x: cx, y: 88, class: 'dial-value' }, svg);
  v.textContent = d.value;
  const u = svgEl('text', { x: cx, y: 99, class: 'dial-unit' }, svg);
  u.textContent = d.unit;
  el('div', 'dial-label', box, d.label);
  if (d.note) el('div', 'dial-note', box, d.note);
  return box;
}

const MARK_GLYPH: Record<ChartKind, string> = {
  harbour: '⚓',
  border: '',
  sub: '●',
  den: '◎',
  target: '◎',
  end: '▌',
};

/** The chart strip: the ship in the middle, a km scale, and what lies each side. */
export function chartStrip(parent: HTMLElement, c: Chart, face: 1 | -1): HTMLElement {
  const box = el('div', 'chart', parent);
  const W = 1000;
  const H = 150;
  const svg = svgEl(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'chart-svg' },
    box,
  );
  const sx = (dx: number): number => W / 2 + (dx / c.halfM) * (W / 2 - 20);
  const sea = 92;
  for (let g = 0; g <= 8; g++)
    svgEl('line', { x1: (W * g) / 8, y1: 10, x2: (W * g) / 8, y2: H - 22, class: 'chart-grid' }, svg);
  svgEl('line', { x1: 0, y1: sea, x2: W, y2: sea, class: 'chart-sea' }, svg);
  const step = 500;
  for (let m = -c.halfM; m <= c.halfM; m += step) {
    const x = sx(m);
    svgEl('line', { x1: x, y1: H - 22, x2: x, y2: H - 14, class: 'chart-tick' }, svg);
    const t = svgEl('text', { x, y: H - 3, class: 'chart-km' }, svg);
    t.textContent =
      m === 0 ? '0' : `${m > 0 ? '+' : '−'}${(Math.abs(m) / 1000).toString().replace('.', ',')}`;
  }
  let row = 0;
  for (const mk of c.marks) {
    const x = sx(mk.dx);
    if (mk.kind === 'border') {
      svgEl('line', { x1: x, y1: 14, x2: x, y2: H - 22, class: 'chart-border' }, svg);
      // near the right edge the name goes before the line, so it is not cut
      const right = x > W * 0.7;
      const t = svgEl(
        'text',
        {
          x: right ? x - 4 : x + 4,
          y: 24,
          'text-anchor': right ? 'end' : 'start',
          class: 'chart-border-label',
        },
        svg,
      );
      t.textContent = right ? `${mk.label} ▸` : `▸ ${mk.label}`;
      continue;
    }
    const y = sea - 14 - (row++ % 2) * 30;
    // dens sit under the surface, their name beside them (under them is the km scale)
    const deep = mk.kind === 'den' || mk.kind === 'target';
    const g = svgEl('text', { x, y: deep ? sea + 30 : y, class: `chart-mark ${mk.kind}` }, svg);
    g.textContent = MARK_GLYPH[mk.kind];
    const leftSide = x > W - 260;
    const t = svgEl(
      'text',
      {
        x: deep ? x + (leftSide ? -18 : 18) : x,
        y: deep ? sea + 24 : y - 16,
        'text-anchor': deep
          ? leftSide
            ? 'end'
            : 'start'
          : x < 110
            ? 'start'
            : x > W - 110
              ? 'end'
              : 'middle',
        class: `chart-label ${mk.kind}`,
      },
      svg,
    );
    t.textContent = mk.label;
  }
  // the ship, pointing where it goes
  const sx0 = W / 2;
  svgEl(
    'path',
    {
      d: `M${sx0 - 22 * face} ${sea - 2} L${sx0 + 22 * face} ${sea - 2} L${sx0 + 14 * face} ${sea + 8} L${sx0 - 18 * face} ${sea + 8} Z`,
      class: 'chart-ship',
    },
    svg,
  );
  svgEl('line', { x1: sx0, y1: 10, x2: sx0, y2: H - 22, class: 'chart-me' }, svg);
  return box;
}
