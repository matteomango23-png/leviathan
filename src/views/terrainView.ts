// Shows the painted rock around the camera. Chunks are small, painted ahead of time a few rows per
// frame (never freezing a frame) and recycled (LRU), so memory stays small on the iPhone.
import Phaser from 'phaser';
import { TERRAIN } from '../data/diver';
import type { TileMap } from '../systems/world/tileMap';
import { ChunkPaintJob, chunkHasRock } from './terrainPainter';

interface Slot {
  tex: Phaser.Textures.CanvasTexture;
  image: Phaser.GameObjects.Image;
  chunk: string | null; // "cx,cy" currently painted in this slot
  lastUsed: number;
}

const id = (cx: number, cy: number): string => `${cx},${cy}`;

export class TerrainView {
  private readonly slots: Slot[] = [];
  private readonly byChunk = new Map<string, Slot>();
  private readonly empty = new Set<string>(); // chunks known to hold only water
  private job: { id: string; cx: number; cy: number; job: ChunkPaintJob } | null = null;
  private frame = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    const px = Math.round(TERRAIN.chunkUnits * TERRAIN.texelsPerUnit);
    for (let i = 0; i < TERRAIN.cacheSize; i++) {
      const key = `terrain-chunk-${i}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, px, px)!;
      const image = scene.add
        .image(0, 0, key)
        .setOrigin(0, 0)
        .setScale(1 / TERRAIN.texelsPerUnit)
        .setVisible(false);
      layer.add(image);
      this.slots.push({ tex, image, chunk: null, lastUsed: -1 });
    }
  }

  /** Forgets the painted chunks containing these tiles (e.g. a broken bone wall) so they are repainted. */
  invalidateTiles(tiles: number[]): void {
    const S = TERRAIN.chunkUnits;
    const T = this.map.tileSize;
    const ids = new Set<string>();
    for (const i of tiles) {
      const x = (i % this.map.cols) * T;
      const y = Math.floor(i / this.map.cols) * T;
      for (const [dx, dy] of [
        [0, 0],
        [-T, 0],
        [T, 0],
        [0, -T],
        [0, T],
      ] as const)
        ids.add(id(Math.floor((x + dx) / S), Math.floor((y + dy) / S)));
    }
    for (const c of ids) {
      const slot = this.byChunk.get(c);
      if (this.job?.id === c) this.job = null;
      if (!slot) continue;
      this.byChunk.delete(c);
      slot.chunk = null;
      slot.lastUsed = -1;
      slot.image.setVisible(false);
    }
  }

  /** Chunk coordinates covering a world rectangle (plus a margin of `pad` chunks), nearest first. */
  private chunksIn(view: Phaser.Geom.Rectangle, pad: number): [number, number][] {
    const S = TERRAIN.chunkUnits;
    const maxX = Math.ceil(this.map.width / S) - 1;
    const maxY = Math.ceil(this.map.height / S) - 1;
    const out: [number, number][] = [];
    const cx0 = Math.max(0, Math.floor(view.x / S) - pad);
    const cy0 = Math.max(0, Math.floor(view.y / S) - pad);
    const cx1 = Math.min(maxX, Math.floor((view.right - 1) / S) + pad);
    const cy1 = Math.min(maxY, Math.floor((view.bottom - 1) / S) + pad);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push([cx, cy]);
    const mx = view.centerX / S - 0.5;
    const my = view.centerY / S - 0.5;
    return out.sort((a, b) => Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(b[0] - mx, b[1] - my));
  }

  private needsPaint(cx: number, cy: number): boolean {
    const c = id(cx, cy);
    if (this.byChunk.has(c) || this.empty.has(c)) return false;
    const S = TERRAIN.chunkUnits;
    if (!chunkHasRock(this.map, cx * S, cy * S, S)) {
      this.empty.add(c);
      return false;
    }
    return true;
  }

  /** The least recently used slot whose chunk is not in `keep`. */
  private freeSlot(keep: Set<string>): Slot | undefined {
    let best: Slot | undefined;
    for (const s of this.slots) {
      if (s.chunk && keep.has(s.chunk)) continue;
      if (!best || s.lastUsed < best.lastUsed) best = s;
    }
    return best;
  }

  private install(cx: number, cy: number, job: ChunkPaintJob, keep: Set<string>): void {
    const slot = this.freeSlot(keep);
    if (!slot) return;
    if (slot.chunk) this.byChunk.delete(slot.chunk);
    job.finish(slot.tex.context);
    slot.tex.refresh();
    slot.chunk = id(cx, cy);
    slot.lastUsed = this.frame;
    const S = TERRAIN.chunkUnits;
    slot.image.setPosition(cx * S, cy * S).setVisible(true);
    this.byChunk.set(slot.chunk, slot);
  }

  /**
   * Call every frame with the camera's world view. Chunks already on screen but missing are painted at
   * once (only after a jump, e.g. respawn); the ring around the screen is painted ahead within a budget.
   */
  update(view: Phaser.Geom.Rectangle, blocking = false): void {
    this.frame++;
    const S = TERRAIN.chunkUnits;
    const visible = this.chunksIn(view, 0);
    const near = this.chunksIn(view, TERRAIN.prefetchChunks);
    const keep = new Set(near.map(([x, y]) => id(x, y)));
    for (const [x, y] of near) {
      const s = this.byChunk.get(id(x, y));
      if (s) s.lastUsed = this.frame;
    }
    // on screen and missing: paint now (whole)
    for (const [cx, cy] of visible) {
      if (!this.needsPaint(cx, cy)) continue;
      if (this.job?.id === id(cx, cy)) {
        this.job.job.step(Infinity);
        this.install(cx, cy, this.job.job, keep);
        this.job = null;
      } else {
        const job = new ChunkPaintJob(this.map, cx * S, cy * S, S);
        job.step(Infinity);
        this.install(cx, cy, job, keep);
      }
    }
    if (blocking) return;
    // ahead of the camera: a few rows per frame
    const deadline = performance.now() + TERRAIN.paintBudgetMs;
    while (performance.now() < deadline) {
      if (this.job && !keep.has(this.job.id)) this.job = null;
      if (!this.job) {
        const next = near.find(([x, y]) => this.needsPaint(x, y));
        if (!next) return;
        const [cx, cy] = next;
        this.job = { id: id(cx, cy), cx, cy, job: new ChunkPaintJob(this.map, cx * S, cy * S, S) };
      }
      if (this.job.job.step(deadline)) {
        this.install(this.job.cx, this.job.cy, this.job.job, keep);
        this.job = null;
      }
    }
  }
}
