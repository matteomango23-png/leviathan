// Your submarine (tappa 16): the owner's painting, facing where it goes, rocking gently; its portholes glow when
// you are inside; bubbles from the propeller when it moves.
import Phaser from 'phaser';
import { SUBMARINE } from '../data/submarine';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { subModel, type SubState } from '../systems/submarine';

export class SubmarineView {
  private readonly img: Phaser.GameObjects.Image;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.img = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.g = scene.add.graphics();
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([this.img, this.g, this.glow]);
  }

  update(s: SubState, time: number): void {
    const g = this.g.clear();
    this.glow.clear();
    if (!s.owned) {
      this.img.setVisible(false);
      return;
    }
    const L = SUBMARINE.length;
    const rock = Math.sin(time * 1.3) * 0.02;
    const y = s.y + Math.sin(time * 1.1) * 0.8;
    const art = subModel(s.model).art;
    if (WORLD_ART_KEYS.includes(art)) {
      const key = `world-${art}`;
      if (this.img.texture.key !== key) this.img.setTexture(key);
      const sc = L / this.img.width;
      this.img
        .setVisible(true)
        .setPosition(s.x, y)
        .setRotation(rock)
        .setScale(sc * s.face, sc);
    } else {
      // no picture: a dark hull with a tower
      this.img.setVisible(false);
      g.fillStyle(0x23262a, 1).fillEllipse(s.x, y, L, L * 0.34);
      g.fillRect(s.x - L * 0.08, y - L * 0.3, L * 0.18, L * 0.16);
    }
    // portholes lit while you are inside
    if (s.aboard) {
      this.glow.fillStyle(0xffc86a, 0.25 + 0.08 * Math.sin(time * 3));
      // the two portholes on the tower of the picture
      this.glow.fillCircle(s.x + s.face * L * 0.13, y - L * 0.17, 1.6);
      this.glow.fillCircle(s.x + s.face * L * 0.21, y - L * 0.17, 1.6);
    }
    // bubbles behind the propeller when it moves
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > 8)
      for (let i = 0; i < 6; i++) {
        const t = (time * 2 + i / 6) % 1;
        g.lineStyle(0.5, 0xdff8ff, 0.6 * (1 - t));
        g.strokeCircle(s.x - s.face * (L * 0.5 + t * 14), y - t * 6 + Math.sin(i * 2.1) * 2, 0.8 + t);
      }
  }
}
