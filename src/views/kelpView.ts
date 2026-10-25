// Kelp strands growing on rock tops, swaying. Some stand in front of the diver as dark silhouettes. With the owner's
// painted kelp (lot C3, data/worldArt.ts PROP_ART) each strand is its picture cut in slices that sway, more towards
// the top; without it, a drawn line.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { KELP } from '../data/worldLayout';
import { ENDLESS } from '../data/endless';
import { PROP_ART } from '../data/worldArt';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
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
function growKelp(map: TileMap, tx0 = 0, tx1 = map.cols): { back: Strand[]; front: Strand[] } {
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
  private readonly scene: Phaser.Scene;
  private readonly backColor = Phaser.Display.Color.HexStringToColor(SEA.kelpBack).color;
  /** The painted slices in use (one pool behind the diver, one in front). */
  private readonly pools: { back: Phaser.GameObjects.Image[]; front: Phaser.GameObjects.Image[] } = {
    back: [],
    front: [],
  };
  private readonly painted = PROP_ART.kelp.every((k) => WORLD_ART_KEYS.includes(k));
  private readonly frontColor = Phaser.Display.Color.HexStringToColor(SEA.kelpFront).color;

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
    /** Behind the terrain: the painted strands behind you grow from inside the rock (plant.ts). */
    private readonly under?: Phaser.GameObjects.Container,
  ) {
    this.scene = scene;
    const k = growKelp(map);
    this.back = k.back;
    this.front = k.front;
    this.backG = scene.add.graphics();
    this.frontG = scene.add.graphics();
    backLayer.add(this.backG);
    frontLayer.add(this.frontG);
    this.layers = { back: backLayer, front: frontLayer };
  }

  private readonly layers: { back: Phaser.GameObjects.Layer; front: Phaser.GameObjects.Layer };

  /** The painted strands: each picture in slices, every slice shifted by the sway at its height. */
  private drawPainted(list: Strand[], view: Phaser.Geom.Rectangle, time: number, front: boolean): void {
    const pool = front ? this.pools.front : this.pools.back;
    const n = PROP_ART.kelpSlices;
    let used = 0;
    for (const k of list) {
      if (k.x < view.x - 20 || k.x > view.right + 20 || k.y - k.h > view.bottom || k.y < view.y) continue;
      const key = `world-${PROP_ART.kelp[Math.floor(hash2(k.x * 0.37, k.y) * PROP_ART.kelp.length)]!}`;
      const flip = hash2(k.x, k.y * 0.11) > 0.5;
      const amp = Math.min(6, k.h * 0.12);
      for (let i = 0; i < n; i++) {
        let im = pool[used];
        if (!im) {
          im = this.scene.add.image(0, 0, key).setOrigin(0.5, 0);
          (front ? this.layers.front : (this.under ?? this.layers.back)).add(im);
          pool.push(im);
        }
        used++;
        if (im.texture.key !== key) im.setTexture(key);
        const H = im.frame.realHeight;
        const scale = k.h / H;
        const s0 = i / n;
        const s1 = (i + 1) / n;
        const s = (s0 + s1) / 2; // share of the height from the root
        im.setVisible(true).setScale(scale).setFlipX(flip);
        im.setCrop(0, (1 - s1) * H, im.frame.realWidth, (s1 - s0) * H + 1.5);
        // the root a little into the rock (the terrain in front hides it)
        im.setPosition(
          k.x + Math.sin(time * 1.1 + k.phase + s * 2.5) * s * amp,
          k.y + PROP_ART.kelpRootSink - k.h,
        );
        if (front) im.setTint(PROP_ART.kelpFrontTint);
      }
    }
    for (let i = used; i < pool.length; i++) pool[i]!.setVisible(false);
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
    const back = far.back.length ? [...this.back, ...far.back] : this.back;
    const front = far.front.length ? [...this.front, ...far.front] : this.front;
    if (this.painted) {
      this.drawPainted(back, view, time, false);
      this.drawPainted(front, view, time, true);
      return;
    }
    this.draw(this.backG, back, view, time, false);
    this.draw(this.frontG, front, view, time, true);
  }
}
