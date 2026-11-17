// A ship broken in two (owner, 17 novembre 2026: "la nave si spezza a metà quando è distrutta"): its own painting cut
// along a ragged line near the middle, the two halves tilting into a V as the broken middle goes down first, then
// both sinking, darker under the water, with bubbles, wreckage and a slick of black oil. No new pictures: the halves
// are made once from the painting and thrown away when it is gone (the iPhone's memory). Look only.
import Phaser from 'phaser';
import { SINKING } from '../data/company';
import { WORLD } from '../data/worldLayout';
import type { SeaNow } from '../systems/sea';
import { waterOver } from './seaFx';

/** How it breaks: the ragged cut (points down the picture, how far either side of the middle), the V (radians) and
 *  how far apart the halves drift (share of the length). Tuning. */
const CUT = { points: 14, wobble: 0.035 };
const V_ANGLE = 0.32;
const DRIFT = 0.06;

export interface BreakStart {
  /** The painting's texture key and its tint. */
  key: string;
  tint: number;
  /** Where the whole ship was: centre x, top of the picture, its size (units), facing. */
  x: number;
  top: number;
  w: number;
  h: number;
  face: 1 | -1;
}

interface Broken extends BreakStart {
  halves: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  keys: [string, string];
  seed: number;
}

/** The ragged line of the cut, top to bottom, in the picture's pixels. */
function cutLine(w: number, h: number, seed: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= CUT.points; i++) {
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const j = (r - Math.floor(r)) * 2 - 1;
    pts.push({ x: w * (0.5 + j * CUT.wobble), y: (h * i) / CUT.points });
  }
  return pts;
}

export class ShipBreak {
  private readonly broken = new Map<number, Broken>();

  /** The sea's face in front of the halves, over them. */
  private readonly front: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly fx: Phaser.GameObjects.Graphics,
  ) {
    this.front = scene.add.graphics();
    layer.add(this.front);
  }

  /** The two halves of a painting (made once for this break). */
  private halves(id: number, key: string, seed: number): [string, string] {
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const w = src.width;
    const h = src.height;
    const line = cutLine(w, h, seed);
    const out: [string, string] = [`break-${id}-a`, `break-${id}-b`];
    out.forEach((k, side) => {
      if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
      const tex = this.scene.textures.createCanvas(k, w, h)!;
      const c = tex.context;
      c.save();
      c.beginPath();
      c.moveTo(side ? w : 0, 0);
      for (const p of line) c.lineTo(p.x, p.y);
      c.lineTo(side ? w : 0, h);
      c.closePath();
      c.clip();
      c.drawImage(src, 0, 0);
      // the torn edge, charred and dark
      c.globalCompositeOperation = 'source-atop';
      c.strokeStyle = 'rgba(20,12,8,0.85)';
      c.lineWidth = Math.max(4, w * 0.008);
      c.beginPath();
      line.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
      c.restore();
      tex.refresh();
    });
    return out;
  }

  /** A ship (this id) breaks now. */
  start(id: number, b: BreakStart): void {
    if (this.broken.has(id) || !this.scene.textures.exists(b.key)) return;
    const seed = (id * 7.31) % 1000;
    const keys = this.halves(id, b.key, seed);
    const make = (k: string): Phaser.GameObjects.Image => {
      const im = this.scene.add.image(0, 0, k).setTint(b.tint);
      this.layer.add(im);
      return im;
    };
    this.broken.set(id, { ...b, halves: [make(keys[0]), make(keys[1])], keys, seed });
    this.layer.bringToTop(this.front);
  }

  /** Each broken ship at `t` seconds after it broke; those no longer in `alive` are thrown away. */
  update(at: Map<number, number>, time: number, sea: SeaNow): void {
    this.fx.clear();
    this.front.clear();
    for (const [id, b] of this.broken) {
      const t = at.get(id);
      if (t === undefined) {
        this.drop(id, b);
        continue;
      }
      const k = Math.min(1, t / SINKING.seconds);
      const tilt = V_ANGLE * Math.min(1, t / 2.5);
      // the broken middle goes down first, then everything slides under, slowly and then faster
      const sink = b.h * (0.25 * Math.min(1, t / 2) + 1.6 * k * k);
      const cut = { x: b.x, y: b.top + b.h * 0.45 + sink };
      const under = Math.min(1, Math.max(0, (cut.y - WORLD.surfaceY) / (b.h * 1.2)));
      const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(b.tint),
        Phaser.Display.Color.IntegerToColor(0x24333a),
        1,
        under,
      );
      const tint = Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b);
      b.halves.forEach((im, i) => {
        // the half drawn on the left (the stern facing east) turns its outer end up, the other likewise
        const left = (i === 0) === b.face > 0;
        const drift = (left ? -1 : 1) * b.w * DRIFT * Math.min(1, t / 3);
        im.setOrigin(0.5, 0.45)
          .setPosition(cut.x + drift, cut.y)
          .setScale((b.w / im.width) * b.face, b.h / im.height)
          .setRotation(left ? tilt : -tilt)
          .setTint(tint)
          .setAlpha(1 - Math.max(0, (k - 0.8) / 0.2));
      });
      this.drawWreckage(b, t, time);
      waterOver(this.front, b.x - b.w * 0.75, b.x + b.w * 0.75, cut.y + b.h, time, sea);
    }
  }

  /** Bubbles rising from it, bits of wreck on the waves and a slick of black oil spreading. */
  private drawWreckage(b: Broken, t: number, time: number): void {
    const g = this.fx;
    const spread = b.w * (0.3 + 0.5 * Math.min(1, t / SINKING.seconds));
    const fade = 1 - Math.min(1, t / SINKING.seconds);
    for (let i = 0; i < 9; i++) {
      const u = Math.sin(b.seed + i * 3.7);
      g.fillStyle(0x0b0907, 0.35 * fade).fillEllipse(
        b.x + u * spread * 0.5,
        WORLD.surfaceY + 1,
        spread * 0.35,
        2.2,
      );
    }
    for (let i = 0; i < 7; i++) {
      const u = Math.sin(b.seed * 2 + i * 5.1);
      const bob = Math.sin(time * 1.7 + i) * 0.8;
      g.fillStyle(0x3a2c22, 0.9 * fade).fillRect(
        b.x + u * spread * 0.6,
        WORLD.surfaceY - 1 + bob,
        2 + (i % 3),
        1,
      );
    }
    for (let i = 0; i < 14; i++) {
      const ph = (time * 0.6 + i / 14) % 1;
      const x = b.x + Math.sin(b.seed + i * 1.9) * b.w * 0.35;
      const y = b.top + b.h + t * 4 - ph * b.h * 1.4;
      if (y < WORLD.surfaceY) continue;
      g.fillStyle(0xcfe6ee, 0.35 * (1 - ph) * fade).fillCircle(x, y, 0.6 + ph * 1.2);
    }
  }

  private drop(id: number, b: Broken): void {
    for (const im of b.halves) im.destroy();
    for (const k of b.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.broken.delete(id);
  }
}
