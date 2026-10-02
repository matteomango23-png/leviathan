// Icebergs (the owner's pictures): where they float and which points of them are solid ice. Their shape comes
// from the picture itself (a coarse mask written by `npm run art`), so you bump into the ice you see.
import { ENDLESS } from '../../data/endless';
import { ICEBERG_SHAPES } from '../../data/sprites.generated';
import { ICEBERG_WIDTH, ICEBERGS_PER_STRETCH, type IcebergPlace } from '../../data/worldArt';
import { WORLD } from '../../data/worldLayout';
import { hash2 } from '../math';

export interface IcebergBox {
  id: string;
  left: number;
  top: number;
  w: number;
  h: number;
}

/** Where an iceberg's picture goes: its waterline on the sea surface. Null if its picture is missing. */
export function icebergBox(p: IcebergPlace): IcebergBox | null {
  const shape = ICEBERG_SHAPES[p.id];
  const w = ICEBERG_WIDTH[p.id];
  if (!shape || !w) return null;
  const h = (w * shape.h) / shape.w;
  return { id: p.id, left: p.x - w / 2, top: WORLD.surfaceY - shape.waterline * h, w, h };
}

/** Is this point inside the ice of one of these icebergs? */
export function inIceberg(boxes: IcebergBox[], x: number, y: number): boolean {
  for (const b of boxes) {
    if (x < b.left || x >= b.left + b.w || y < b.top || y >= b.top + b.h) continue;
    const mask = ICEBERG_SHAPES[b.id]!.mask;
    const row = mask[Math.floor(((y - b.top) / b.h) * mask.length)];
    if (row && row[Math.floor(((x - b.left) / b.w) * row.length)] === '1') return true;
  }
  return false;
}

const cache = new Map<number, IcebergBox[]>();
const KINDS = Object.keys(ICEBERG_WIDTH);

/** The icebergs of a Banchisa stretch of the endless sea (fixed by the seed), away from its ends. */
export function icebergsOfStretch(k: number): IcebergBox[] {
  const hit = cache.get(k);
  if (hit) return hit;
  const out: IcebergBox[] = [];
  const x0 = ENDLESS.startX + k * ENDLESS.stretch + ENDLESS.blend;
  const span = ENDLESS.stretch - 2 * ENDLESS.blend;
  for (let i = 0; i < ICEBERGS_PER_STRETCH; i++) {
    const id = KINDS[Math.floor(hash2(k * 3.3 + i, ENDLESS.seed + 9) * KINDS.length)]!;
    // one in each half of the stretch, so two never overlap
    const x = x0 + ((i + 0.2 + hash2(k + i * 7.1, 41) * 0.6) / ICEBERGS_PER_STRETCH) * span;
    const b = icebergBox({ id, x });
    if (b) out.push(b);
  }
  cache.set(k, out);
  return out;
}
