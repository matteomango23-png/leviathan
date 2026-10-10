// The sea's surface with its waves (owner, 9 ottobre 2026: realistic waves, no line anywhere). The painted
// background stops its water at the deepest a trough can reach (backgroundView, troughDepth); from there up this
// draws the sea itself, solid, in the water's colour, so the only edge is the moving surface, with no outline. A row
// of farther waves behind, darker and slower, gives depth; the crests catch a little light; in rough weather their
// steep tops break into white foam. Drawn behind the vehicles, which ride the same water (systems/ride.ts).
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { TILE, WORLD } from '../data/worldLayout';
import type { TileMap } from '../systems/world/tileMap';
import { icebergsNear } from '../systems/world/icebergs';
import { rampColor } from '../systems/math';
import { seaHeight, troughDepth, waveHeight, type SeaNow } from '../systems/sea';

const STEP = 4; // units between the points of the wave line
/** How much of the wave under it an ice floe follows (it is heavy and wide). */
const ICE_RIDE = 0.35;
const BACK = { shift: 1700, slow: 0.75, scale: 0.6, haze: 0.35 };
/** Under the deepest trough the sea melts into the painted water below in thin steps (no edge): units. */
const FADE = { depth: 48, steps: 16 };

const colour = (c: [number, number, number]): number => Phaser.Display.Color.GetColor(c[0], c[1], c[2]);
const mixRgb = (a: number[], b: number[], t: number): [number, number, number] => [
  Math.round(a[0]! + (b[0]! - a[0]!) * t),
  Math.round(a[1]! + (b[1]! - a[1]!) * t),
  Math.round(a[2]! + (b[2]! - a[2]!) * t),
];

export class SeaSurfaceView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(view: Phaser.Geom.Rectangle, time: number, sea: SeaNow): void {
    const g = this.g.clear();
    const y0 = WORLD.surfaceY;
    const deep = y0 + troughDepth(sea);
    if (view.y > deep + FADE.depth || view.bottom < y0 - 80) return;
    const water = rampColor(SEA.waterByY, deep + 6);
    const sky = Phaser.Display.Color.HexStringToColor(SEA.skyBottom);
    const x0 = Math.floor(view.x / STEP) * STEP - STEP;
    const x1 = view.right + STEP;
    const rough = Math.max(0, Math.min(1, (sea.waves - 1.3) / 1.9));

    // the farther waves: a little smaller, slower, hazier (between the water and the sky); only in a rough sea (on a
    // calm one their flat top read as a line)
    g.fillStyle(colour(mixRgb(water, [sky.red, sky.green, sky.blue], BACK.haze)), rough);
    const back = (x: number): number =>
      y0 - waveHeight(x + BACK.shift, time * BACK.slow, sea) * BACK.scale - 1;
    if (rough > 0.05) for (let x = x0; x < x1; x += STEP) this.column(x, back(x), back(x + STEP), deep);

    // the sea itself, from its moving surface down
    g.fillStyle(colour(water), 1);
    const ys: number[] = [];
    for (let x = x0; x <= x1 + STEP; x += STEP) ys.push(y0 - seaHeight(x, time, sea, sea.water));
    for (let i = 0; i + 1 < ys.length; i++) this.column(x0 + i * STEP, ys[i]!, ys[i + 1]!, deep + 1);
    // then it melts into the painted water (its light rays and rocks start under it, owner 9 ottobre: "as if nothing
    // existed above that line")
    const w = x1 + STEP - x0;
    const h = FADE.depth / FADE.steps;
    for (let j = 0; j < FADE.steps; j++) {
      g.fillStyle(colour(water), 1 - (j + 1) / (FADE.steps + 1));
      g.fillRect(x0, deep + 1 + j * h, w, h);
    }

    // the light through the crests: brighter where a wave stands up
    const lit = colour(mixRgb(water, [150, 205, 215], 0.35));
    for (let i = 0; i + 1 < ys.length; i++) {
      const a = ys[i]!;
      const b = ys[i + 1]!;
      const up = Math.max(0, y0 - (a + b) / 2) / Math.max(1, troughDepth(sea));
      if (up < 0.2) continue; // only the crests: no bright rim along the whole sea (that read as a line)
      g.fillStyle(lit, 0.4 * up * up);
      this.column(x0 + i * STEP, a, b, Math.max(a, b) + 3 + 8 * up);
    }

    // the ice sheet at the surface, over the sea (owner, 10 ottobre: the waves hid it), riding the waves a little
    this.drawIce(x0, x1, y0, deep, time, sea);

    // white foam where a steep crest breaks (rough weather)
    if (rough > 0.05)
      for (let i = 1; i + 1 < ys.length; i++) {
        const y = ys[i]!;
        const slope = Math.abs(ys[i + 1]! - ys[i - 1]!) / (2 * STEP);
        const crest = y < ys[i - 1]! && y <= ys[i + 1]!;
        const high = y0 - y > troughDepth(sea) * 0.35;
        if (!(high && (crest || slope > 0.5))) continue;
        const x = x0 + i * STEP;
        const flicker = 0.6 + 0.4 * Math.sin(time * 9 + x * 0.37);
        g.fillStyle(0xffffff, 0.55 * rough * flicker);
        g.fillEllipse(x, y + 1, 7 + 6 * rough, 2.2 + 1.5 * rough);
      }
  }

  /** The ice tiles of the surface band (map TILE.ice), painted over the sea and lifted with the wave under them. */
  private drawIce(x0: number, x1: number, y0: number, deep: number, time: number, sea: SeaNow): void {
    const m = this.map;
    const t = m.tileSize;
    const top = y0 - troughDepth(sea) - t;
    const ice = colour(SEA.ice);
    for (let x = Math.floor(x0 / t) * t; x < x1; x += t) {
      const lift = -waveHeight(x + t / 2, time, sea) * ICE_RIDE;
      // an iceberg is its own picture (worldArtView): its tiles are not painted
      const bergs = icebergsNear(x);
      let first = true;
      for (let y = Math.floor(top / t) * t; y < deep; y += t) {
        const inBerg = bergs.some(
          (b) => x + t > b.left && x < b.left + b.w && y + t > b.top && y < b.top + b.h,
        );
        if (inBerg || m.tileAtPoint(x + t / 2, y + t / 2) !== TILE.ice) {
          first = true;
          continue;
        }
        this.g.fillStyle(ice, 1).fillRect(x, y + lift, t, t);
        if (first) this.g.fillStyle(0xf2fbff, 0.9).fillRect(x, y + lift, t, Math.max(1, t * 0.2));
        first = false;
      }
    }
  }

  /** The water between two points of a surface and a depth, as two triangles. */
  private column(x: number, ya: number, yb: number, bottom: number): void {
    if (bottom <= Math.min(ya, yb)) return;
    this.g.fillTriangle(x, ya, x + STEP, yb, x + STEP, bottom);
    this.g.fillTriangle(x, ya, x + STEP, bottom, x, bottom);
  }
}
