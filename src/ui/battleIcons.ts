// Icons of the battle commands and of the types: the painted ones (public/ui/<name>.webp, white shapes the
// game colours) when they exist, otherwise these drawn ones (24×24, filled, currentColor).
import type { MoveTypeId } from '../data/rules';
import { UI_ICON_KEYS } from '../data/sprites.generated';
import { el } from './dom';

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}</svg>`;

const DRAWN: Record<string, string> = {
  // commands
  icona_lotta: svg(
    '<path d="M5 3.5c3.5 4 6.5 9 7.5 16.5l-2 .5C9.7 14 7.4 9 4 5z"/><path d="M10 2.5c3.4 4.3 5.8 9.4 6.4 16.8l-2 .3c-.6-6.6-2.7-11.6-6-15.8z"/><path d="M15.4 2c3 4.4 4.9 9.5 5.1 16.5l-2 .1c-.3-6.5-1.9-11.3-4.6-15.4z"/>',
  ),
  icona_zaino: svg(
    '<path d="M9 3h6a1 1 0 0 1 1 1v2h1.5A3.5 3.5 0 0 1 21 9.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5A3.5 3.5 0 0 1 6.5 6H8V4a1 1 0 0 1 1-1zm1 3h4V5h-4zM7 12v2h10v-2z"/>',
  ),
  icona_squadra: svg(
    '<path d="M3 19c1.5-4 2.5-9 2-14 2.8 3.6 4.5 8.4 4.6 14z"/><path d="M9.2 19c1.3-4.7 2.2-10 1.6-15.5 3.3 4.2 5 9.5 5 15.5z"/><path d="M15.6 19c1.3-3.8 2.2-8 1.8-12.5 2.6 3.4 3.8 7.7 3.6 12.5z"/>',
  ),
  icona_doma:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M12 12a1.6 1.6 0 0 1 1.6 1.6 3.2 3.2 0 0 1-3.2 3.2 4.8 4.8 0 0 1-4.8-4.8 6.4 6.4 0 0 1 6.4-6.4 8 8 0 0 1 8 8"/></svg>',
  icona_fuggi: svg(
    '<path d="M13 4.5 21 12l-8 7.5V15H8v-6h5z"/><rect x="2" y="9" width="2.5" height="6" rx="1"/><rect x="5" y="9" width="2" height="6" rx="1"/>',
  ),
  // types
  tipo_predatore: svg(
    '<path d="M5 3c2.3-1 4.6.6 7 .6S16.7 2 19 3c2.2 1.1 1.6 5.2 0 8-1.1 2-1.1 6.4-2.4 9.2-.7 1.4-2.2.9-2.4-.6L13.2 16h-2.4l-1 3.6c-.2 1.5-1.7 2-2.4.6C6.1 17.4 6.1 13 5 11 3.4 8.2 2.8 4.1 5 3z"/>',
  ),
  tipo_abissale: svg(
    '<circle cx="17" cy="6" r="3.6"/><path d="M4 21c0-9 3.5-14.4 10.6-15.2l.3 2.1C9.2 8.6 6.4 13 6.4 21z"/>',
  ),
  tipo_glaciale: svg(
    '<path d="M11 1.5h2v21h-2z"/><path d="m2.5 6.9 1-1.7 18 10.5-1 1.7z"/><path d="m3.5 18.8-1-1.7 18-10.5 1 1.7z"/><path d="m8.5 3 3.5 3 3.5-3 1 1.3L12 8.4 7.5 4.3zM8.5 21l3.5-3 3.5 3 1-1.3-4.5-4.1-4.5 4.1z"/>',
  ),
  tipo_tempesta: svg('<path d="M14 1.5 4.5 13.5h6.2L9.5 22.5 19.5 10h-6.3z"/>'),
  tipo_corazzato: svg(
    '<path d="M12 2 20.5 7v10L12 22l-8.5-5V7z" opacity=".35"/><path d="M12 6.5 16.5 9v5.5L12 17l-4.5-2.5V9z"/><path d="M12 2 20.5 7v10L12 22l-8.5-5V7zm0 2.3L5.5 8.2v7.6L12 19.7l6.5-3.9V8.2z"/>',
  ),
  tipo_variabile: svg('<circle cx="12" cy="12" r="9" opacity=".35"/><circle cx="12" cy="12" r="4.5"/>'),
};

/** An icon (`icona_lotta`, `tipo_tempesta`…) as an element coloured with `color`. */
export function battleIcon(name: string, color = 'currentColor'): HTMLSpanElement {
  const span = el('span', 'bicon');
  span.style.color = color;
  if (UI_ICON_KEYS.includes(name)) {
    const painted = el('span', 'bicon-painted', span);
    painted.style.maskImage = `url(ui/${name}.webp)`;
    painted.style.webkitMaskImage = `url(ui/${name}.webp)`;
  } else span.innerHTML = DRAWN[name] ?? '';
  return span;
}

export const typeIcon = (type: MoveTypeId, color?: string): HTMLSpanElement =>
  battleIcon(`tipo_${type}`, color);
