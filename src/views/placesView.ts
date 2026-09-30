// Portofosco's pier and houses at the surface, and the wrecks/chests on the sea floor.
import Phaser from 'phaser';
import { PORT } from '../data/economy';
import { COAST, WORLD } from '../data/worldLayout';
import { landHeight } from '../systems/world/worldGen';
import type { Wreck } from '../systems/economy/places';
import type { GearState } from '../systems/economy/gear';
import { TEX } from './textures';

/** Houses of Portofosco on the land: x, width, height (world units). The story sets them on fire. */
export const PORT_HOUSES: [number, number, number][] = [
  [26, 20, 20],
  [50, 18, 26],
  [72, 22, 18],
  [94, 14, 14],
];

function drawPort(g: Phaser.GameObjects.Graphics): void {
  const s = WORLD.surfaceY;
  const x = PORT.x;
  const shore = COAST.shoreX;
  // the pier: from the shore out over the water, on stilts
  g.fillStyle(0x1b1612, 1);
  for (let px = shore; px <= x + 30; px += 13) g.fillRect(px - 1, s - 6, 2.2, 24);
  g.fillStyle(0x3a2c20, 1);
  g.fillRect(shore - 8, s - 8, x + 38 - shore, 3.5);
  // houses of Portofosco on the land (dark silhouettes against the storm sky, lit windows)
  for (const [hx, w, h] of PORT_HOUSES) {
    const base = s - landHeight(hx + w / 2) + 1;
    g.fillStyle(0x0d1216, 1);
    g.fillRect(hx, base - h, w, h + 2);
    g.fillTriangle(hx - 3, base - h, hx + w + 3, base - h, hx + w / 2, base - h - 11);
    g.fillStyle(0xffc878, 0.85);
    g.fillRect(hx + w * 0.35, base - h * 0.6, 3, 3);
  }
  // a small boat moored at the end of the pier
  g.fillStyle(0x141b20, 1);
  g.fillTriangle(x + 8, s - 5, x + 32, s - 5, x + 26, s + 1);
  g.fillRect(x + 12, s - 7, 16, 2);
  g.fillRect(x + 19, s - 24, 1.4, 18);
  // a lantern at the end of the pier
  g.fillStyle(0xffd9a0, 1);
  g.fillRect(x + 1, s - 16, 2.4, 3);
  g.fillStyle(0x1b1612, 1);
  g.fillRect(x + 1.6, s - 13, 1.2, 6);
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
