// The Delta delle Mangrovie: muddy islands above the water with mangrove trees, and their roots arching
// down into the murky water. Drawn once (it never changes).
import Phaser from 'phaser';
import { DELTA, WORLD } from '../data/worldLayout';
import { makeRng } from '../systems/math';
import { landHeight } from '../systems/world/worldGen';

const S = WORLD.surfaceY;

function drawIsland(
  back: Phaser.GameObjects.Graphics,
  front: Phaser.GameObjects.Graphics,
  x0: number,
  x1: number,
): void {
  const rng = makeRng(x0);
  // the mud mound
  back.fillStyle(0x1a1710, 1);
  back.beginPath();
  back.moveTo(x0 - 4, S + 1);
  for (let x = x0 - 4; x <= x1 + 4; x += 3) back.lineTo(x, S + 1 - landHeight(x));
  back.lineTo(x1 + 4, S + 1);
  back.closePath();
  back.fillPath();
  // mangrove trees: thin trunks and a dark, wide canopy
  const trees = Math.max(2, Math.round((x1 - x0) / 22));
  for (let i = 0; i < trees; i++) {
    const tx = x0 + ((i + 0.5) / trees) * (x1 - x0) + (rng() - 0.5) * 8;
    const ground = S + 1 - landHeight(tx);
    const h = 18 + rng() * 14;
    back.lineStyle(1.6, 0x14120d, 1);
    back.lineBetween(tx, ground, tx + (rng() - 0.5) * 4, ground - h);
    back.fillStyle(0x0f1a12, 1);
    for (let k = 0; k < 4; k++)
      back.fillEllipse(tx + (rng() - 0.5) * 16, ground - h - rng() * 6, 16 + rng() * 10, 7 + rng() * 5);
    // roots: arches from the trunk down into the water, in front of the diver's layer
    front.lineStyle(1.2, 0x1c1911, 0.95);
    for (let k = 0; k < 5; k++) {
      const dir = k % 2 ? 1 : -1;
      const reach = 6 + rng() * 14;
      const deep = 10 + rng() * 22;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(tx, ground - h * 0.3),
        new Phaser.Math.Vector2(tx + dir * reach * 1.3, ground - 4),
        new Phaser.Math.Vector2(tx + dir * reach, S + deep),
      );
      curve.draw(front, 12);
    }
  }
}

export class DeltaView {
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, front: Phaser.GameObjects.Layer) {
    const back = scene.add.graphics();
    const roots = scene.add.graphics();
    for (const [x0, x1] of DELTA.islands) drawIsland(back, roots, x0, x1);
    layer.add(back);
    front.add(roots);
  }
}
