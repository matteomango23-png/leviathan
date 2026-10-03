// Small effects in the water: breath bubbles, puffs of silt, and the wavy surface line.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { TEX } from './textures';

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rising: boolean;
  phase: number;
}

const POOL = 80;

export class EffectsView {
  private readonly parts: Particle[] = [];
  private readonly surface: Phaser.GameObjects.Graphics;
  private next = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, TEX.bubble).setVisible(false);
      layer.add(img);
      this.parts.push({ img, vx: 0, vy: 0, life: 0, maxLife: 1, rising: true, phase: 0 });
    }
    this.surface = scene.add.graphics();
    layer.add(this.surface);
  }

  private take(): Particle {
    const p = this.parts[this.next]!;
    this.next = (this.next + 1) % this.parts.length;
    return p;
  }

  bubble(x: number, y: number): void {
    const p = this.take();
    p.img
      .setTexture(TEX.bubble)
      .setPosition(x, y)
      .setScale(0.05 + Math.random() * 0.06)
      .setAlpha(0.9)
      .setVisible(true)
      .clearTint();
    p.vx = 0;
    p.vy = -(10 + Math.random() * 8);
    p.life = p.maxLife = 2.5 + Math.random();
    p.rising = true;
    p.phase = Math.random() * 6;
  }

  puff(x: number, y: number, n: number, color: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.take();
      p.img
        .setTexture(TEX.dot)
        .setPosition(x, y)
        .setScale(0.12 + Math.random() * 0.1)
        .setTint(color)
        .setAlpha(0.8)
        .setVisible(true);
      p.vx = (Math.random() * 2 - 1) * speed;
      p.vy = (Math.random() * 2 - 1) * speed;
      p.life = p.maxLife = 0.4 + Math.random() * 0.4;
      p.rising = false;
    }
  }

  /** @param waves height of the surface waves (1: calm; the weather raises it) */
  update(view: Phaser.Geom.Rectangle, time: number, dt: number, waves = 1): void {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.rising) {
        p.img.x += Math.sin(time * 4 + p.phase) * 6 * dt;
        p.img.y += p.vy * dt;
        if (p.img.y < WORLD.surfaceY) p.life = 0;
      } else {
        p.img.x += p.vx * dt;
        p.img.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
      }
      p.img.setAlpha(Math.min(1, (p.life / p.maxLife) * 2) * 0.9);
      if (p.life <= 0) p.img.setVisible(false);
    }

    // surface line
    const g = this.surface;
    g.clear();
    if (view.y < WORLD.surfaceY + 4) {
      const c = Phaser.Display.Color.RGBStringToColor(SEA.surfaceLine);
      g.lineStyle(0.8, c.color, c.alphaGL);
      const pts: Phaser.Math.Vector2[] = [];
      for (let x = Math.floor(view.x) - 4; x <= view.right + 4; x += 3) {
        pts.push(new Phaser.Math.Vector2(x, WORLD.surfaceY + Math.sin(x * 0.09 + time * 2) * 0.8 * waves));
      }
      g.strokePoints(pts);
    }
  }
}
