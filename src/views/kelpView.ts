// Kelp strands growing on rock tops, swaying. Some stand in front of the diver as dark silhouettes.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { KELP } from '../data/worldLayout';
import { hash2 } from '../systems/math';
import type { TileMap } from '../systems/world/tileMap';

interface Strand {
  x: number;
  y: number;
  h: number;
  phase: number;
  width: number;
}

/** Where kelp grows (port of genKelp from the prototype). */
export function growKelp(map: TileMap): { back: Strand[]; front: Strand[] } {
  const back: Strand[] = [];
  const front: Strand[] = [];
  const T = map.tileSize;
  for (let ty = 1; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      if (!map.isTop(tx, ty)) continue;
      const X = tx * T;
      const forest = X > KELP.forest.xMin && X < KELP.forest.xMax;
      const def = forest ? KELP.forest : KELP.elsewhere;
      if (ty * T >= def.maxY || hash2(tx, ty) >= def.chance) continue;
      const x = X + 3;
      let y = ty * T - T;
      while (y < ty * T + T && !map.solidAt(x, y)) y += 0.5;
      const s: Strand = {
        x,
        y: y + 1,
        h: def.minH + Math.floor(hash2(tx * 9, ty) * (def.maxH - def.minH)),
        phase: hash2(tx, ty * 3) * 6,
        width: 0.9 + hash2(tx * 5, ty) * 0.8,
      };
      if (hash2(tx * 7, ty * 11) < KELP.frontFraction) front.push(s);
      else back.push(s);
    }
  }
  return { back, front };
}

export class KelpView {
  private readonly backG: Phaser.GameObjects.Graphics;
  private readonly frontG: Phaser.GameObjects.Graphics;
  private readonly back: Strand[];
  private readonly front: Strand[];

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    map: TileMap,
  ) {
    const k = growKelp(map);
    this.back = k.back;
    this.front = k.front;
    this.backG = scene.add.graphics();
    this.frontG = scene.add.graphics();
    backLayer.add(this.backG);
    frontLayer.add(this.frontG);
  }

  private draw(
    g: Phaser.GameObjects.Graphics,
    list: Strand[],
    view: Phaser.Geom.Rectangle,
    time: number,
    front: boolean,
  ) {
    g.clear();
    const color = Phaser.Display.Color.HexStringToColor(front ? SEA.kelpFront : SEA.kelpBack).color;
    const leaf = 0x1d5a45;
    for (const k of list) {
      if (k.x < view.x - 20 || k.x > view.right + 20 || k.y - k.h > view.bottom || k.y < view.y) continue;
      const pts: Phaser.Math.Vector2[] = [];
      const steps = Math.max(4, Math.round(k.h / 5));
      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const sway = Math.sin(time * 1.1 + k.phase + s * 2.5) * s * Math.min(6, k.h * 0.12);
        pts.push(new Phaser.Math.Vector2(k.x + sway, k.y - s * k.h));
      }
      g.lineStyle(k.width * (front ? 1.6 : 1), color, 1);
      g.strokePoints(pts);
      if (!front) {
        g.fillStyle(leaf, 0.9);
        for (let i = 2; i < pts.length; i += 2) {
          const p = pts[i]!;
          const side = i % 4 === 0 ? 1 : -1;
          g.fillEllipse(p.x + side * 1.6, p.y, 3.2, 1.1);
        }
      }
    }
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    this.draw(this.backG, this.back, view, time, false);
    this.draw(this.frontG, this.front, view, time, true);
  }
}
