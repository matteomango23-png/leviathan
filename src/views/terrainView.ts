// Shows the painted rock around the camera. Chunks are painted on demand and recycled (LRU),
// so memory stays small on the iPhone whatever the size of the ocean.
import Phaser from 'phaser';
import { TERRAIN } from '../data/diver';
import type { TileMap } from '../systems/world/tileMap';
import { chunkHasRock, paintChunk } from './terrainPainter';

interface Slot {
  key: string; // texture key
  tex: Phaser.Textures.CanvasTexture;
  image: Phaser.GameObjects.Image;
  chunk: string | null; // "cx,cy" currently painted in this slot
  lastUsed: number;
}

export class TerrainView {
  private readonly slots: Slot[] = [];
  private readonly byChunk = new Map<string, Slot>();
  private readonly empty = new Set<string>(); // chunks known to hold only water
  private frame = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    const px = TERRAIN.chunkUnits * TERRAIN.texelsPerUnit;
    for (let i = 0; i < TERRAIN.cacheSize; i++) {
      const key = `terrain-chunk-${i}`;
      const tex = scene.textures.exists(key)
        ? (scene.textures.get(key) as Phaser.Textures.CanvasTexture)
        : scene.textures.createCanvas(key, px, px)!;
      const image = scene.add
        .image(0, 0, key)
        .setOrigin(0, 0)
        .setScale(1 / TERRAIN.texelsPerUnit)
        .setVisible(false);
      layer.add(image);
      this.slots.push({ key, tex, image, chunk: null, lastUsed: -1 });
    }
  }

  /** Chunk coordinates covering a world rectangle (plus a margin of `pad` chunks). */
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
    return out;
  }

  private paint(cx: number, cy: number, visible: Set<string>): boolean {
    const id = `${cx},${cy}`;
    if (this.byChunk.has(id) || this.empty.has(id)) return false;
    const S = TERRAIN.chunkUnits;
    if (!chunkHasRock(this.map, cx * S, cy * S, S)) {
      this.empty.add(id);
      return false;
    }
    // recycle the least recently used slot that is not on screen
    let slot: Slot | undefined;
    for (const s of this.slots) {
      if (s.chunk && visible.has(s.chunk)) continue;
      if (!slot || s.lastUsed < slot.lastUsed) slot = s;
    }
    if (!slot) return false;
    if (slot.chunk) this.byChunk.delete(slot.chunk);
    paintChunk(slot.tex.context, this.map, cx * S, cy * S, S);
    slot.tex.refresh();
    slot.chunk = id;
    slot.lastUsed = this.frame;
    slot.image.setPosition(cx * S, cy * S).setVisible(true);
    this.byChunk.set(id, slot);
    return true;
  }

  /**
   * Call every frame with the camera's world view. Paints missing visible chunks
   * (all of them when `blocking`, otherwise one per frame) and pre-paints neighbours when idle.
   */
  update(view: Phaser.Geom.Rectangle, blocking = false): void {
    this.frame++;
    const visibleList = this.chunksIn(view, 0);
    const visible = new Set(visibleList.map(([x, y]) => `${x},${y}`));
    for (const id of visible) {
      const s = this.byChunk.get(id);
      if (s) s.lastUsed = this.frame;
    }
    let budget = blocking ? Infinity : 1;
    for (const [cx, cy] of visibleList) {
      if (budget <= 0) break;
      if (this.paint(cx, cy, visible)) budget--;
    }
    if (budget > 0) {
      // pre-paint neighbours only into slots that are not needed nearby (avoids repainting in circles)
      const near = this.chunksIn(view, 1);
      const nearIds = new Set(near.map(([x, y]) => `${x},${y}`));
      for (const [cx, cy] of near) {
        if (this.paint(cx, cy, nearIds)) break;
      }
    }
  }
}
