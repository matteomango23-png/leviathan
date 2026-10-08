// Places of the old story kept as scenery (data/scenery.ts): the red corals on the terraces of the amphitheatre
// and the galleon sunk among the kelp. Drawn once with shapes until painted pieces arrive.
import Phaser from 'phaser';
import { ARENA, WRECK } from '../data/scenery';
import { hash2 } from '../systems/math';
import { arenaFloor } from '../systems/world/arena';

const CORAL_COLORS = [0xa3263a, 0xc8484a, 0x8a2a4a, 0xd06a50];

export class SceneryView {
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const g = scene.add.graphics();
    layer.add(g);
    drawCorals(g);
    drawWreck(g);
  }
}

/** Red coral fans and branches along the terraces of the amphitheatre. */
function drawCorals(c: Phaser.GameObjects.Graphics): void {
  for (let i = 0; i < 46; i++) {
    const x = ARENA.x - ARENA.rx + 4 + hash2(i, 3.1) * (ARENA.rx * 2 - 8);
    const floor = arenaFloor(x);
    if (floor === null) continue;
    const h = 5 + hash2(i, 7.7) * 12;
    const color = CORAL_COLORS[i % CORAL_COLORS.length]!;
    c.lineStyle(1.1, color, 0.95);
    for (let b = 0; b < 4; b++) {
      const a = -Math.PI / 2 + (b - 1.5) * 0.35 + (hash2(i, b) - 0.5) * 0.3;
      c.lineBetween(x, floor, x + Math.cos(a) * h, floor + Math.sin(a) * h);
    }
    c.fillStyle(color, 0.8).fillCircle(x, floor - h * 0.85, 1.2);
  }
}

/** The galleon on its side in the kelp: a dark broken hull, ribs, a fallen mast. */
function drawWreck(w: Phaser.GameObjects.Graphics): void {
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
