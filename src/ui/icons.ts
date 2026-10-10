// Small line icons drawn for the game (24×24, currentColor). No external assets.

const svg = (body: string): string =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  tooth: svg(
    '<path d="M6 4c2-1.5 4 .5 6 .5S16 2.5 18 4c2 1.6 1.2 5-.3 7.5-1 1.8-1 6-2.2 8.5-.6 1.2-1.9.8-2.1-.6L12.6 16h-1.2l-.8 3.4c-.2 1.4-1.5 1.8-2.1.6-1.2-2.5-1.2-6.7-2.2-8.5C4.8 9 4 5.6 6 4z"/>',
  ),
  fish: svg(
    '<path d="M3 12c3-4 8-5.5 12-3.5l4-2.5v12l-4-2.5C11 17.5 6 16 3 12z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/>',
  ),
  suit: svg(
    '<circle cx="12" cy="9" r="6"/><rect x="9" y="6.5" width="6" height="4.5" rx="2"/><path d="M6.5 15.5 5 21h14l-1.5-5.5"/>',
  ),
  backpack: svg(
    '<path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><rect x="5" y="6" width="14" height="15" rx="3"/><path d="M9 12h6M9 16h6"/>',
  ),
  scroll: svg(
    '<path d="M7 4h11a2 2 0 0 1 0 4H9"/><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M9 12h7M9 16h5"/>',
  ),
  pen: svg('<path d="M4 20V8l4-3 4 3 4-3 4 3v12"/><path d="M4 12h16M4 16h16"/>'),
  coins: svg(
    '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M10 15.5c.8 1 2.7 1.5 5 1.5 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5"/>',
  ),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  heart: svg('<path d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.7 12 20 12 20z"/>'),
  shield: svg('<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/>'),
  bolt: svg('<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>'),
  dive: svg('<path d="M3 7c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M12 10v10M8 16l4 4 4-4"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'),
  star: svg(
    '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
  ),
  bubble: svg(
    '<circle cx="12" cy="13" r="7"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="18" cy="5" r="2"/>',
  ),
  leaf: svg('<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 13 11"/>'),
  shrimp: svg(
    '<path d="M18 6c-6 0-11 3-11 8 0 3 2 5 5 5"/><path d="M18 6c1 3 0 6-3 8M12 19l-2 2M9 17l-3 1M16 9l3-3"/>',
  ),
  hook: svg(
    '<path d="M12 3v10a4 4 0 1 1-8 0v-1"/><path d="m4 12 2-2"/><circle cx="12" cy="3" r="1" fill="currentColor"/>',
  ),
  trident: svg('<path d="M12 21V6M6 3v5a6 6 0 0 0 12 0V3M12 3v3"/>'),
  darts: svg('<path d="M4 20 16 8M8 20l10-12M4 16 14 6"/><path d="M16 8h3V5M18 8h2M14 6V3"/>'),
  net: svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4v16M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  school: svg(
    '<path d="M3 8c1.5-2 4-2.5 6-1.5L11 5v6L9 9.5C7 10.5 4.5 10 3 8zM11 16c1.5-2 4-2.5 6-1.5l2-1.5v6l-2-1.5c-2 1-4.5.5-6-1.5z"/>',
  ),
  lamp: svg(
    '<path d="M9 3h6l-1 5h-4z"/><path d="M10 8v3a2 2 0 0 0 4 0V8"/><path d="M6 15l-2 3M18 15l2 3M12 16v4"/>',
  ),
  paw: svg(
    '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 1.8-5 4-5s4 2 4 5c0 1.6-1.6 2.5-4 2.5s-4-.9-4-2.5z"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  radar: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 18 6"/>'),
};

export type IconName = keyof typeof ICONS;

/** An element with an icon. */
export function icon(name: IconName): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'ico-wrap';
  s.innerHTML = ICONS[name];
  return s;
}

/** Icon for a shop entry / backpack slot id. */
export function iconFor(id: string): IconName {
  const map: Record<string, IconName> = {
    bolla_aria: 'bubble',
    alga_curativa: 'leaf',
    krill_dorato: 'shrimp',
    esca: 'hook',
    esca_sangue: 'hook',
    esca_gamberi: 'shrimp',
    esca_viva: 'hook',
    conchiglia: 'star',
    arpione_mitico: 'trident',
    fiocine: 'darts',
    rete: 'net',
    folgore: 'bolt',
    runico: 'trident',
    sciame_sardine: 'school',
    apnea: 'bubble',
    lampada_1: 'lamp',
    lampada_2: 'lamp',
    lampo_sonar: 'bolt',
    controcorrente: 'dive',
  };
  return map[id] ?? 'star';
}
