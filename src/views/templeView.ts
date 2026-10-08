// What lives inside the sunken temples, drawn over the carved stone: levers, runes (lit or dark), the mosaic with
// the order of the runes, the broken chains, the air vents and the glowing relic.
import Phaser from 'phaser';
import { ENDLESS } from '../data/endless';
import { RUNE_GLYPHS } from '../data/temples';
import { hash2 } from '../systems/math';
import { leverDown, runesLit, type TempleWorld } from '../systems/temple';
import { templeCells, templeSites, templeVents, type TempleSite } from '../systems/world/templeSite';

const RUNE_DARK = '#5d6b66';
const RUNE_LIT = '#9ff3ff';

export class TempleView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  /** One text per rune and mosaic sign, made the first time the temple is in view. */
  private readonly glyphs = new Map<string, Phaser.GameObjects.Text>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.g = scene.add.graphics();
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([this.g, this.glow]);
  }

  update(view: Phaser.Geom.Rectangle, world: TempleWorld, time: number): void {
    this.g.clear();
    this.glow.clear();
    for (const t of templeSites()) {
      const seen = t.x1 > view.x && t.x0 < view.right && t.y1 > view.y && t.y0 < view.bottom;
      for (const [key, txt] of this.glyphs) if (key.startsWith(t.def.id)) txt.setVisible(seen);
      if (seen) this.draw(t, world, time);
    }
  }

  private draw(t: TempleSite, w: TempleWorld, time: number): void {
    const g = this.g;
    const c = t.def.cell;
    const lit = runesLit(w, t);
    for (const k of templeCells(t, 'LabwxyzMNC')) {
      if ('Lab'.includes(k.ch)) {
        // a stone handle on the wall: up, or down once pulled
        const down = leverDown(w, t, k.ch);
        g.fillStyle(0x3a3328, 1).fillCircle(k.x, k.y, c * 0.28);
        g.lineStyle(3, 0xb08a4a, 1);
        const a = down ? Math.PI * 0.75 : -Math.PI * 0.75;
        g.lineBetween(k.x, k.y, k.x + Math.cos(a) * c * 0.6, k.y + Math.sin(a) * c * 0.6);
        g.fillStyle(down ? 0x7fd3c8 : 0xd6b46a, 1).fillCircle(
          k.x + Math.cos(a) * c * 0.6,
          k.y + Math.sin(a) * c * 0.6,
          2.4,
        );
      } else if ('wxyz'.includes(k.ch)) {
        const on = lit.includes(k.ch);
        g.fillStyle(0x26302d, 0.9).fillCircle(k.x, k.y, c * 0.55);
        g.lineStyle(1.2, on ? 0x9ff3ff : 0x55625d, 1).strokeCircle(k.x, k.y, c * 0.55);
        if (on) this.glow.fillStyle(0x58d8ff, 0.18 + 0.06 * Math.sin(time * 3)).fillCircle(k.x, k.y, c * 1.3);
        this.glyph(`${t.def.id}:${k.ch}`, RUNE_GLYPHS[k.ch]!, k.x, k.y, 11).setColor(
          on ? RUNE_LIT : RUNE_DARK,
        );
      } else if (k.ch === 'M') {
        // the mosaic: a tiled panel with the four signs in order
        const wd = c * 4.2;
        g.fillStyle(0x2c3a36, 1).fillRect(k.x - wd / 2, k.y - c * 0.7, wd, c * 1.4);
        g.lineStyle(1, 0xb08a4a, 0.9).strokeRect(k.x - wd / 2, k.y - c * 0.7, wd, c * 1.4);
        t.def.runeOrder.forEach((r, i) =>
          this.glyph(
            `${t.def.id}:M${i}`,
            RUNE_GLYPHS[r]!,
            k.x - wd / 2 + (i + 0.5) * (wd / 4),
            k.y,
            10,
          ).setColor('#c9b27a'),
        );
      } else if (k.ch === 'N') {
        // broken chains hanging from the ceiling, a winch on the floor
        g.lineStyle(1.4, 0x6d6a62, 1);
        for (let i = 0; i < 3; i++) {
          const x = k.x - c + i * c;
          for (let y = t.y0 + c; y < k.y + c * (1 + i * 0.6); y += 4)
            g.strokeEllipse(x + Math.sin(y * 0.2 + i) * 0.6, y, 2.4, 4);
        }
        g.fillStyle(0x4a3f33, 1).fillRect(k.x - c * 0.8, k.y + c * 1.5, c * 1.6, c * 0.9);
      } else if (k.ch === 'C' && !w.gear.relics.includes(t.def.relic)) {
        // the relic: a golden shell that breathes light
        const p = 0.5 + 0.5 * Math.sin(time * 2);
        this.glow.fillStyle(0xffd27a, 0.12 + 0.1 * p).fillCircle(k.x, k.y, c * (1.4 + p * 0.4));
        g.fillStyle(0xe8c068, 1).fillEllipse(k.x, k.y, c * 0.9, c * 0.7);
        g.lineStyle(1, 0x8a6a2a, 1);
        for (let i = -2; i <= 2; i++) g.lineBetween(k.x, k.y + c * 0.32, k.x + i * c * 0.16, k.y - c * 0.3);
      }
    }
    // air vents: bubbles rising to the ceiling
    for (const v of templeVents(t)) {
      this.glow.fillStyle(0x9fe8ff, 0.14).fillEllipse(v.x, v.y, ENDLESS.vents.radius * 2, 8);
      for (let i = 0; i < 8; i++) {
        const rise = (time * (24 + hash2(i, v.x) * 18) + hash2(i * 7, v.x) * v.height) % v.height;
        this.glow
          .lineStyle(0.5, 0xdff8ff, 0.55 * (1 - rise / v.height))
          .strokeCircle(
            v.x + (hash2(i, v.y) - 0.5) * ENDLESS.vents.radius + Math.sin(time * 2 + i) * 2,
            v.y - rise,
            1.2,
          );
      }
    }
  }

  private glyph(key: string, s: string, x: number, y: number, size: number): Phaser.GameObjects.Text {
    let t = this.glyphs.get(key);
    if (!t) {
      t = this.scene.add.text(x, y, s, { fontFamily: 'serif', fontSize: `${size}px` }).setOrigin(0.5);
      t.setResolution(3);
      this.layer.add(t);
      this.glyphs.set(key, t);
    }
    return t;
  }
}
