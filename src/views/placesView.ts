// Portofosco's pier and houses at the surface, and the wrecks/chests on the sea floor.
import Phaser from 'phaser';
import { PORT } from '../data/economy';
import { WORLD } from '../data/worldLayout';
import type { Wreck } from '../systems/economy/places';
import type { GearState } from '../systems/economy/gear';
import { TEX } from './textures';

function drawPort(g: Phaser.GameObjects.Graphics): void {
  const s = WORLD.surfaceY;
  const x = PORT.x;
  // stilts and deck
  g.fillStyle(0x1b1612, 1);
  for (let i = -3; i <= 3; i++) g.fillRect(x + i * 14 - 1, s - 6, 2.2, 22);
  g.fillStyle(0x3a2c20, 1);
  g.fillRect(x - 48, s - 8, 96, 3.5);
  // houses on the shore (dark silhouettes against the storm sky)
  const houses: [number, number, number][] = [
    [-120, 26, 24],
    [-92, 20, 30],
    [-66, 28, 20],
    [60, 22, 26],
    [88, 30, 22],
  ];
  for (const [dx, w, h] of houses) {
    g.fillStyle(0x0d1216, 1);
    g.fillRect(x + dx, s - 4 - h, w, h + 4);
    g.fillTriangle(x + dx - 3, s - 4 - h, x + dx + w + 3, s - 4 - h, x + dx + w / 2, s - 16 - h);
    g.fillStyle(0xffc878, 0.85);
    g.fillRect(x + dx + w * 0.35, s - h * 0.6, 3, 3);
  }
  // shore
  g.fillStyle(0x0b0f12, 1);
  g.fillRect(x - 150, s - 4, 90, 6);
  g.fillRect(x + 50, s - 4, 100, 6);
  // a small boat
  g.fillStyle(0x141b20, 1);
  g.fillTriangle(x + 20, s - 5, x + 44, s - 5, x + 38, s + 1);
  g.fillRect(x + 24, s - 7, 16, 2);
  g.fillRect(x + 31, s - 24, 1.4, 18);
}

function drawWreck(g: Phaser.GameObjects.Graphics, w: Wreck): void {
  const x = w.x;
  const y = w.y + 4;
  if (w.def.reward.weapon) {
    // a broken hull lying on its side
    g.fillStyle(0x221a14, 1);
    g.fillEllipse(x, y - 6, 60, 16);
    g.fillStyle(0x2e241b, 1);
    for (let i = -24; i <= 24; i += 8) g.fillRect(x + i, y - 16, 2, 12);
    g.fillStyle(0x17110d, 1);
    g.fillRect(x - 4, y - 34, 2.5, 24);
    g.fillTriangle(x - 3, y - 34, x + 12, y - 24, x - 3, y - 22);
  }
  // the chest
  g.fillStyle(0x4a3218, 1);
  g.fillRect(x - 6, y - 8, 12, 8);
  g.fillStyle(0x6b4a22, 1);
  g.fillRect(x - 6.5, y - 10, 13, 3);
  g.fillStyle(0xc9a15a, 1);
  g.fillRect(x - 1, y - 7, 2, 2.5);
}

export class PlacesView {
  private readonly glows: Phaser.GameObjects.Image[];

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly wrecks: Wreck[],
  ) {
    const g = scene.add.graphics();
    drawPort(g);
    for (const w of wrecks) drawWreck(g, w);
    layer.add(g);
    this.glows = wrecks.map(() =>
      scene.add.image(0, 0, TEX.dot).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd278).setScale(1.3),
    );
    layer.add(this.glows);
  }

  update(gear: GearState, time: number): void {
    this.wrecks.forEach((w, i) => {
      const open = gear.wrecks.includes(w.def.id);
      this.glows[i]!.setVisible(!open)
        .setPosition(w.x, w.y - 4)
        .setAlpha(0.45 + 0.2 * Math.sin(time * 4 + i));
    });
  }

  /** Light spots for the darkness mask: unopened chests glow faintly. */
  glowSpots(gear: GearState): { x: number; y: number; r: number }[] {
    return this.wrecks
      .filter((w) => !gear.wrecks.includes(w.def.id))
      .map((w) => ({ x: w.x, y: w.y - 4, r: 16 }));
  }
}
