// Your boat on the surface (tappa 12): a dark wooden hull with a mast and a lantern, bobbing on the waves; you sit
// in it when aboard; while fishing, a line goes down to a float that dips when a fish bites. Drawn with shapes
// until a painted boat arrives.
import Phaser from 'phaser';
import { BOAT } from '../data/boat';
import { WORLD } from '../data/worldLayout';
import type { BoatState } from '../systems/boat';

export class BoatView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(b: BoatState, face: 1 | -1, time: number): void {
    const g = this.g.clear();
    if (!b.owned) return;
    const s = WORLD.surfaceY + Math.sin(time * 1.6) * BOAT.bob;
    const tilt = Math.sin(time * 1.1) * 0.6; // units the bow rises over the stern
    const L = BOAT.length / 2;
    const x = b.x;
    const f = b.aboard ? face : 1;
    // hull: a long dark wedge, the bow higher
    g.fillStyle(0x23180f, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x - L * f, s - 4 - tilt),
        new Phaser.Math.Vector2(x + L * f, s - 6 + tilt),
        new Phaser.Math.Vector2(x + (L - 7) * f, s + 4),
        new Phaser.Math.Vector2(x - (L - 5) * f, s + 3),
      ],
      true,
    );
    g.fillStyle(0x4a3220, 1);
    g.fillRect(x - L + 2, s - 6, BOAT.length - 4, 2); // the gunwale
    // mast, furled sail and a lantern
    g.fillStyle(0x1a120b, 1);
    g.fillRect(x - 0.7, s - 30, 1.4, 25);
    g.fillStyle(0x6e6250, 0.9);
    g.fillRect(x - 0.5 * f, s - 28, 9 * f, 2.5);
    g.fillStyle(0xffd28a, 0.95);
    g.fillCircle(x + (L - 4) * f, s - 9, 1.6);
    g.fillStyle(0xffd28a, 0.18);
    g.fillCircle(x + (L - 4) * f, s - 9, 6);
    // you, sitting aboard
    if (b.aboard) {
      g.fillStyle(0x1c2a30, 1);
      g.fillRoundedRect(x - 6 * f - 2.5, s - 13, 5, 7, 1.5);
      g.fillStyle(0xd9b38c, 1);
      g.fillCircle(x - 6 * f, s - 15, 2);
    }
    // the fishing line and its float
    if (b.aboard && b.fishing) {
      const rodX = x - 6 * f + 12 * f;
      const floatX = rodX + 18 * f;
      const dip = b.fishing.bite ? 3 + Math.sin(time * 18) * 1.5 : Math.sin(time * 2) * 0.6;
      g.lineStyle(0.6, 0x2b1d12, 1);
      g.lineBetween(x - 6 * f, s - 12, rodX, s - 22); // the rod
      g.lineStyle(0.3, 0xd9e6e8, 0.7);
      g.lineBetween(rodX, s - 22, floatX, s + dip);
      g.lineBetween(floatX, s + dip, floatX, WORLD.surfaceY + BOAT.fishing.line);
      g.fillStyle(b.fishing.bite ? 0xff5a3c : 0xf2efe6, 1);
      g.fillCircle(floatX, s + dip, 1.4);
    }
  }
}
