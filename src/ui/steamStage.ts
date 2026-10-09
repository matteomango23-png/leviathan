// Helpers of the steam cockpit (data/cockpitSteam.ts): put an element exactly on a painted spot of the picture, or
// paint on it a crop of one of the pictures (a lit tab, the brass plate, a part of a panel).
import { assetUrl } from '../data/assets';
import { STEAM_ART, type Rect } from '../data/cockpitSteam';

/**
 * Places `el` on `r` (percent of the picture). `within`: the rectangle of the picture its parent covers (a window
 * that shows only part of the picture), so the place is converted to the parent's own percent.
 */
export function place(el: HTMLElement, r: Rect, within: Rect = [0, 0, 100, 100]): HTMLElement {
  const [x0, y0, x1, y1] = within;
  const w = x1 - x0;
  const h = y1 - y0;
  Object.assign(el.style, {
    position: 'absolute',
    left: `${((r[0] - x0) / w) * 100}%`,
    top: `${((r[1] - y0) / h) * 100}%`,
    width: `${((r[2] - r[0]) / w) * 100}%`,
    height: `${((r[3] - r[1]) / h) * 100}%`,
  });
  return el;
}

/** Shows on `el` (as big as `r` on screen) that part `r` of a picture. */
export function crop(el: HTMLElement, art: keyof typeof STEAM_ART, r: Rect): HTMLElement {
  const src = STEAM_ART[art];
  if (typeof src !== 'string') return el;
  const w = r[2] - r[0];
  const h = r[3] - r[1];
  const pos = (start: number, size: number): string =>
    size >= 100 ? '0%' : `${(start / (100 - size)) * 100}%`;
  Object.assign(el.style, {
    backgroundImage: `url("${assetUrl(src)}")`,
    backgroundSize: `${(100 / w) * 100}% ${(100 / h) * 100}%`,
    backgroundPosition: `${pos(r[0], w)} ${pos(r[1], h)}`,
    backgroundRepeat: 'no-repeat',
  });
  return el;
}

/** The height a part of the picture takes, as a share of a window's height (for stacked parts in a window). */
export const heightIn = (part: Rect, window: Rect): string =>
  `${((part[3] - part[1]) / (window[3] - window[1])) * 100}%`;
