// Tiny helper to build DOM elements for the interface.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  parent?: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

export const isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/** The screen's bottom safe area in CSS pixels (the iPhone's home bar), read with a probe. */
export function safeBottomPx(): number {
  const probe = el('div', '', document.body);
  probe.style.cssText = 'position:fixed;visibility:hidden;height:env(safe-area-inset-bottom, 0px)';
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}
