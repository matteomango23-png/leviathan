// The instruments at the top of the helm (owner, 20 ottobre 2026: "3 indicatori tipo contachilometri anni 70
// quadrati: velocità, autonomia, tot litri carburante; icone senza scritte"): square brass dials, a needle and a small
// number each, plus the depth under water. What they show is helmGauges.ts dialValues.
import { HELM } from '../data/ship';
import { dialValues, type DialKind } from './helmGauges';
import type { HelmInfo } from './helmTypes';
import { el } from './dom';

const NS = 'http://www.w3.org/2000/svg';

/** The small icon over each needle's pivot, in a 24×24 box (no words). */
const ICON: Record<DialKind, string> = {
  // a speedometer's arc and needle
  speed: 'M4 16a8 8 0 0 1 16 0M12 16l4-5',
  // a flag on its pole: how far it goes
  range: 'M6 21V4M6 4h10l-2 3 2 3H6',
  // a jerrycan
  fuel: 'M7 6h8l3 3v11H6V8zM9 6V4h4v2M9 12h6',
  // an anchor: how deep
  depth: 'M12 4v16M8 8h8M5 14a7 7 0 0 0 14 0',
};

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, parent: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}

interface Dial {
  root: HTMLDivElement;
  needle: SVGLineElement;
  text: HTMLDivElement;
}

export class HelmDials {
  private readonly root: HTMLDivElement;
  private readonly dials = new Map<DialKind, Dial>();

  constructor(parent: HTMLElement) {
    this.root = el('div', 'helm-dials', parent);
  }

  private dial(kind: DialKind): Dial {
    const have = this.dials.get(kind);
    if (have) return have;
    const root = el('div', `helm-dial ${kind}`, this.root);
    root.style.width = root.style.height = `${HELM.dials.size}px`;
    const face = svg('svg', { viewBox: '0 0 40 40', class: 'helm-dial-face' }, root);
    // the scale: an arc of the sweep with a few ticks, like a 1970s gauge
    const sweep = (HELM.dials.sweepDeg * Math.PI) / 180;
    const from = Math.PI / 2 + (Math.PI * 2 - sweep) / 2;
    for (let i = 0; i <= 6; i++) {
      const a = from + (sweep * i) / 6;
      const r1 = i % 3 === 0 ? 13 : 14.5;
      svg(
        'line',
        {
          x1: String(20 + Math.cos(a) * r1),
          y1: String(20 + Math.sin(a) * r1),
          x2: String(20 + Math.cos(a) * 17),
          y2: String(20 + Math.sin(a) * 17),
          class: 'helm-dial-tick',
        },
        face,
      );
    }
    const icon = svg('g', { transform: 'translate(15 22) scale(0.42)', class: 'helm-dial-icon' }, face); // under the pivot
    svg('path', { d: ICON[kind] }, icon);
    const needle = svg('line', { x1: '20', y1: '20', x2: '20', y2: '6', class: 'helm-dial-needle' }, face);
    svg('circle', { cx: '20', cy: '20', r: '2', class: 'helm-dial-pivot' }, face);
    const text = el('div', 'helm-dial-text', root);
    const d = { root, needle, text };
    this.dials.set(kind, d);
    return d;
  }

  update(info: HelmInfo): void {
    const shown = new Set<DialKind>();
    const sweep = HELM.dials.sweepDeg;
    for (const v of dialValues(info)) {
      shown.add(v.kind);
      const d = this.dial(v.kind);
      d.root.hidden = false;
      d.needle.setAttribute('transform', `rotate(${-sweep / 2 + v.share * sweep} 20 20)`);
      if (d.text.textContent !== v.text) d.text.textContent = v.text;
      d.root.classList.toggle('warn', !!v.warn);
    }
    for (const [k, d] of this.dials) if (!shown.has(k)) d.root.hidden = true;
  }
}
