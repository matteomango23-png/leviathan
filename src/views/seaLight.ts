// Daylight in the water (owner, 21 ottobre 2026: "microparticelle… raggi di luce realistici"): soft shafts from the
// surface (seaRays.ts says where), behind the world and, fainter, in front of it, as real shafts cross the beasts
// too; and the particles floating in the water, far, mid and near (the near ones big and out of focus), barely seen
// until a shaft or your lamp lights them (the darkness is cleared around the lamp: views/lightView.ts). Screen space.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { hash2 } from '../systems/math';
import type { ViewInfo } from './backgroundView';
import { rayLightAt, raysInView, type Ray } from './seaRays';

const RAY_KEY = 'sea-ray';
const DOT_KEY = 'sea-dot';
const P = SEA.particles;
type Band = 'far' | 'mid' | 'near';

interface Mote {
  band: Band;
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

/** A shaft: bright down its middle with soft sides, coming in under the surface and fading out downwards. */
function makeRayTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(RAY_KEY)) return;
  const [w, h] = [64, 256];
  const c = scene.textures.createCanvas(RAY_KEY, w, h)!;
  const ctx = c.getContext();
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    const down = Math.min(1, v / 0.05) * Math.pow(1 - v, 1.4);
    for (let x = 0; x < w; x++) {
      const u = (x / (w - 1)) * 2 - 1;
      const a = Math.exp(-u * u * 3.2) * down;
      const i = (y * w + x) * 4;
      img.data.set([255, 255, 255, Math.round(a * 255)], i);
    }
  }
  ctx.putImageData(img, 0, 0);
  c.refresh();
}

/** A soft round speck (blurred at its edge). */
function makeDotTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(DOT_KEY)) return;
  const s = 32;
  const c = scene.textures.createCanvas(DOT_KEY, s, s)!;
  const ctx = c.getContext();
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  c.refresh();
}

export class SeaLight {
  private readonly backRays: Phaser.GameObjects.Image[] = [];
  private readonly frontRays: Phaser.GameObjects.Image[] = [];
  private readonly dots: Phaser.GameObjects.Image[] = [];
  private readonly motes: Mote[] = [];

  /** @param back behind the world (screen space); @param front over it, under the darkness (screen space) */
  constructor(scene: Phaser.Scene, back: Phaser.GameObjects.Layer, front: Phaser.GameObjects.Layer) {
    makeRayTexture(scene);
    makeDotTexture(scene);
    const ray = (layer: Phaser.GameObjects.Layer): Phaser.GameObjects.Image => {
      const im = scene.add.image(0, 0, RAY_KEY).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
      im.setTint(0xa6dcea).setVisible(false);
      layer.add(im);
      return im;
    };
    for (let i = 0; i < SEA.lightRays.count; i++) {
      this.backRays.push(ray(back));
      this.frontRays.push(ray(front));
    }
    let n = 0;
    for (const band of ['far', 'mid', 'near'] as Band[]) {
      const b = P[band];
      for (let i = 0; i < b.count; i++, n++) {
        this.motes.push({
          band,
          x: hash2(n, 21),
          y: hash2(n, 22),
          size: b.size[0] + (b.size[1] - b.size[0]) * hash2(n, 23),
          phase: hash2(n, 24) * Math.PI * 2,
          speed: 0.7 + hash2(n, 25) * 0.6,
        });
        const im = scene.add.image(0, 0, DOT_KEY).setTint(0xd2ecf2).setVisible(false);
        if (band === 'near') im.setBlendMode(Phaser.BlendModes.ADD);
        (band === 'near' ? front : back).add(im);
        this.dots.push(im);
      }
    }
  }

  /** @param light 0 … 1: daylight reaching the shafts (depth, clouds and storms, murk) */
  update(v: ViewInfo, time: number, light: number): void {
    const surfaceY = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
    const rays: Ray[] = raysInView(v.w, v.h, surfaceY, v.cx * v.zoom, time, light);
    const place = (ims: Phaser.GameObjects.Image[], share: number): void =>
      ims.forEach((im, i) => {
        const r = rays[i];
        if (!r || r.alpha <= 0.002) return void im.setVisible(false);
        im.setVisible(true)
          .setPosition(r.x, r.y)
          .setRotation(-r.angle)
          .setDisplaySize(r.width, r.length)
          .setAlpha(r.alpha * share);
      });
    place(this.backRays, 1);
    place(this.frontRays, SEA.lightRays.frontShare);
    const px = v.h / 400;
    this.motes.forEach((m, i) => {
      const b = P[m.band];
      const im = this.dots[i]!;
      // they drift down and sway, and slide with the camera, the near ones the most
      const sway = Math.sin(time * 0.31 * m.speed + m.phase) * P.sway * px * b.depth;
      const x = (((m.x * v.w + sway - v.cx * v.zoom * b.depth * 0.5) % v.w) + v.w) % v.w;
      const y =
        (((m.y * v.h + time * P.sink * px * b.depth * m.speed - v.cy * v.zoom * b.depth * 0.5) % v.h) + v.h) %
        v.h;
      if (y < surfaceY + 2) return void im.setVisible(false);
      const lit = rayLightAt(x, y, rays);
      im.setVisible(true)
        .setPosition(x, y)
        .setDisplaySize(m.size * px * 2, m.size * px * 2)
        .setAlpha(Math.min(1, b.alpha + b.lit * lit));
    });
  }
}
