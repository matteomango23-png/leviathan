// Air bubbles rising from a vent (the endless sea's, a temple's): soft round bubbles with a bright rim light, a
// little wobble, growing as they rise and fading near the top (owner, 24 ottobre: the drawn rings "sono fatti
// malissimo"). Drawn into a Graphics each frame.
import type Phaser from 'phaser';
import { hash2 } from '../systems/math';

/** A column of `count` bubbles from (x, y) up `height` units, spread over `spread` units. */
export function drawBubbles(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  height: number,
  spread: number,
  count: number,
  time: number,
  seed: number,
): void {
  for (let i = 0; i < count; i++) {
    const speed = 24 + hash2(i, seed) * 22;
    const rise = (time * speed + hash2(i * 7, seed) * height) % height;
    const wobble = Math.sin(time * 2.3 + i * 1.7) * (1.5 + rise * 0.03);
    const r = 0.7 + hash2(i * 3, seed * 5) * 1.4 + rise * 0.004;
    const fade = (1 - rise / height) * Math.min(1, rise / 6); // they appear at the vent, not out of nothing
    const bx = x + (hash2(i, seed * 3) - 0.5) * spread + wobble;
    const by = y - rise;
    g.fillStyle(0xbfeaff, 0.18 * fade).fillCircle(bx, by, r);
    g.fillStyle(0xffffff, 0.75 * fade).fillCircle(bx - r * 0.35, by - r * 0.35, r * 0.32);
  }
}
