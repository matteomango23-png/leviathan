// The ship's wake and its propeller's bubbles (split from shipView.ts in the cleanup of 19 ottobre 2026).
import Phaser from 'phaser';
import { seaHeight, type SeaNow } from '../systems/sea';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { shipHeight } from '../systems/ship/geometry';
import { shipLength, shipPicture } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';

/** Foam at the stern, a wake behind, bubbles behind the propeller. */
export function drawWake(
  g: Phaser.GameObjects.Graphics,
  s: ShipState,
  k: number,
  time: number,
  sea: SeaNow,
): void {
  drawPropBubbles(g, s, time);
  if (k < 0.03) return;
  const L = shipLength(s);
  const stern = s.x - s.face * L * 0.46;
  for (let i = 0; i < 14; i++) {
    const t = (time * (0.8 + k) + i / 14) % 1;
    const wx = stern - s.face * t * (40 + 120 * k);
    g.fillStyle(0xe8f2f4, 0.35 * k * (1 - t));
    g.fillEllipse(
      wx,
      WORLD.surfaceY - seaHeight(wx, time, sea, sea.water) + Math.sin(i * 1.7) * 1.2,
      6 + t * 14,
      1.6 + t * 1.2,
    );
  }
  // (the bow wave is gone, owner 8 ottobre: foam should be the sea itself, not dots over it; for now none)
}

/** Bubbles churned by the propeller, only while it turns (owner, 8 ottobre: not while the ship coasts). */
export function drawPropBubbles(g: Phaser.GameObjects.Graphics, s: ShipState, time: number): void {
  const k = s.prop;
  if (k < 0.03) return;
  const L = shipLength(s);
  const P = shipPicture(s);
  const prop = {
    x: s.x + s.face * (P.propX - 0.5) * L,
    y: WORLD.surfaceY + s.dive + (P.propY - P.waterline) * shipHeight(s),
  };
  const size = Math.max(1, L / SHIP.camera.refLength);
  // a propeller painted above the water (the Krill Hunter's, owner 11 ottobre): no bubbles in the air, but the air it
  // pushes: pale streaks blown back from it, and a little spray where they hit the sea
  if (P.propY < P.waterline - 0.02 && s.dive < 1) {
    const sea = WORLD.surfaceY;
    for (let i = 0; i < 12; i++) {
      const t = (time * (1.6 + k * 2) + i / 12) % 1;
      const len = (14 + 22 * t) * Math.sqrt(size);
      const x0 = prop.x - s.face * t * (40 + 60 * k) * Math.sqrt(size);
      const y0 = prop.y + Math.sin(i * 2.3) * 4 * size + t * 6;
      g.lineStyle(1 + 0.4 * size, 0xe6f2f6, 0.28 * k * (1 - t));
      g.lineBetween(x0, y0, x0 - s.face * len, y0 + Math.sin(time * 9 + i) * 1.5);
    }
    for (let i = 0; i < 8; i++) {
      const t = (time * 1.4 + i / 8) % 1;
      g.fillStyle(0xf2fbff, 0.35 * k * (1 - t));
      g.fillCircle(
        prop.x - s.face * (20 + 50 * t) * Math.sqrt(size),
        sea - t * 6 + Math.sin(i * 1.9) * 2,
        1 + t * 1.5,
      );
    }
    return;
  }
  // a big ship churns much more water (owner, 9 ottobre): more bubbles, bigger, a longer and taller plume
  const n = Math.round(16 + 26 * (size - 1));
  for (let i = 0; i < n; i++) {
    const t = (time * (1.2 + k * 2) + i / n) % 1;
    const spread = Math.sin(i * 2.7) * 3 * size + Math.cos(i * 1.3) * 2 * (size - 1);
    g.lineStyle(0.5 + 0.2 * (size - 1), 0xdff8ff, 0.7 * k * (1 - t));
    g.strokeCircle(
      prop.x - s.face * t * (30 + 50 * k) * Math.sqrt(size),
      prop.y - t * 10 * Math.sqrt(size) + spread,
      (0.7 + t * 1.4) * (0.8 + 0.35 * size) * (0.6 + ((i * 0.37) % 1) * 0.8),
    );
  }
}
