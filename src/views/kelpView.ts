// Kelp strands growing on rock tops, swaying. Some stand in front of the diver as dark silhouettes.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { KELP } from '../data/worldLayout';
import { ENDLESS } from '../data/endless';
import { biomeAt } from '../systems/world/endless';

/** Kelp grows only this deep (world y): deeper it is dark and nobody sees it. */
const KELP_DEEPEST = 1200;
/** Out in the endless sea kelp grows a chunk of columns at a time, near the camera only. */
const KELP_CHUNK = 64;
import { hash2 } from '../systems/math';
import type { TileMap } from '../systems/world/tileMap';

interface Strand {
  x: number;
  y: number;
  h: number;
  phase: number;
  width: number;
}

interface KelpDef {
  maxY: number;
  chance: number;
  minH: number;
  maxH: number;
}

/** Kelp of the hand-made coast (the forest, or the sparse kind elsewhere) or of a stretch of the endless sea. */
function kelpDefAt(x: number): KelpDef {
  const b = biomeAt(x);
  if (b) return { ...b.kelp, maxY: Infinity };
  return x > KELP.forest.xMin && x < KELP.forest.xMax ? KELP.forest : KELP.elsewhere;
}

/** Where kelp grows in columns tx0 … tx1 - 1 (port of genKelp from the prototype). */
export function growKelp(map: TileMap, tx0 = 0, tx1 = map.cols): { back: Strand[]; front: Strand[] } {
  const back: Strand[] = [];
  const front: Strand[] = [];
  const T = map.tileSize;
  const rows = Math.min(map.rows, Math.ceil(KELP_DEEPEST / T));
  for (let ty = 1; ty < rows; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      if (!map.isTop(tx, ty)) continue;
      const X = tx * T;
      const def = kelpDefAt(X);
      if (def.chance <= 0) continue;
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
  private readonly far = new Map<number, { back: Strand[]; front: Strand[] }>();
  private readonly backColor = Phaser.Display.Color.HexStringToColor(SEA.kelpBack).color;
  private readonly frontColor = Phaser.Display.Color.HexStringToColor(SEA.kelpFront).color;

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
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
    const color = front ? this.frontColor : this.backColor;
    const leaf = 0x1d5a45;
    for (const k of list) {
      if (k.x < view.x - 20 || k.x > view.right + 20 || k.y - k.h > view.bottom || k.y < view.y) continue;
      // drawn with a path (no new objects every frame)
      const steps = Math.max(4, Math.round(k.h / 5));
      const amp = Math.min(6, k.h * 0.12);
      g.lineStyle(k.width * (front ? 1.6 : 1), color, 1);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const x = k.x + Math.sin(time * 1.1 + k.phase + s * 2.5) * s * amp;
        const y = k.y - s * k.h;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      if (!front) {
        g.fillStyle(leaf, 0.9);
        for (let i = 2; i <= steps; i += 2) {
          const s = i / steps;
          const x = k.x + Math.sin(time * 1.1 + k.phase + s * 2.5) * s * amp;
          const side = i % 4 === 0 ? 1 : -1;
          g.fillEllipse(x + side * 1.6, k.y - s * k.h, 3.2, 1.1);
        }
      }
    }
  }

  /** The kelp of the endless sea around the view (grown when first needed, forgotten when far away). */
  private farKelp(view: Phaser.Geom.Rectangle): { back: Strand[]; front: Strand[] } {
    const out = { back: [] as Strand[], front: [] as Strand[] };
    if (view.right < ENDLESS.startX) return out;
    const T = this.map.tileSize;
    const c0 = Math.floor((view.x / T - this.map.cols) / KELP_CHUNK) - 1;
    const c1 = Math.floor((view.right / T - this.map.cols) / KELP_CHUNK) + 1;
    for (let c = Math.max(0, c0); c <= c1; c++) {
      let k = this.far.get(c);
      if (!k) {
        const tx0 = this.map.cols + c * KELP_CHUNK;
        k = growKelp(this.map, tx0, tx0 + KELP_CHUNK);
        this.far.set(c, k);
      }
      out.back.push(...k.back);
      out.front.push(...k.front);
    }
    for (const c of this.far.keys()) if (c < c0 - 4 || c > c1 + 4) this.far.delete(c);
    return out;
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const far = this.farKelp(view);
    this.draw(this.backG, far.back.length ? [...this.back, ...far.back] : this.back, view, time, false);
    this.draw(this.frontG, far.front.length ? [...this.front, ...far.front] : this.front, view, time, true);
  }
}
