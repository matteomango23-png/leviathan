// The size of the game and which way it is turned (owner, 21 ottobre 2026: the black band at the bottom opening the
// app in landscape, and "se giri il telefono non va in verticale"). The web cannot lock the orientation on an iPhone,
// so held upright the whole page is turned a quarter round (style.css html.turned) and the game is played sideways
// all the same; the controls are page elements, the browser turns them with it. Pure logic: main.ts measures.

export interface Size {
  w: number;
  h: number;
}

export interface Measures {
  inner: Size;
  /** The visual viewport and the document's own size, when the browser gives them. */
  visual?: Size;
  client?: Size;
  /** The screen (an iPhone reports it upright) and whether the game runs from the Home screen. */
  screen?: Size;
  standalone: boolean;
  /** A touch screen (a phone or a tablet), not a mouse. */
  touch: boolean;
}

/** Held upright on a touch screen: the page is turned and the game laid out sideways. */
export const isTurned = (m: Measures): boolean => m.touch && m.inner.h > m.inner.w;

/**
 * The game's size in CSS pixels, landscape. The largest of every size the phone reports (iOS, opened from the Home
 * screen in landscape, can report a page shorter than the screen and never correct it: owner, 11, 19 and 21 ottobre);
 * from the Home screen, the screen itself. Turned, width and height swap.
 */
export function gameSize(m: Measures): Size {
  let w = Math.max(m.inner.w, m.visual?.w ?? 0, m.client?.w ?? 0) || 1280;
  let h = Math.max(m.inner.h, m.visual?.h ?? 0, m.client?.h ?? 0) || 720;
  const s = m.screen;
  if (m.standalone && s && s.w > 0 && s.h > 0) {
    const long = Math.max(s.w, s.h);
    const short = Math.min(s.w, s.h);
    if (w > h) [w, h] = [Math.max(w, long), Math.max(h, short)];
    else [w, h] = [Math.max(w, short), Math.max(h, long)];
  }
  return isTurned(m) ? { w: h, h: w } : { w, h };
}

/** Turned a quarter round clockwise, the page's edges are the phone's: its left is the phone's top, and so on. Which
 *  of the phone's safe-area insets each of the game's sides takes. */
export function safeSides(
  turned: boolean,
): Record<'t' | 'r' | 'b' | 'l', 'top' | 'right' | 'bottom' | 'left'> {
  return turned
    ? { t: 'right', r: 'bottom', b: 'left', l: 'top' }
    : { t: 'top', r: 'right', b: 'bottom', l: 'left' };
}
