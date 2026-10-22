// The size of the game, and whether the phone is held upright (owner, 21-22 ottobre 2026). The web cannot lock the
// orientation on an iPhone (Can I Use: screen.orientation.lock is not supported on iOS, and the manifest's orientation
// is ignored), and turning the page ourselves made it jump each time iOS turned it first: held upright, the game asks
// to turn the phone (ui/rotateHint.ts). Pure logic: main.ts measures.

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

/** Held upright on a touch screen: the game waits for the phone to be turned. */
export const isUpright = (m: Measures): boolean => m.touch && m.inner.h > m.inner.w;

/**
 * The game's size in CSS pixels. The largest of every size the phone reports (iOS, opened from the Home screen in
 * landscape, can report a page shorter than the screen: owner, 11, 19 and 21 ottobre); from the Home screen, the
 * screen itself, the long side across when the page is wider than tall.
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
  return { w, h };
}
