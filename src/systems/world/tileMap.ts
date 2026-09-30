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

const RING = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);

export class TileMap {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    readonly surfaceY: number,
  ) {
    this.data = new Uint8Array(cols * rows);
    this.width = cols * tileSize;
    this.height = rows * tileSize;
  }

  get(tx: number, ty: number): TileValue {
    if (ty < 0) return TILE.water; // open sky above the world
    if (tx < 0 || tx >= this.cols || ty >= this.rows) return TILE.rock;
    return this.data[ty * this.cols + tx] as TileValue;
  }

  set(tx: number, ty: number, v: TileValue): void {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    this.data[ty * this.cols + tx] = v;
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

  /** Moves a body one axis at a time; bounces softly off rock. Returns true if it hit something. */
  moveBody(e: Body, r: number, dt: number): boolean {
    let blocked = false;
    const nx = e.x + e.vx * dt;
    if (this.hitCircle(nx, e.y, r)) {
      e.vx *= -0.25;
      blocked = true;
    } else e.x = nx;
    const ny = e.y + e.vy * dt;
    if (this.hitCircle(e.x, ny, r)) {
      e.vy *= -0.25;
      blocked = true;
    } else e.y = ny;
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
      this.get(tx, ty) === TILE.rock &&
      this.get(tx, ty - 1) === TILE.water
    );
  }
}
