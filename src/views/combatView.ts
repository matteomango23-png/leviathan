// Health bars above beasts (with the exhaustion notch), floating damage numbers and the "tame me" marker.
// Drawn in screen space on top of the darkness, so they are always readable.
import Phaser from 'phaser';
import { TAMING } from '../data/rules';
import type { GameEvent } from '../systems/events';
import type { ViewInfo } from './backgroundView';

interface Floater {
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  life: number;
}

export interface BarInfo {
  x: number; // world
  y: number; // world, top of the beast
  width: number; // world units
  frac: number;
  color: number;
  notch: boolean;
  tired: boolean;
}

const COLORS = { wild: '#ffe08a', team: '#ff8a70', diver: '#ff6a5a' };
const POOL = 24;

export class CombatView {
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly floaters: Floater[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.bars = scene.add.graphics();
    layer.add(this.bars);
    for (let i = 0; i < POOL; i++) {
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: '-apple-system, Helvetica Neue, sans-serif',
          fontStyle: 'bold',
          fontSize: '28px',
        })
        .setOrigin(0.5)
        .setStroke('#000000', 5)
        .setVisible(false);
      layer.add(text);
      this.floaters.push({ text, x: 0, y: 0, life: 0 });
    }
  }

  onEvents(events: GameEvent[], zoom: number): void {
    for (const e of events) {
      if (e.type !== 'damage') continue;
      const f = this.floaters[this.next]!;
      this.next = (this.next + 1) % this.floaters.length;
      f.x = e.x + (Math.random() - 0.5) * 6;
      f.y = e.y;
      f.life = 0.9;
      const sign = e.target === 'wild' ? '' : '-';
      f.text
        .setText(`${sign}${Number.isInteger(e.amount) ? e.amount : e.amount.toFixed(1)}`)
        .setColor(COLORS[e.target])
        .setFontSize(Math.max(18, Math.round(zoom * 5.5)))
        .setVisible(true);
    }
  }

  update(v: ViewInfo, bars: BarInfo[], dt: number, time: number): void {
    const g = this.bars;
    g.clear();
    const toScreen = (x: number, y: number): [number, number] => [
      v.w / 2 + (x - v.cx) * v.zoom,
      v.h / 2 + (y - v.cy) * v.zoom,
    ];
    const px = Math.max(1, v.h / 390);
    for (const b of bars) {
      const [sx, sy] = toScreen(b.x, b.y);
      const w = Math.max(60 * px, b.width * v.zoom);
      const h = 4 * px;
      const x0 = sx - w / 2;
      const y0 = sy - 10 * px;
      g.fillStyle(0x000000, 0.7);
      g.fillRect(x0 - px, y0 - px, w + 2 * px, h + 2 * px);
      g.fillStyle(b.color, 1);
      g.fillRect(x0, y0, w * Phaser.Math.Clamp(b.frac, 0, 1), h);
      if (b.notch) {
        g.fillStyle(0x5ff3d6, 1);
        g.fillRect(x0 + w * TAMING.exhaustionThresholdFraction - px / 2, y0 - 3 * px, px * 1.5, h + 6 * px);
      }
      if (b.tired) {
        const a = 0.5 + 0.5 * Math.sin(time * 6);
        g.fillStyle(0x5ff3d6, a);
        g.fillRect(sx - 2 * px, y0 - 20 * px, 4 * px, 9 * px);
        g.fillRect(sx - 2 * px, y0 - 8 * px, 4 * px, 3 * px);
      }
    }
    for (const f of this.floaters) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.y -= 16 * dt;
      const [sx, sy] = toScreen(f.x, f.y);
      f.text.setPosition(sx, sy).setAlpha(Phaser.Math.Clamp(f.life * 2, 0, 1));
      if (f.life <= 0) f.text.setVisible(false);
    }
  }
}
