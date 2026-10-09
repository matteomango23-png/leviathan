// Small effects in the water: breath bubbles and puffs of silt (the surface line: seaSurfaceView.ts).
import Phaser from 'phaser';
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
  private next = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, TEX.bubble).setVisible(false);
      layer.add(img);
      this.parts.push({ img, vx: 0, vy: 0, life: 0, maxLife: 1, rising: true, phase: 0 });
    }
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

  update(time: number, dt: number): void {
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
  }
}
