// The owner's painted pieces of the world: walls of rock, coral or ice laid over the long straight faces of the
// shafts down to the abysses and of the trenches of the endless sea (the tiles alone made them look like blocks),
// and the icebergs of the cold seas (their ice is solid: systems/world/icebergs.ts). Only what is near the
// camera is drawn, from a small pool of images.
import Phaser from 'phaser';
import { ENDLESS } from '../data/endless';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { ICEBERGS, WALLS } from '../data/worldArt';
import { CORALS, ICE, WORLD, WORLD_SHAPE } from '../data/worldLayout';
import { hash2 } from '../systems/math';
import { biomeAt, biomeOf, endlessFloor, stretchAt } from '../systems/world/endless';
import { icebergBox, icebergsOfStretch, type IcebergBox } from '../systems/world/icebergs';
import type { TileMap } from '../systems/world/tileMap';

interface Wall {
  key: string;
  x: number; // centre
  y: number; // centre
  flip: boolean;
}

const has = (key: string): boolean => WORLD_ART_KEYS.includes(key);

/** Which painted wall suits a place: ice in the cold, coral by the reefs, else one of the rocks. */
function wallKey(x: number, i: number): string {
  const b = biomeAt(x);
  if ((b?.ice || (!b && x > ICE.xMin)) && has(WALLS.ice)) return WALLS.ice;
  const reef = b ? b.corals.colors.length > 0 : x > CORALS.reef.xMin && x < CORALS.reef.xMax;
  if (reef && has(WALLS.coral)) return WALLS.coral;
  const rocks = WALLS.rock.filter(has);
  return rocks[Math.floor(hash2(x * 0.1, i) * rocks.length)] ?? '';
}

export class WorldArtView {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly handMade: Wall[];
  private readonly far = new Map<number, Wall[]>();
  private readonly bergs: IcebergBox[];
  private readonly wallH: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    const sample = WALLS.rock.find(has);
    const tex = sample ? scene.textures.get(`world-${sample}`).getSourceImage() : null;
    this.wallH = tex ? (WALLS.width * tex.height) / tex.width : WALLS.width * 2.6;
    // the straight faces of the hand-made shafts (both sides)
    this.handMade = [];
    for (const z of WORLD_SHAPE)
      for (const s of z.openings) {
        if (s.kind !== 'shaft') continue;
        const yMax = Math.min(s.yMax, WORLD.handMadeBottom);
        this.handMade.push(
          ...this.face(s.x0, -1, WORLD.surfaceY, yMax),
          ...this.face(s.x1, 1, WORLD.surfaceY, yMax),
        );
      }
    this.bergs = ICEBERGS.map(icebergBox).filter((b): b is IcebergBox => !!b);
  }

  /**
   * Walls along a vertical face at x between y0 and y1: `side` -1 has the rock on the left (water to the right),
   * 1 the other way. Only the stretches where the rock really meets open water, long enough to matter.
   */
  private face(x: number, side: -1 | 1, y0: number, y1: number): Wall[] {
    const out: Wall[] = [];
    const rockX = x + side * 12;
    const waterX = x - side * 12;
    let start = -1;
    const flush = (end: number): void => {
      if (start < 0 || end - start < WALLS.minFace) return;
      const step = this.wallH * (1 - WALLS.overlap);
      const n = Math.max(1, Math.round((end - start) / step));
      for (let i = 0; i < n; i++) {
        const y = start + ((i + 0.5) / n) * (end - start);
        const cx = x + side * WALLS.width * (WALLS.inRock - 0.5);
        out.push({ key: wallKey(x, i + Math.round(y)), x: cx, y, flip: side < 0 });
      }
    };
    for (let y = Math.max(y0, WORLD.surfaceY + 8); y <= y1; y += 8) {
      const edge = this.map.solidAt(rockX, y) && !this.map.solidAt(waterX, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        flush(y);
        start = -1;
      }
    }
    flush(y1);
    return out.filter((w) => w.key);
  }

  /** The walls of the trenches of the endless sea, a stretch at a time. */
  private farWalls(k: number): Wall[] {
    let w = this.far.get(k);
    if (w) return w;
    w = [];
    const b = biomeOf(k);
    const t = b.trench;
    if (t) {
      const x0 = ENDLESS.startX + k * ENDLESS.stretch;
      const edge = (1 - t.width) / 2;
      const left = x0 + (edge + 0.03) * ENDLESS.stretch;
      const right = x0 + (1 - edge - 0.03) * ENDLESS.stretch;
      const top = Math.min(endlessFloor(left - 120), endlessFloor(right + 120)) - 40;
      const bottom = Math.max(endlessFloor(left + 120), endlessFloor(right - 120));
      w.push(...this.face(left, -1, top, bottom), ...this.face(right, 1, top, bottom));
    }
    this.far.set(k, w);
    for (const key of this.far.keys()) if (Math.abs(key - k) > 6) this.far.delete(key);
    return w;
  }

  private image(i: number): Phaser.GameObjects.Image {
    let im = this.pool[i];
    if (!im) {
      im = this.scene.add.image(0, 0, '__WHITE');
      this.layer.add(im);
      this.pool.push(im);
    }
    return im.setVisible(true);
  }

  update(view: Phaser.Geom.Rectangle): void {
    let n = 0;
    const near = (x0: number, x1: number, y0: number, y1: number): boolean =>
      x1 > view.x - 40 && x0 < view.right + 40 && y1 > view.y - 40 && y0 < view.bottom + 40;
    const walls: Wall[] = [...this.handMade];
    const bergs: IcebergBox[] = [...this.bergs];
    if (view.right > ENDLESS.startX)
      for (let k = Math.max(0, stretchAt(view.x) - 1); k <= stretchAt(view.right) + 1; k++) {
        walls.push(...this.farWalls(k));
        if (biomeOf(k).ice) bergs.push(...icebergsOfStretch(k));
      }
    const hw = WALLS.width / 2;
    const hh = this.wallH / 2;
    for (const w of walls) {
      if (!near(w.x - hw, w.x + hw, w.y - hh, w.y + hh)) continue;
      this.image(n++)
        .setTexture(`world-${w.key}`)
        .setOrigin(0.5)
        .setDisplaySize(WALLS.width, this.wallH)
        .setFlipX(w.flip)
        .setPosition(w.x, w.y);
    }
    for (const b of bergs) {
      if (!near(b.left, b.left + b.w, b.top, b.top + b.h) || !has(b.id)) continue;
      this.image(n++)
        .setTexture(`world-${b.id}`)
        .setOrigin(0, 0)
        .setDisplaySize(b.w, b.h)
        .setFlipX(false)
        .setPosition(b.left, b.top);
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }
}
