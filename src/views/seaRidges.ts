// The far and middle ridges behind the sea, with parallax (prototype/prova-realistica.html), in the look of the
// region you are in (systems/seaLook.ts): near a border the next region's fade in over them. Each look's strip is
// painted once per screen size (views/seaRidgeArt.ts), or is its painted panorama when it exists
// (public/bg/mare_<look>_lontano|medio.webp, docs/GEMINI-LOTTO-9.md), loaded the first time it is needed.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { SEA_LOOKS, SEA_RIDGE_FLOOR, type SeaLookId } from '../data/seaLooks';
import { BG_KEYS } from '../data/sprites.generated';
import { assetUrl } from '../data/assets';
import type { LookMix } from '../systems/seaLook';
import { naturalFloor } from '../systems/world/stretches';
import { paintRidgeStrip, stripShare, type RidgeKind } from './seaRidgeArt';

/** The view (backgroundView.ts ViewInfo): its centre in the world, zoom and screen size. */
interface ViewInfo {
  cx: number;
  cy: number;
  zoom: number;
  w: number;
  h: number;
}

interface Strip {
  images: Phaser.GameObjects.Image[];
  look: SeaLookId | null;
  width: number;
  height: number;
}

interface Row {
  kind: RidgeKind;
  /** The look you are in, and the next one fading in over it. */
  a: Strip;
  b: Strip;
  fill: Phaser.GameObjects.Rectangle;
}

const PAINTED_NAME = { far: 'lontano', mid: 'medio' } as const;
const paintedName = (look: SeaLookId, kind: RidgeKind): string => `mare_${look}_${PAINTED_NAME[kind]}`;

/** Points read along a panorama's bottom edge for its colour. */
const EDGE_SAMPLES = 24;

const color = (hex: string): Phaser.Display.Color => Phaser.Display.Color.HexStringToColor(hex);

export class SeaRidges {
  private readonly rows: Row[];
  private size = '';
  /** How much deeper than SEA_RIDGE_FLOOR.ref the seabed around the view is (eased). */
  private sink = NaN;
  private screenW = 1;
  private screenH = 1;
  /** Strips painted for this screen size. */
  private readonly painted = new Set<string>();
  private readonly loading = new Set<string>();
  /** The colour along each painted panorama's bottom edge: the dark under it continues it, with no seam. */
  private readonly edgeColor = new Map<string, Phaser.Display.Color>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.rows = (['far', 'mid'] as RidgeKind[]).map((kind) => {
      const a = this.strip();
      const b = this.strip();
      const fill = scene.add.rectangle(0, 0, 10, 10, 0).setOrigin(0, 0);
      layer.add(fill);
      return { kind, a, b, fill };
    });
  }

  private strip(): Strip {
    const images = [0, 1, 2].map(() => {
      const im = this.scene.add.image(0, 0, '__WHITE').setOrigin(0, 0).setVisible(false);
      this.layer.add(im);
      return im;
    });
    return { images, look: null, width: 1, height: 1 };
  }

  /** The painted panorama's texture, once loaded (it starts loading the first time it is asked for). */
  private panorama(look: SeaLookId, kind: RidgeKind): string | null {
    const name = paintedName(look, kind);
    if (!BG_KEYS.includes(name)) return null;
    const key = `bgp-${name}`;
    if (this.scene.textures.exists(key)) return key;
    if (!this.loading.has(key)) {
      this.loading.add(key);
      this.scene.load.image(key, assetUrl(`bg/${name}.webp`));
      this.scene.load.start();
    }
    return null;
  }

  /** The texture of a look's strip at this screen size, and its size on screen. */
  private texture(look: SeaLookId, kind: RidgeKind): { key: string; w: number; h: number } {
    const def = SEA_LOOKS[look];
    const h = Math.ceil(this.screenH * stripShare(kind, def[kind].style));
    const pano = this.panorama(look, kind);
    if (pano) {
      const src = this.scene.textures.get(pano).getSourceImage();
      return { key: pano, w: Math.ceil((src.width / src.height) * h), h };
    }
    const key = `sea-${kind}-${look}`;
    const w = Math.ceil(this.screenW * 2);
    if (!this.painted.has(key)) {
      this.painted.add(key);
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const tex = this.scene.textures.createCanvas(key, w, h)!;
      paintRidgeStrip(tex.context, def, kind, w, h, this.screenW);
      tex.refresh();
    }
    return { key, w, h };
  }

  /** The colour under a look's ridge: its painted panorama's bottom edge, or the look's own. */
  private bottomColor(look: SeaLookId, kind: RidgeKind): Phaser.Display.Color {
    const key = `bgp-${paintedName(look, kind)}`;
    if (!this.scene.textures.exists(key)) return color(SEA_LOOKS[look][kind].bottom);
    let c = this.edgeColor.get(key);
    if (!c) {
      const src = this.scene.textures.get(key).getSourceImage();
      let [r, g, b, n] = [0, 0, 0, 0];
      for (let i = 0; i < EDGE_SAMPLES; i++) {
        const p = this.scene.textures.getPixel(((i + 0.5) / EDGE_SAMPLES) * src.width, src.height - 2, key);
        if (!p || p.alpha < 200) continue;
        r += p.red;
        g += p.green;
        b += p.blue;
        n++;
      }
      c = n ? new Phaser.Display.Color(r / n, g / n, b / n) : color(SEA_LOOKS[look][kind].bottom);
      this.edgeColor.set(key, c);
    }
    return c;
  }

  private show(s: Strip, look: SeaLookId, kind: RidgeKind): void {
    const t = this.texture(look, kind);
    s.look = look;
    s.width = t.w;
    s.height = t.h;
    for (const im of s.images) im.setTexture(t.key).setDisplaySize(t.w, t.h);
  }

  private place(s: Strip, v: ViewInfo, kind: RidgeKind, alpha: number): number {
    const def = SEA[kind];
    const parV = def.parallax * 0.9 + 0.1;
    const top = v.h / 2 + (def.baseY + this.sink - v.cy) * v.zoom * parV - s.height * 0.45;
    const off = (((v.cx * v.zoom * def.parallax) % s.width) + s.width) % s.width;
    // as many copies as the screen needs (a painted panorama may be narrower than two screens)
    s.images.forEach((im, i) =>
      im
        .setPosition(-off + i * s.width, top)
        .setAlpha(alpha)
        .setVisible(alpha > 0.01 && i * s.width - off < v.w),
    );
    return top + s.height;
  }

  /** The seabed's depth around the view, past the reference one, averaged and eased. */
  private followFloor(cx: number): void {
    const F = SEA_RIDGE_FLOOR;
    let sum = 0;
    for (let i = 0; i < F.samples; i++) sum += naturalFloor(cx + ((i / (F.samples - 1)) * 2 - 1) * F.span);
    const want = Math.max(0, sum / F.samples - F.ref);
    this.sink = Number.isNaN(this.sink) ? want : this.sink + (want - this.sink) * F.ease;
  }

  update(v: ViewInfo, mix: LookMix): void {
    this.followFloor(v.cx);
    const size = `${v.w}x${v.h}`;
    if (size !== this.size) {
      this.size = size;
      this.screenW = v.w;
      this.screenH = v.h;
      this.painted.clear(); // all repainted at the new size (texture() replaces each)
      for (const r of this.rows) r.a.look = r.b.look = null;
    }
    for (const r of this.rows) {
      // a panorama that finished loading takes the place of the drawing
      const wantA = this.texture(mix.a, r.kind).key;
      const wantB = this.texture(mix.b, r.kind).key;
      if (r.a.look !== mix.a || r.a.images[0]!.texture.key !== wantA) this.show(r.a, mix.a, r.kind);
      if (r.b.look !== mix.b || r.b.images[0]!.texture.key !== wantB) this.show(r.b, mix.b, r.kind);
      const bottomA = this.place(r.a, v, r.kind, 1);
      const bottomB = this.place(r.b, v, r.kind, mix.a === mix.b ? 0 : mix.t);
      const fillTop = Math.max(0, Math.min(bottomA, mix.t > 0.5 ? bottomB : bottomA) - 1);
      const ca = this.bottomColor(mix.a, r.kind);
      const cb = this.bottomColor(mix.b, r.kind);
      const m = (p: number, q: number): number => Math.round(p + (q - p) * mix.t);
      r.fill.fillColor = Phaser.Display.Color.GetColor(
        m(ca.red, cb.red),
        m(ca.green, cb.green),
        m(ca.blue, cb.blue),
      );
      r.fill.setPosition(0, fillTop).setSize(v.w, Math.max(0, v.h - fillTop));
      r.fill.setVisible(fillTop < v.h);
    }
    this.forget(mix);
  }

  /** Drops the painted strips of the looks out of sight: each is as big as two screens, so only those in use stay
   *  in memory (a painted panorama stays: it is small). */
  private forget(mix: LookMix): void {
    for (const key of this.painted) {
      if (this.rows.some((r) => key === `sea-${r.kind}-${mix.a}` || key === `sea-${r.kind}-${mix.b}`))
        continue;
      this.painted.delete(key);
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
  }
}
