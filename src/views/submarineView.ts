// Your submarine (tappa 16): the owner's painting, facing where it goes, rocking gently (its light is the lamp cone);
// bubbles from the propeller when it moves. When the hull takes a blow a bar over it shows what is
// left for a few seconds, then fades; badly damaged it trails dark smoke.
import Phaser from 'phaser';
import { SUBMARINE } from '../data/submarine';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { subLength, subModel, type SubState } from '../systems/submarine';

export class SubmarineView {
  private readonly img: Phaser.GameObjects.Image;
  /** The propeller turning (its model's `moving` picture, same box), over the still one while it moves. */
  private readonly turning: Phaser.GameObjects.Image;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private lastHull = NaN;
  private barLeft = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.img = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.turning = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.g = scene.add.graphics();
    this.bar = scene.add.graphics();
    layer.add([this.img, this.turning, this.g, this.bar]);
  }

  /** @param hidden in the ship's hold behind the closed hatch */
  update(s: SubState, time: number, dt: number, hidden = false): void {
    const g = this.g.clear();
    this.bar.clear();
    this.turning.setVisible(false);
    if (!s.owned || hidden) {
      this.img.setVisible(false);
      return;
    }
    const L = subLength(s);
    const rock = Math.sin(time * 1.3) * 0.02;
    const y = s.y + Math.sin(time * 1.1) * 0.8;
    const { art, moving } = subModel(s.model);
    const speed = Math.hypot(s.vx, s.vy);
    if (WORLD_ART_KEYS.includes(art)) {
      const key = `world-${art}`;
      if (this.img.texture.key !== key) this.img.setTexture(key);
      const sc = L / this.img.width;
      this.img
        .setVisible(true)
        .setPosition(s.x, y)
        .setRotation(rock)
        .setScale(sc * s.face, sc);
      if (moving && WORLD_ART_KEYS.includes(moving)) {
        const key2 = `world-${moving}`;
        if (this.turning.texture.key !== key2) this.turning.setTexture(key2);
        const run = Math.min(1, Math.max(0, (speed - 8) / 30));
        this.turning
          .setVisible(run > 0.01)
          .setAlpha(run)
          .setPosition(s.x, y)
          .setRotation(rock)
          .setScale((L / this.turning.width) * s.face, L / this.turning.width);
      }
    } else {
      // no picture: a dark hull with a tower
      this.img.setVisible(false);
      g.fillStyle(0x23262a, 1).fillEllipse(s.x, y, L, L * 0.34);
      g.fillRect(s.x - L * 0.08, y - L * 0.3, L * 0.18, L * 0.16);
    }
    // (the lit portholes drawn over the picture are gone, owner 8 ottobre: they did not match the new submarines;
    // its lamp cone is the light)
    // bubbles behind the propeller when it moves
    if (speed > 8)
      for (let i = 0; i < 6; i++) {
        const t = (time * 2 + i / 6) % 1;
        g.lineStyle(0.5, 0xdff8ff, 0.6 * (1 - t));
        g.strokeCircle(s.x - s.face * (L * 0.5 + t * 14), y - t * 6 + Math.sin(i * 2.1) * 2, 0.8 + t);
      }
    this.drawDamage(s, y, time, dt);
  }

  /** The hull bar after a blow (then it fades), and dark smoke when little is left. */
  private drawDamage(s: SubState, y: number, time: number, dt: number): void {
    const L = subLength(s);
    const max = subModel(s.model).hull;
    if (s.hull < this.lastHull) this.barLeft = SUBMARINE.hullBarSeconds;
    this.lastHull = s.hull;
    this.barLeft = Math.max(0, this.barLeft - dt);
    const share = Phaser.Math.Clamp(s.hull / max, 0, 1);
    if (this.barLeft > 0) {
      const a = Math.min(1, this.barLeft / 0.6);
      const w = L * 0.7;
      const top = y - L * 0.36;
      const col = share > 0.5 ? 0x5fd38a : share > 0.25 ? 0xe8c64a : 0xe2553f;
      this.bar.fillStyle(0x000000, 0.55 * a).fillRect(s.x - w / 2 - 0.6, top - 0.6, w + 1.2, 3.2);
      this.bar.fillStyle(col, a).fillRect(s.x - w / 2, top, w * share, 2);
    }
    if (share < SUBMARINE.smokeBelow) {
      const g = this.g;
      for (let i = 0; i < 7; i++) {
        const t = (time * 0.5 + i / 7) % 1;
        const x = s.x - s.face * L * 0.05 + Math.sin(time * 1.7 + i * 2.3) * 2 * t;
        g.fillStyle(0x1c1d1f, 0.45 * (1 - t));
        g.fillCircle(x, y - L * 0.25 - t * 22, 1.6 + t * 3.2);
      }
    }
  }
}
