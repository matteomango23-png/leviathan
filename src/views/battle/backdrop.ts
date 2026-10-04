// The battle background, in layers that move at different speeds (a slow drifting camera gives depth):
// water and distant rock, light beams from the surface, drifting haze, the middle layer (rock walls and the
// place's props), the ground under each beast with rippling light, marine snow and bubbles, then plants and
// rocks very close to the camera, and a vignette. Painted layers (`bg/<place>_<layer>.webp`) replace the
// drawn ones as soon as they exist.
import Phaser from 'phaser';
import { BATTLE_PALETTES, type BattlePlace } from '../../data/battle';
import type { Side } from '../../systems/battle/battle';
import {
  blobTexture,
  causticTexture,
  cornerTexture,
  farTexture,
  groundTexture,
  midTexture,
  propTexture,
  rayTexture,
  vignetteTexture,
  waterTexture,
} from './backdropArt';

/** The painted layers of a place, when they exist (texture keys). */
export interface PaintedLayers {
  far?: string;
  mid?: string;
  front?: string;
  ground?: string;
  /** Borrowed from the bay (tinted with the place's colour, its props drawn on top). */
  borrowed?: boolean;
}

/** Depth of each layer: how much it follows the camera (0 = fixed, 1 = with the beasts). */
export const DEPTH = { far: 0.15, mid: 0.45, ground: 1, front: 1.7 };
const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

interface Drifter {
  im: Phaser.GameObjects.Image;
  x: number;
  y: number;
  v: number;
  phase: number;
  base: number;
}

export class BattleBackdrop {
  private readonly pal;
  private readonly water: Phaser.GameObjects.Image | null;
  private readonly far: Phaser.GameObjects.Image;
  private readonly mid: Phaser.GameObjects.Image;
  private readonly props: Phaser.GameObjects.Image | null;
  private readonly rays: Drifter[] = [];
  private readonly fog: Drifter[] = [];
  private readonly grounds: Record<Side, Phaser.GameObjects.Image>;
  private readonly caustics: Record<Side, Phaser.GameObjects.Image[]>;
  private readonly corners: Phaser.GameObjects.Image[] = [];
  private readonly front: Phaser.GameObjects.Image | null;
  private readonly near: Phaser.GameObjects.Graphics;
  private readonly snow: Phaser.GameObjects.Graphics;
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly motes: { x: number; y: number; s: number }[] = [];
  private bubbles: { x: number; y: number; r: number; t: number }[] = [];
  private readonly groundWidth: Record<Side, number> = { you: 0, foe: 0 };
  /** The slow camera drift, in pixels (layers move a share of it). */
  readonly cam = { x: 0, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    readonly place: BattlePlace,
    painted: PaintedLayers,
  ) {
    const pal = (this.pal = BATTLE_PALETTES[place]);
    const add = (key: string, depth: number): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, key).setDepth(depth);
    this.water = painted.far ? null : add(waterTexture(scene, place, pal), 0);
    this.far = add(painted.far ?? farTexture(scene, place, pal), 1);
    const ray = rayTexture(scene);
    for (let i = 0; i < 6; i++)
      this.rays.push({
        im: add(ray, 2).setBlendMode(Phaser.BlendModes.ADD).setTint(color(pal.ray)).setOrigin(0.5, 0),
        x: 0.08 + i * 0.17 + Math.random() * 0.06,
        y: 0,
        v: 0.004 + Math.random() * 0.006,
        phase: Math.random() * 7,
        base: (0.12 + Math.random() * 0.12) * (painted.far ? 0.6 : 1), // a painted far has its own rays
      });
    const blob = blobTexture(scene);
    for (let i = 0; i < 7; i++)
      this.fog.push({
        im: add(blob, 3).setTint(color(pal.fog)),
        x: Math.random(),
        y: 0.3 + Math.random() * 0.6,
        v: (0.004 + Math.random() * 0.008) * (Math.random() < 0.5 ? -1 : 1),
        phase: Math.random() * 7,
        base: 0.03 + Math.random() * 0.045,
      });
    this.mid = add(painted.mid ?? midTexture(scene, place, pal), 4);
    this.props = painted.borrowed && painted.mid ? add(propTexture(scene, place, pal), 4.5) : null;
    const ground = painted.ground ?? groundTexture(scene, place, pal);
    this.grounds = { foe: add(ground, 5), you: add(ground, 5) };
    const caustic = [causticTexture(scene, 1), causticTexture(scene, 2)];
    this.caustics = {
      foe: caustic.map((k) => add(k, 6).setBlendMode(Phaser.BlendModes.ADD)),
      you: caustic.map((k) => add(k, 6).setBlendMode(Phaser.BlendModes.ADD)),
    };
    this.snow = scene.add.graphics().setDepth(20);
    for (let i = 0; i < 70; i++)
      this.motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() });
    // the framing layers stay behind the beasts (owner: only the health box may cover them)
    this.near = scene.add.graphics().setDepth(6);
    this.front = painted.front ? add(painted.front, 6.5) : null;
    if (!painted.front) {
      const corner = cornerTexture(scene, place, pal);
      this.corners = [add(corner, 6.5), add(corner, 6.5).setFlipX(true)];
    }
    this.vignette = add(vignetteTexture(scene), 40);
    if (painted.borrowed) {
      const tint = color(pal.borrowTint);
      for (const im of [this.far, this.mid, this.front, this.grounds.foe, this.grounds.you])
        im?.setTint(tint);
    }
    this.drawRoots = !painted.front || (!!painted.borrowed && pal.prop === 'roots');
  }

  /** Plants or roots drawn right in front of the camera (when there is no painted front, or in the Delta). */
  private readonly drawRoots: boolean;

  private get w(): number {
    return this.scene.scale.width;
  }
  private get h(): number {
    return this.scene.scale.height;
  }

  /** How far a layer at this depth is shifted by the camera. */
  shift(depth: number): { x: number; y: number } {
    return { x: this.cam.x * depth, y: this.cam.y * depth };
  }

  /** The ground under a beast grows with it (pixels wide). */
  setGroundWidth(side: Side, px: number): void {
    this.groundWidth[side] = px;
  }

  /** Fits an image over the whole screen, a little larger so the drift never shows an edge. */
  private cover(im: Phaser.GameObjects.Image, depth: number, extra = 1.08): void {
    const s = Math.max(this.w / im.width, this.h / im.height) * extra;
    const d = this.shift(depth);
    im.setScale(s).setPosition(this.w / 2 + d.x, this.h / 2 + d.y);
  }

  update(dt: number, time: number, anchors: Record<Side, { x: number; y: number }>): void {
    const { w, h } = this;
    this.cam.x = Math.sin(time * 0.09) * w * 0.012;
    this.cam.y = Math.sin(time * 0.13 + 1) * h * 0.008;
    if (this.water) this.cover(this.water, 0);
    this.cover(this.far, DEPTH.far);
    this.cover(this.mid, DEPTH.mid);
    if (this.props) this.cover(this.props, DEPTH.mid * 1.2);
    for (const r of this.rays) {
      const sway = Math.sin(time * 0.25 + r.phase) * 0.03;
      r.im
        .setPosition((r.x + sway) * w + this.shift(DEPTH.far).x, -h * 0.05)
        .setRotation(0.32 + Math.sin(time * 0.17 + r.phase) * 0.05)
        .setScale((w * 0.12) / 64, (h * 1.25) / 512)
        .setAlpha(r.base * (0.55 + 0.45 * Math.sin(time * 0.6 + r.phase * 2)));
    }
    for (const f of this.fog) {
      f.x += (f.v * dt * 60) / 60;
      if (f.x > 1.3) f.x = -0.3;
      if (f.x < -0.3) f.x = 1.3;
      f.im
        .setPosition(f.x * w + this.shift(DEPTH.mid).x, f.y * h + Math.sin(time * 0.2 + f.phase) * h * 0.02)
        .setScale((w * 0.55) / 256, (h * 0.45) / 256)
        .setAlpha(f.base * (0.7 + 0.3 * Math.sin(time * 0.3 + f.phase)));
    }
    for (const side of ['foe', 'you'] as Side[]) {
      const a = anchors[side];
      const gw = this.groundWidth[side] || w * 0.3;
      const g = this.grounds[side];
      g.setPosition(a.x, a.y).setScale(gw / g.width);
      this.caustics[side].forEach((c, i) => {
        const k = 0.5 + 0.5 * Math.sin(time * (0.9 + i * 0.4) + i * 2);
        c.setPosition(a.x + Math.sin(time * 0.3 + i) * gw * 0.03, a.y)
          .setScale((gw * 0.95) / c.width, ((gw * 0.95) / c.width) * (1 + 0.08 * Math.sin(time + i)))
          .setRotation(Math.sin(time * 0.2 + i) * 0.04)
          .setAlpha(0.18 * k);
      });
      if (Math.random() < dt * 0.8)
        this.bubbles.push({
          x: a.x + (Math.random() - 0.5) * gw * 0.6,
          y: a.y,
          r: 1 + Math.random() * 3,
          t: 0,
        });
    }
    this.drawSnow(dt, time);
    this.drawNear(time);
    if (this.front) this.cover(this.front, DEPTH.front, 1.12);
    this.corners.forEach((c, i) => {
      const s = (h * 0.62) / c.height;
      const d = this.shift(DEPTH.front);
      c.setScale(s)
        .setOrigin(i === 0 ? 0 : 1, 1)
        .setPosition((i === 0 ? -w * 0.03 : w * 1.03) + d.x, h * 1.04 + d.y);
    });
    // the vignette frames what the camera sees, also while it zooms in on a big beast and pulls back (it used to
    // stay on the stage and its dark edges slid into view during the pull)
    const cam = this.scene.cameras.main;
    const z = cam.zoom || 1;
    this.vignette
      .setScale(w / z / 512, h / z / 288)
      .setPosition(cam.scrollX + cam.width / 2, cam.scrollY + cam.height / 2);
  }

  private drawSnow(dt: number, time: number): void {
    const { w, h } = this;
    const g = this.snow.clear();
    g.fillStyle(0xd8eef0, 0.4);
    for (const m of this.motes) {
      const y = (m.y + time * 0.01 * m.s) % 1;
      g.fillCircle(m.x * w + Math.sin(time * 0.5 + m.x * 9) * 8, y * h, m.s * Math.max(1, h * 0.003));
    }
    this.bubbles = this.bubbles.filter((b) => (b.t += dt) < 3 && b.y > -10);
    g.lineStyle(1, 0xdff8ff, 0.5);
    for (const b of this.bubbles) {
      b.y -= dt * h * (0.08 + b.r * 0.02);
      g.strokeCircle(b.x + Math.sin(b.t * 5 + b.r) * 3, b.y, b.r * Math.max(1, h * 0.003));
    }
  }

  /** Plants (or roots) right in front of the camera, swaying slowly. */
  private drawNear(time: number): void {
    const { w, h } = this;
    const g = this.near.clear();
    if (!this.drawRoots) return;
    const d = this.shift(DEPTH.front);
    const fromTop = this.pal.prop === 'roots';
    const strands = fromTop ? [0.04, 0.12, 0.85, 0.95] : [0.02, 0.07, 0.11, 0.9, 0.95, 0.985];
    g.fillStyle(color(this.pal.plant), 1);
    strands.forEach((sx, i) => {
      const len = h * (fromTop ? 0.3 + (i % 2) * 0.15 : 0.45 + (i % 3) * 0.12);
      const thick = h * (fromTop ? 0.03 : 0.022);
      const segs = 12;
      let x = sx * w + d.x;
      let y = fromTop ? -h * 0.02 : h * 1.02;
      const dir = fromTop ? 1 : -1;
      for (let k = 0; k < segs; k++) {
        const t = k / segs;
        const sway = Math.sin(time * 0.9 + i * 1.7 + t * 2.4) * h * 0.012 * t;
        const nx = x + sway;
        const ny = y + (dir * len) / segs;
        g.fillCircle(nx, ny, thick * (1 - t * 0.7));
        g.lineStyle(thick * 2 * (1 - t * 0.7), color(this.pal.plant), 1);
        g.lineBetween(x, y, nx, ny);
        x = nx;
        y = ny;
      }
    });
  }

  destroy(): void {
    for (const o of [
      this.water,
      this.far,
      this.mid,
      this.props,
      this.front,
      this.near,
      this.snow,
      this.vignette,
    ])
      o?.destroy();
    for (const r of [...this.rays, ...this.fog]) r.im.destroy();
    for (const s of ['foe', 'you'] as Side[]) {
      this.grounds[s].destroy();
      for (const c of this.caustics[s]) c.destroy();
    }
    for (const c of this.corners) c.destroy();
  }
}
