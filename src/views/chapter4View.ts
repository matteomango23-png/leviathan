// Chapter 4 in the world: the galleon sunk among the kelp, the bronze bell under the Vedova's ship with the rings
// of the Horn's sound spreading through the water, and the Piovra's tentacles rising from the kelp (a shadow and
// shaking kelp first, then the arm itself). Drawn with shapes until painted pieces arrive.
import Phaser from 'phaser';
import { BELL, TENTACLES, WRECK } from '../data/chapter4';
import { WORLD } from '../data/worldLayout';
import { spellBroken } from '../systems/chapter4';
import type { GameState } from '../systems/game';

const ARM = 0x7a3226;
const SUCKER = 0xd8a080;

export class Chapter4View {
  private readonly wreck: Phaser.GameObjects.Graphics;
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.wreck = scene.add.graphics();
    this.g = scene.add.graphics();
    layer.add([this.wreck, this.g]);
    this.drawWreck();
  }

  /** The galleon on its side in the kelp: a dark broken hull, ribs, a fallen mast (drawn once). */
  private drawWreck(): void {
    const w = this.wreck;
    const { x, floorY: f, length: L } = WRECK;
    w.fillStyle(0x1e1610, 1);
    w.fillPoints(
      [
        new Phaser.Math.Vector2(x - L / 2, f - 8),
        new Phaser.Math.Vector2(x - L * 0.38, f - 30),
        new Phaser.Math.Vector2(x + L * 0.3, f - 34),
        new Phaser.Math.Vector2(x + L / 2, f - 18),
        new Phaser.Math.Vector2(x + L * 0.45, f + 4),
        new Phaser.Math.Vector2(x - L * 0.45, f + 4),
      ],
      true,
    );
    w.lineStyle(1.4, 0x3a2a1c, 1);
    for (let i = -5; i <= 4; i++)
      w.lineBetween(x + i * L * 0.08, f - 30 + Math.abs(i) * 1.2, x + i * L * 0.085, f);
    w.lineStyle(2.4, 0x2a1e14, 1);
    w.lineBetween(x - L * 0.1, f - 32, x + L * 0.25, f - 92); // the fallen mast
    w.lineStyle(1, 0x4a3a2a, 0.8);
    w.lineBetween(x + L * 0.25, f - 92, x + L * 0.42, f - 60); // its torn rigging
    w.fillStyle(0x4a3a20, 1).fillRect(x + L * 0.32, f - 34, 10, 6); // the stern gallery
  }

  update(g: GameState, time: number): void {
    const f = this.g.clear();
    const step = g.story.step;
    if (step !== 'chapter3Done' && step !== 'freePiovra') return;
    const c = g.chapter4;
    // the bell under the ship, hanging on a chain, cracked by your hits
    const swing = Math.sin(time * 1.4) * 1.5;
    f.lineStyle(1, 0x3a2e22, 1).lineBetween(BELL.x, WORLD.surfaceY + 4, BELL.x + swing, BELL.y - 8);
    if (c.bellHp > 0) {
      f.fillStyle(0xa8742c, 1).fillTriangle(
        BELL.x + swing - 7,
        BELL.y + 6,
        BELL.x + swing + 7,
        BELL.y + 6,
        BELL.x + swing,
        BELL.y - 9,
      );
      f.fillStyle(0xd8a050, 1).fillEllipse(BELL.x + swing, BELL.y + 6, 15, 3.6);
      f.lineStyle(0.8, 0x2a1a0a, 1);
      for (let i = 0; i < 3 - c.bellHp; i++)
        f.lineBetween(BELL.x + swing - 2 + i * 2, BELL.y - 6, BELL.x + swing + i * 3, BELL.y + 4);
      // the Horn's sound: rings spreading through the water
      for (let k = 0; k < 3; k++) {
        const t = (time / BELL.ringEvery + k / 3) % 1;
        f.lineStyle(1.2, 0xe8c070, 0.35 * (1 - t));
        f.strokeCircle(BELL.x + swing, BELL.y, 10 + t * 140);
      }
    } else {
      // only the broken rim is left
      f.lineStyle(1.4, 0x7a5420, 1).lineBetween(
        BELL.x + swing - 5,
        BELL.y - 4,
        BELL.x + swing + 4,
        BELL.y - 1,
      );
    }
    if (step !== 'freePiovra' || spellBroken(g)) return;
    c.tentacles.forEach((t, i) => {
      const base = WRECK.floorY;
      if (t.stage === 'warn') {
        // a shadow on the floor and the kelp shaking: something is coming
        f.fillStyle(0x000000, 0.35).fillEllipse(t.x, base - 2, 26, 6);
        for (let k = 0; k < 4; k++) {
          const bx = t.x - 9 + k * 6 + Math.sin(time * 20 + k) * 2;
          f.lineStyle(0.6, 0xdff8ff, 0.5).strokeCircle(bx, base - 8 - ((time * 30 + k * 7) % 24), 0.8);
        }
        return;
      }
      if (t.stage !== 'up' && c.grab?.i !== i) return;
      // the arm: a thick curve up from the floor, swaying, with pale suckers
      const H = TENTACLES.height;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        pts.push([t.x + Math.sin(time * 2.4 + u * 3 + i) * 8 * u, base - u * H]);
      }
      for (let k = 0; k < 12; k++) {
        const [x0, y0] = pts[k]!;
        const [x1, y1] = pts[k + 1]!;
        f.lineStyle(7 - k * 0.45, ARM, 1).lineBetween(x0, y0, x1, y1);
        if (k % 2 === 0) f.fillStyle(SUCKER, 0.9).fillCircle(x0 + 2.2, y0, 1.1);
      }
    });
  }
}
