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
