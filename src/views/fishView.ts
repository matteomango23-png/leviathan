// Small, realistic silver fish: body + wagging tail, glinting as they turn.
import Phaser from 'phaser';
import { SARDINE } from '../data/diver';
import type { FishState } from '../systems/fish';
import { SARDINE_TEX, TEX } from './textures';

interface FishSprite {
  body: Phaser.GameObjects.Image;
  tail: Phaser.GameObjects.Image;
  angle: number;
}

export class FishView {
  private readonly sprites: FishSprite[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, state: FishState) {
    const scale = SARDINE.lengthUnits / SARDINE_TEX.w;
    for (let i = 0; i < state.fish.length; i++) {
      const tail = scene.add.image(0, 0, TEX.sardineTail).setOrigin(1, 0.5).setScale(scale);
      const body = scene.add.image(0, 0, TEX.sardine).setScale(scale);
      layer.add([tail, body]);
      this.sprites.push({ body, tail, angle: 0 });
    }
  }

  update(state: FishState, view: Phaser.Geom.Rectangle, time: number, dt: number): void {
    const scale = SARDINE.lengthUnits / SARDINE_TEX.w;
    for (let i = 0; i < state.fish.length; i++) {
      const f = state.fish[i]!;
      const s = this.sprites[i]!;
      const on =
        (f.alive || f.hooked) &&
        f.x > view.x - 10 &&
        f.x < view.right + 10 &&
        f.y > view.y - 10 &&
        f.y < view.bottom + 10;
      s.body.setVisible(on);
      s.tail.setVisible(on);
      if (!on) continue;
      const speed = Math.hypot(f.vx, f.vy);
      if (speed > 2 && !f.hooked) {
        const want = Math.atan2(f.vy, f.vx);
        let da = want - s.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        s.angle += da * Math.min(1, dt * 8);
      }
      const flip = Math.cos(s.angle) < 0;
      const wag =
        Math.sin(time * (10 + speed * 0.3) + f.phase) * 0.45 + (f.hooked ? Math.sin(time * 30) * 0.5 : 0);
      const glint = 0.5 + 0.5 * Math.sin(s.angle * 2 + time * 3 + f.phase);
      const shade = Math.round(170 + 85 * glint);
      s.body
        .setPosition(f.x, f.y)
        .setRotation(s.angle)
        .setScale(scale, flip ? -scale : scale)
        .setTint(Phaser.Display.Color.GetColor(shade, Math.min(255, shade + 8), Math.min(255, shade + 14)));
      const back = SARDINE.lengthUnits * 0.44;
      s.tail
        .setPosition(f.x - Math.cos(s.angle) * back, f.y - Math.sin(s.angle) * back)
        .setRotation(s.angle + wag * (flip ? -1 : 1))
        .setScale(scale, flip ? -scale : scale);
    }
  }
}
