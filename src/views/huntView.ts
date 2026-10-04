// The traces by the dens of the hunts (systems/hunts.ts), once their echo is found: a big carcass of bones on the
// floor and a slow haze of blood in the water. Look only.
import Phaser from 'phaser';
import { HUNTS } from '../data/hunts';
import type { GameState } from '../systems/game';
import { huntOpen } from '../systems/hunts';

export class HuntView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly floors = new Map<string, number>();

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(game: GameState, view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    HUNTS.forEach((h, i) => {
      const den = game.dens[i]!;
      if (!game.hunts[h.id]?.echo || !huntOpen(h, game.beasts.gone, game.beasts.team)) return;
      if (den.x < view.left - 200 || den.x > view.right + 200) return;
      let floor = this.floors.get(h.id);
      if (floor === undefined) {
        floor = game.map.floorBelow(den.x - 60, den.y);
        this.floors.set(h.id, floor);
      }
      // a carcass: a spine and ribs lying on the floor
      const x = den.x - 60;
      const y = floor - 2;
      g.lineStyle(1.6, 0xcfc6b0, 0.85);
      g.lineBetween(x - 34, y - 3, x + 34, y - 5);
      for (let k = -28; k <= 26; k += 7) {
        const h0 = 9 + Math.sin(k * 0.3) * 3;
        g.beginPath();
        g.arc(x + k, y - 3, h0, Math.PI * 1.05, Math.PI * 1.9);
        g.strokePath();
      }
      g.fillStyle(0xcfc6b0, 0.85).fillEllipse(x + 38, y - 6, 12, 8); // the skull
      // a haze of blood drifting up by the den
      for (let k = 0; k < 10; k++) {
        const t = (time * 0.08 + k / 10) % 1;
        g.fillStyle(0x6e0f12, 0.22 * (1 - t));
        g.fillCircle(den.x + Math.sin(k * 2.3 + time * 0.3) * 30, den.y + 20 - t * 70, 5 + t * 10);
      }
    });
  }
}
