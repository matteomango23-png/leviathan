// The painted ice sheet (lot P1, systems/world/iceSheet.ts): each slab between two breathing holes is painted once
// into its own texture (the picture's copies fading into each other, its ends cut ragged exactly as its
// collisions are), then drawn in strips one tile wide, so a column broken by the ship's bow or a Glaciale opens in
// the picture too; the pillars hang under it. They ride the waves a little, like the old floes. Only what is near
// the camera exists.
import Phaser from 'phaser';
import { ICE_ART } from '../data/worldArt';
import { TILE, WORLD } from '../data/worldLayout';
import { waveHeight, type SeaNow } from '../systems/sea';
import {
  iceArtReady,
  iceSheetNear,
  inPillar,
  inSlab,
  raggedInset,
  slabCopyFlip,
  slabCopyStep,
  type IcePillar,
  type IceSlab,
} from '../systems/world/iceSheet';
import type { TileMap } from '../systems/world/tileMap';

/** How much of the wave under it the ice follows (it is heavy and wide). */
const RIDE = 0.35;

interface Strip {
  x: number;
  im: Phaser.GameObjects.Image;
  /** The tiles of its column that are ice by the picture: one turned to water hides the strip. */
  tiles: number[];
}
interface SlabShown {
  key: string;
  slab: IceSlab;
  strips: Strip[];
}
interface PillarShown {
  im: Phaser.GameObjects.Image;
  tiles: number[];
}

const slabKey = (s: IceSlab): string => `ice-slab-${Math.round(s.left)}`;
const pillarKey = (p: IcePillar): string => `${Math.round(p.left)}:${Math.round(p.top)}`;

export class IceArtView {
  private readonly slabs = new Map<string, SlabShown>();
  private readonly pillars = new Map<string, PillarShown>();
  private readonly on = iceArtReady();
  /** The pillars hang behind the slabs (their flat tops hidden in them). */
  private readonly back: Phaser.GameObjects.Container;
  private readonly front: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    this.back = scene.add.container();
    this.front = scene.add.container();
    layer.add([this.back, this.front]);
  }

  update(view: Phaser.Geom.Rectangle, time: number, sea: SeaNow): void {
    if (!this.on) return;
    const margin = view.width * 0.5;
    const near =
      view.bottom > 0 ? iceSheetNear(view.x - margin, view.right + margin) : { slabs: [], pillars: [] };
    const lift = (x: number): number => -waveHeight(x, time, sea) * RIDE;
    const keep = new Set<string>();
    for (const s of near.slabs) {
      const key = slabKey(s);
      keep.add(key);
      const shown = this.slabs.get(key) ?? this.makeSlab(s, key);
      for (const st of shown.strips) {
        const broken = st.tiles.some((i) => this.isWater(i));
        st.im.setVisible(!broken && st.x + 8 > view.x && st.x - 8 < view.right);
        if (st.im.visible) st.im.y = s.top + lift(st.x);
      }
    }
    for (const [key, shown] of this.slabs)
      if (!keep.has(key)) {
        for (const st of shown.strips) st.im.destroy();
        this.scene.textures.remove(shown.key);
        this.slabs.delete(key);
      }
    const keepP = new Set<string>();
    for (const p of near.pillars) {
      const key = pillarKey(p);
      keepP.add(key);
      const shown = this.pillars.get(key) ?? this.makePillar(p, key);
      shown.im.setVisible(!shown.tiles.some((i) => this.isWater(i)));
      shown.im.y = p.top + lift(p.left + p.w / 2);
    }
    for (const [key, shown] of this.pillars)
      if (!keepP.has(key)) {
        shown.im.destroy();
        this.pillars.delete(key);
      }
  }

  private isWater(i: number): boolean {
    const { tx, ty } = this.map.tileOf(i);
    return this.map.get(tx, ty) === TILE.water;
  }

  /** The tiles of a box that are ice by `solid`. */
  private iceTiles(
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    solid: (x: number, y: number) => boolean,
  ): number[] {
    const T = this.map.tileSize;
    const out: number[] = [];
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++)
      for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++)
        if (solid(tx * T + T / 2, ty * T + T / 2)) out.push(this.map.tileIndex(tx, ty));
    return out;
  }

  private makeSlab(s: IceSlab, key: string): SlabShown {
    const src = this.scene.textures.get(`world-${ICE_ART.slab}`).getSourceImage() as HTMLImageElement;
    const w = s.right - s.left;
    const ppu = Math.min(ICE_ART.pxPerUnit, ICE_ART.maxPx / w);
    const W = Math.ceil(w * ppu);
    const H = Math.ceil(s.h * ppu);
    const tex = this.scene.textures.createCanvas(key, W, H)!;
    const ctx = tex.getContext();
    const cw = Math.round(s.copyW * ppu);
    const step = slabCopyStep(s) * ppu;
    // one copy, faded in over its left overlap (the copy under it shows through there)
    const copy = (flip: boolean, fade: boolean): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = H;
      const g = c.getContext('2d')!;
      if (flip) g.setTransform(-1, 0, 0, 1, cw, 0);
      g.drawImage(src, 0, 0, cw, H);
      if (fade) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const grad = g.createLinearGradient(0, 0, cw - step, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = grad;
        g.fillRect(0, 0, cw, H);
      }
      return c;
    };
    for (let i = 0; i * step < W; i++)
      ctx.drawImage(copy(slabCopyFlip(s, i), i > 0), Math.round(i * step), 0);
    // the ragged ends, cut along the same line as the collisions (iceSheet.ts raggedInset)
    ctx.globalCompositeOperation = 'destination-out';
    for (const end of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(end ? W : 0, 0);
      for (let v = 0; v <= 1.0001; v += 0.02) {
        const d = raggedInset(s, v, end) * ppu;
        ctx.lineTo(end ? W - d : d, v * H);
      }
      ctx.lineTo(end ? W : 0, H);
      ctx.closePath();
      ctx.fill();
    }
    tex.refresh();
    const T = this.map.tileSize;
    const strips: Strip[] = [];
    for (let x = Math.floor(s.left / T) * T; x < s.right; x += T) {
      const a = Math.max(x, s.left);
      const b = Math.min(x + T, s.right);
      const im = this.scene.add
        .image(s.left, s.top, key)
        .setOrigin(0, 0)
        .setScale(1 / ppu);
      im.setCrop((a - s.left) * ppu, 0, (b - a) * ppu + 0.5, H);
      this.front.add(im);
      const tiles = this.iceTiles(
        x + 1,
        x + T - 1,
        s.top,
        s.top + s.h,
        (px, py) => py >= WORLD.surfaceY && inSlab(s, px, py),
      );
      strips.push({ x: x + T / 2, im, tiles });
    }
    const shown = { key, slab: s, strips };
    this.slabs.set(key, shown);
    return shown;
  }

  private makePillar(p: IcePillar, key: string): PillarShown {
    const im = this.scene.add
      .image(p.left, p.top, `world-${ICE_ART.pillar}`)
      .setOrigin(0, 0)
      .setFlipX(p.flip);
    im.setDisplaySize(p.w, p.h);
    this.back.add(im);
    const tiles = this.iceTiles(p.left, p.left + p.w, p.top, p.top + p.h, (x, y) => inPillar(p, x, y));
    const shown = { im, tiles };
    this.pillars.set(key, shown);
    return shown;
  }
}
