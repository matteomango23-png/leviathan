// What shows of the Gallerie (lot M3, systems/world/galleries.ts): the painted arch at each mouth, the Cattedrale's
// columns, glowing mushrooms on the caves' floors (lights in the dark), and the currents as streaks flowing along
// the tunnel. The dark cave wall behind you is painted by the terrain (terrainPainter.ts); the air pockets by the
// vents (ventView.ts). Only the galleries near the camera exist.
import Phaser from 'phaser';
import { CATHEDRAL, GALLERIES, GALLERY_ART } from '../data/galleries';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { hash2 } from '../systems/math';
import { galleriesAtX, type Gallery } from '../systems/world/galleries';
import { cathedralColumns } from '../systems/world/galleryShape';
import type { TileMap } from '../systems/world/tileMap';
import { plant } from './plant';

interface Shown {
  images: Phaser.GameObjects.Image[];
  /** Where its mushrooms glow. */
  lights: { x: number; y: number; r: number }[];
}

const has = (k: string): boolean => WORLD_ART_KEYS.includes(k);

export class GalleryView {
  private readonly shown = new Map<number, Shown>();
  private readonly streaks: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    this.streaks = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.streaks);
  }

  private image(key: string, x: number, y: number): Phaser.GameObjects.Image {
    const im = this.scene.add.image(x, y, `world-${key}`);
    this.layer.add(im);
    return im;
  }

  /** Its pieces, made the first time it comes near. */
  private make(g: Gallery): Shown {
    const s: Shown = { images: [], lights: [] };
    if (has(GALLERY_ART.mouth)) {
      const m = g.mouth;
      // set into the rock of the wall, its side towards the open trench fading into the water (never floating)
      const im = this.image(
        GALLERY_ART.mouth,
        m.x + m.dir * GALLERY_ART.mouthWidth * GALLERY_ART.mouthInRock,
        m.y,
      );
      im.setFlipX(m.dir < 0).setScale(GALLERY_ART.mouthWidth / im.width); // its left side fades (art script)
      s.images.push(im);
    }
    for (const b of cathedralColumns(g)) {
      if (!has(b.art)) continue;
      const im = this.image(b.art, b.left, b.top).setOrigin(0, 0).setFlipX(b.flip);
      im.setDisplaySize(b.w, b.h);
      s.images.push(im);
    }
    // glowing mushrooms on the floor of each cave, many in the Cattedrale
    const pics = CATHEDRAL.mushrooms.filter(has);
    g.caves.forEach((c, ci) => {
      const n = g.cathedral && ci === 0 ? CATHEDRAL.mushroomCount : GALLERY_ART.caveMushrooms;
      for (let i = 0; i < n && pics.length; i++) {
        const x = c.x + (hash2(g.k * 3 + ci, i) - 0.5) * c.rx * 1.6;
        let y = c.y;
        while (y < c.y + c.ry + 20 && !this.map.solidAt(x, y)) y += 2;
        if (y >= c.y + c.ry + 20) continue;
        const key = pics[Math.floor(hash2(i, g.k + ci) * pics.length)]!;
        const im = this.image(key, x, y).setOrigin(0.5, 1);
        const w = CATHEDRAL.mushroomWidth * (0.7 + hash2(i * 3, g.k) * 0.6);
        const k = w / im.width;
        const at = plant(this.map, x, y, w, im.height * k);
        im.setScale(k * at.scale).setFlipX(hash2(g.k, i * 7) > 0.5);
        im.y = at.bottom;
        s.images.push(im);
        s.lights.push({ x, y: at.bottom - im.displayHeight * 0.6, r: GALLERY_ART.mushroomLight });
      }
    });
    this.shown.set(g.k, s);
    return s;
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const near = galleriesAtX(view.centerX, view.width * 1.5);
    const keep = new Set(near.map((g) => g.k));
    for (const [k, s] of this.shown)
      if (!keep.has(k)) {
        for (const im of s.images) im.destroy();
        this.shown.delete(k);
      }
    for (const g of near) if (!this.shown.has(g.k)) this.make(g);
    // the currents: pale streaks flowing along the tunnel
    const s = this.streaks.clear();
    for (const g of near)
      for (const c of g.currents) {
        const pts = g.paths[c.path]!;
        for (let i = c.i0; i < c.i1 && i + 1 < pts.length; i++) {
          const a = pts[i]!;
          const b = pts[i + 1]!;
          if (Math.max(a.x, b.x) < view.x || Math.min(a.x, b.x) > view.right) continue;
          for (let n = 0; n < 4; n++) {
            const t = (((time * GALLERIES.currentSpeed) / GALLERIES.step) * c.dir + n / 4 + hash2(i, n)) % 1;
            const u = t < 0 ? t + 1 : t;
            const off = (hash2(n, i * 3) - 0.5) * a.r * 1.4;
            const x = a.x + (b.x - a.x) * u;
            const y = a.y + (b.y - a.y) * u + off;
            const len = 9 * c.dir;
            const dx = ((b.x - a.x) / GALLERIES.step) * len;
            const dy = ((b.y - a.y) / GALLERIES.step) * len;
            s.lineStyle(0.7, 0xcfe8f0, 0.22).lineBetween(x - dx, y - dy, x, y);
          }
        }
      }
  }

  /** The mushrooms' glow in the dark (the light mask). */
  glowSpots(view: Phaser.Geom.Rectangle): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    for (const s of this.shown.values())
      for (const l of s.lights) if (l.x > view.x - 40 && l.x < view.right + 40) out.push(l);
    return out;
  }
}
