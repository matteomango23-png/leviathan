// The tile map and everything that asks "is there rock here?".
// Tiles are generated on a grid, but collisions and rendering use a smoothed field
// (bilinear between tile centres), so rock looks and behaves round instead of blocky.
import { TILE, type TileValue } from '../../data/worldLayout';
import type { Rng } from '../math';

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** One circle of a long body, as an offset from its middle (a big beast is several along its spine). */
export interface BodyCircle {
  dx: number;
  dy: number;
  r: number;
}

const RING = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);

/** Makes the tiles of columns tx0 … tx0 + cols - 1 (all rows) past the hand-made world: the endless sea. */
export type ChunkMaker = (tx0: number, cols: number, rows: number, tileSize: number) => Uint8Array;

export class TileMap {
  /** The hand-made world (columns 0 … cols - 1). */
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** Chunks of the endless sea already made, by chunk index (column cols + i × chunkCols). */
  private readonly chunks = new Map<number, Uint8Array>();

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    readonly surfaceY: number,
    private readonly endless: { make: ChunkMaker; chunkCols: number; maxX: number } | null = null,
  ) {
    this.data = new Uint8Array(cols * rows);
    this.width = endless ? endless.maxX : cols * tileSize;
    this.height = rows * tileSize;
  }

  /** The endless chunk holding column tx (made the first time it is asked for). */
  private chunk(tx: number): Uint8Array | null {
    const e = this.endless;
    if (!e) return null;
    const i = Math.floor((tx - this.cols) / e.chunkCols);
    let c = this.chunks.get(i);
    if (!c) {
      c = e.make(this.cols + i * e.chunkCols, e.chunkCols, this.rows, this.tileSize);
      this.chunks.set(i, c);
    }
    return c;
  }

  get(tx: number, ty: number): TileValue {
    if (ty < 0) return TILE.water; // open sky above the world
    if (tx < 0 || ty >= this.rows) return TILE.rock;
    if (tx >= this.cols) {
      const c = this.chunk(tx);
      if (!c) return TILE.rock;
      const cols = this.endless!.chunkCols;
      return c[ty * cols + ((tx - this.cols) % cols)] as TileValue;
    }
    return this.data[ty * this.cols + tx] as TileValue;
  }

  set(tx: number, ty: number, v: TileValue): void {
    if (tx < 0 || ty < 0 || ty >= this.rows) return;
    if (tx >= this.cols) {
      const c = this.chunk(tx);
      const cols = this.endless?.chunkCols ?? 1;
      if (c) c[ty * cols + ((tx - this.cols) % cols)] = v;
      return;
    }
    this.data[ty * this.cols + tx] = v;
  }

  /**
   * A number for a tile, for saving broken tiles: the hand-made world keeps its old numbering (ty × cols + tx),
   * the endless sea counts on after it, column by column.
   */
  tileIndex(tx: number, ty: number): number {
    return tx < this.cols ? ty * this.cols + tx : this.cols * this.rows + (tx - this.cols) * this.rows + ty;
  }

  tileOf(i: number): { tx: number; ty: number } {
    const n = this.cols * this.rows;
    if (i < n) return { tx: i % this.cols, ty: Math.floor(i / this.cols) };
    const j = i - n;
    return { tx: this.cols + Math.floor(j / this.rows), ty: j % this.rows };
  }

  /** 1 for solid tiles, 0 for water. */
  private solidity(tx: number, ty: number): number {
    return this.get(tx, ty) === TILE.water ? 0 : 1;
  }

  /** Smooth rock field in [0, 1]: > 0.5 means rock. */
  field(x: number, y: number): number {
    const gx = x / this.tileSize - 0.5;
    const gy = y / this.tileSize - 0.5;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const a = this.solidity(x0, y0);
    const b = this.solidity(x0 + 1, y0);
    const c = this.solidity(x0, y0 + 1);
    const d = this.solidity(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }

  solidAt(x: number, y: number): boolean {
    return this.field(x, y) > 0.5;
  }

  /** Tile value under a world point (for colouring: bone, ice, rock). */
  tileAtPoint(x: number, y: number): TileValue {
    return this.get(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /** Does a circle touch rock? Checks the centre and eight points on the rim. */
  hitCircle(x: number, y: number, r: number): boolean {
    if (this.solidAt(x, y)) return true;
    for (const [c, s] of RING) if (this.solidAt(x + c! * r, y + s! * r)) return true;
    return false;
  }

  /** Does a body (one circle, or several along a long body) touch rock at this point? */
  hitShape(x: number, y: number, shape: number | readonly BodyCircle[]): boolean {
    if (typeof shape === 'number') return this.hitCircle(x, y, shape);
    return shape.some((c) => this.hitCircle(x + c.dx, y + c.dy, c.r));
  }

  /**
   * Moves a body one axis at a time; bounces softly off rock. Returns true if it hit something. A long body passes
   * its circles along the spine; if it is already stuck in rock (spawned or turned into it) only its middle counts,
   * so it can swim out instead of freezing.
   */
  moveBody(e: Body, shape: number | readonly BodyCircle[], dt: number): boolean {
    let body = shape;
    if (typeof shape !== 'number' && this.hitShape(e.x, e.y, shape))
      body = shape.reduce((m, c) => (Math.hypot(c.dx, c.dy) < Math.hypot(m.dx, m.dy) ? c : m)).r;
    let blocked = false;
    const nx = e.x + e.vx * dt;
    if (this.hitShape(nx, e.y, body)) {
      e.vx *= -0.25;
      blocked = true;
    } else e.x = nx;
    const ny = e.y + e.vy * dt;
    if (this.hitShape(e.x, ny, body)) {
      e.vy *= -0.25;
      blocked = true;
    } else e.y = ny;
    const r = typeof body === 'number' ? body : Math.max(...body.map((c) => c.r - c.dy));
    const top = this.surfaceY + r;
    if (e.y < top) {
      e.y = top;
      if (e.vy < 0) e.vy = 0;
    }
    return blocked;
  }

  /** A random open spot inside a rectangle, at least `margin` away from rock. */
  randomOpen(
    rng: Rng,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    margin: number,
  ): { x: number; y: number } {
    for (let i = 0; i < 400; i++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      if (y > this.surfaceY + margin && !this.hitCircle(x, y, margin)) return { x, y };
    }
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  }

  /** The nearest point to (x, y) where a circle of radius r fits in open water (rings of growing size). */
  nearestOpen(x: number, y: number, r: number): { x: number; y: number } {
    if (!this.hitCircle(x, y, r)) return { x, y };
    const step = this.tileSize / 2;
    for (let ring = 1; ring < 60; ring++) {
      const n = ring * 8;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 - Math.PI / 2; // upwards first: usually the way out of the floor
        const px = x + Math.cos(a) * ring * step;
        const py = y + Math.sin(a) * ring * step;
        if (!this.hitCircle(px, py, r)) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  /** First rock surface straight below a point. */
  floorBelow(x: number, y: number): number {
    let yy = y;
    while (yy < this.height && this.solidAt(x, yy)) yy += 2;
    while (yy < this.height && !this.solidAt(x, yy)) yy += 2;
    return yy;
  }

  /** A tile is a "top" if it is solid with water right above it (where kelp and corals grow). */
  isTop(tx: number, ty: number): boolean {
    return (
      ty * this.tileSize >= this.surfaceY &&
      (this.get(tx, ty) === TILE.rock || this.get(tx, ty) === TILE.temple) &&
      this.get(tx, ty - 1) === TILE.water
    );
  }
}
