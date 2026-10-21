// The wheel of the types (owner, 21 ottobre 2026: "deve essere chiaro cosa batte cosa, e la logica dietro deve essere
// spotless"): the five types in a circle, Predatore → Abissale → Glaciale → Tempesta → Corazzato, each beating the
// next one (the arrows round the wheel) and the one three after it (the star inside), with one sentence why for each.
// Opened from the bestiary.
import { TYPES, type TypeId } from '../data/rules';
import { typeIcon } from './battleIcons';
import { el } from './dom';
import { ICONS } from './icons';

/** Round the wheel, in this order: each beats the next and the one three after it (data/rules.ts). */
const RING: TypeId[] = ['predatore', 'abissale', 'glaciale', 'tempesta', 'corazzato'];
const NS = 'http://www.w3.org/2000/svg';
const R = 38; // the circle, % of the box
const NODE = 11; // a type's round, % of the box

const at = (i: number): [number, number] => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / RING.length;
  return [50 + Math.cos(a) * R, 50 + Math.sin(a) * R];
};

export function openTypeWheel(parent: HTMLElement): void {
  const root = el('div', 'sheet type-wheel', parent);
  const panel = el('div', 'bestiary-panel tw-panel', root);
  const head = el('div', 'sheet-head', panel);
  el('h2', '', head, 'Tipi: chi batte chi');
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.addEventListener('click', () => root.remove());
  const body = el('div', 'tw-body', panel);
  const wheel = el('div', 'tw-wheel', body);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.classList.add('tw-arrows');
  const defs = document.createElementNS(NS, 'defs');
  svg.append(defs);
  RING.forEach((t, i) => {
    const color = TYPES[t].color;
    const marker = document.createElementNS(NS, 'marker');
    Object.entries({
      id: `tw-head-${t}`,
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      markerWidth: '5',
      markerHeight: '5',
      orient: 'auto',
    }).forEach(([k, v]) => marker.setAttribute(k, v));
    const tip = document.createElementNS(NS, 'path');
    tip.setAttribute('d', 'M0 0L10 5L0 10z');
    tip.setAttribute('fill', color);
    marker.append(tip);
    defs.append(marker);
    for (const step of [1, 3]) {
      const [x1, y1] = at(i);
      const [x2, y2] = at((i + step) % RING.length);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
      const line = document.createElementNS(NS, 'line');
      Object.entries({
        x1: String(x1 + ux * (NODE + 1)),
        y1: String(y1 + uy * (NODE + 1)),
        x2: String(x2 - ux * (NODE + 2)),
        y2: String(y2 - uy * (NODE + 2)),
        stroke: color,
        'stroke-width': step === 1 ? '1.1' : '0.8',
        'stroke-opacity': step === 1 ? '0.9' : '0.6',
        'marker-end': `url(#tw-head-${t})`,
      }).forEach(([k, v]) => line.setAttribute(k, v));
      svg.append(line);
    }
  });
  wheel.append(svg);
  RING.forEach((t, i) => {
    const [cx, cy] = at(i);
    const node = el('div', 'tw-node', wheel);
    node.style.left = `${cx}%`;
    node.style.top = `${cy}%`;
    node.style.borderColor = TYPES[t].color;
    node.append(typeIcon(t, TYPES[t].color));
    const name = el('span', 'tw-name', node, TYPES[t].name);
    name.style.color = TYPES[t].color;
  });
  const list = el('div', 'tw-list', body);
  for (const t of RING) {
    TYPES[t].beats.forEach((o, k) => {
      const row = el('p', 'tw-row', list);
      const a = el('b', '', row, TYPES[t].name);
      a.style.color = TYPES[t].color;
      row.append(document.createTextNode(' batte '));
      const b = el('b', '', row, TYPES[o].name);
      b.style.color = TYPES[o].color;
      row.append(document.createTextNode(`: ${TYPES[t].beatsWhy[k]}.`));
    });
  }
  el('p', 'tw-note', list, 'Superefficace fa il doppio dei danni; al contrario, la metà.');
}
