// Places of the old story kept as scenery (data/scenery.ts): the red corals on the terraces of the amphitheatre
// and the galleon sunk among the kelp. The owner's paintings (lot C3: the corals, the Cimitero dei velieri's
// galleon), or drawn once with shapes.
import Phaser from 'phaser';
import { ARENA, WRECK } from '../data/scenery';
import { hash2 } from '../systems/math';
import { arenaFloor } from '../systems/world/arena';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { PROP_ART, SCENERY_ART } from '../data/worldArt';
import type { TileMap } from '../systems/world/tileMap';
import { plant } from './plant';

const CORAL_COLORS = [0xa3263a, 0xc8484a, 0x8a2a4a, 0xd06a50];

export class SceneryView {
  /** @param under behind the terrain: the painted pieces go there, planted on the floor (plant.ts) */
  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    map?: TileMap,
    under?: Phaser.GameObjects.Container,
  ) {
    const g = scene.add.graphics();
    layer.add(g);
    const has = (k: string): boolean => WORLD_ART_KEYS.includes(k);
    const back = under ?? layer;
    if (SCENERY_ART.arenaCorals.every(has)) paintedCorals(scene, back, map);
    else drawCorals(g);
    if (has(SCENERY_ART.wreck)) {
      const W = WRECK;
      const im = scene.add.image(W.x, 0, `world-${SCENERY_ART.wreck}`).setOrigin(0.5, 1);
      const k = (W.length * SCENERY_ART.wreckScale) / im.width;
      const at = map
        ? plant(map, W.x, W.floorY, im.width * k, im.height * k)
        : { bottom: W.floorY + im.height * k * SCENERY_ART.wreckSink, scale: 1 };
      im.setScale(k * at.scale);
      im.y = at.bottom;
      back.add(im);
    } else drawWreck(g);
  }
}

/** The painted red and pink corals along the terraces of the amphitheatre. */
function paintedCorals(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container | Phaser.GameObjects.Layer,
  map?: TileMap,
): void {
  const pics = SCENERY_ART.arenaCorals;
  for (let i = 0; i < 46; i++) {
    const x = ARENA.x - ARENA.rx + 4 + hash2(i, 3.1) * (ARENA.rx * 2 - 8);
    const floor = arenaFloor(x);
    if (floor === null) continue;
    const [lo, hi] = PROP_ART.coralHeight;
    const im = scene.add.image(x, floor, `world-${pics[i % pics.length]!}`).setOrigin(0.5, 1);
    const k = (lo + hash2(i, 7.7) * (hi - lo)) / im.height;
    const at = map
      ? plant(map, x, floor, im.width * k, im.height * k)
      : { bottom: floor + PROP_ART.coralSink, scale: 1 };
    im.setScale(k * at.scale).setFlipX(hash2(i, 1.3) > 0.5);
    im.y = at.bottom;
    layer.add(im);
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
