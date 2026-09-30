// Sanctuaries: an old stone arch with a glowing sigil. The active one (respawn point) glows brighter.
import Phaser from 'phaser';
import type { SanctuaryState } from '../systems/sanctuary';
import { TEX } from './textures';

export class SanctuaryView {
  private readonly stones: Phaser.GameObjects.Graphics;
  private readonly glows: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, s: SanctuaryState) {
    this.stones = scene.add.graphics();
    this.glows = s.list.map(() =>
      scene.add.image(0, 0, TEX.dot).setBlendMode(Phaser.BlendModes.ADD).setTint(0x5ff3d6),
    );
    layer.add([this.stones, ...this.glows]);
    const g = this.stones;
    for (const p of s.list) {
      const x = p.x;
      const y = p.y + 14; // floor
      g.fillStyle(0x2b2f2c, 1);
      g.fillRect(x - 16, y - 4, 32, 5);
      g.fillRect(x - 12, y - 8, 24, 4);
      g.fillStyle(0x3a3f3a, 1);
      g.fillRect(x - 14, y - 27, 5, 19);
      g.fillRect(x + 9, y - 27, 5, 19);
      g.fillStyle(0x4d4a3c, 1);
      g.fillRect(x - 17, y - 30, 34, 3.5);
      g.fillStyle(0x3f8f86, 1);
      g.fillRect(x - 1, y - 21, 2, 7);
      g.fillRect(x - 3.5, y - 19, 7, 2);
    }
  }

  update(s: SanctuaryState, time: number): void {
    s.list.forEach((p, i) => {
      const active = s.current === i;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i);
      const healing = s.healing && s.inside === i;
      this.glows[i]!.setPosition(p.x, p.y - 3)
        .setScale((active ? 2.4 : 1.6) + (healing ? pulse : 0))
        .setAlpha((active ? 0.55 : 0.3) + pulse * 0.15 + (healing ? 0.3 : 0));
    });
  }
}
